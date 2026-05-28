var seq = require('seq');

var configuration = require('../configuration');
var db = require('../db');
var logger = require('../logger');

var touchQueuesByKey = {};

function recordVisitorHistory(visitKey, visitValue) {
    if (configuration.recordDetailedVisitorHistory === true) {
        recordDetailedVisitorHistory(visitKey, visitValue);
        return;
    }

    touchVisitorHistory(visitKey, visitValue);
}

function touchVisitorHistory(visitKey, visitValue) {
    var newVisitor;

    try {
        newVisitor = normalizeVisitor(visitValue);
    } catch (parseError) {
        logger.warn('Error recording visitor history: %s', parseError.message);
        return;
    }

    enqueueTouch(visitKey, newVisitor);
}

function enqueueTouch(visitKey, newVisitor) {
    var previous = touchQueuesByKey[visitKey] || Promise.resolve();
    var current = previous.catch(function() {}).then(function() {
        return new Promise(function(resolve) {
            runTouchVisitorHistory(visitKey, newVisitor, resolve);
        });
    });

    touchQueuesByKey[visitKey] = current;
    current.then(function() {
        if (touchQueuesByKey[visitKey] === current) {
            delete touchQueuesByKey[visitKey];
        }
    });
}

function runTouchVisitorHistory(visitKey, newVisitor, callback) {
    seq()
        .seq(function() {
            var done = this;

            db.lrange(visitKey, 0, -1, function(error, list) {
                if (error) {
                    return done(error);
                }

                var valuesToRemove = [];
                var deviceMap = {};

                if (list && list.length > 0) {
                    list.forEach(function(value) {
                        if (value === null || value === undefined) {
                            return;
                        }

                        var serialized = value;
                        if (Buffer.isBuffer(value)) {
                            serialized = value.toString();
                        }

                        try {
                            var visitor = JSON.parse(serialized);
                            var deviceID = visitor.DeviceID;

                            if (deviceID === newVisitor.DeviceID) {
                                valuesToRemove.push(serialized);
                            }

                            if (!deviceMap[deviceID] || (visitor.TimeStamp || 0) > (deviceMap[deviceID].TimeStamp || 0)) {
                                deviceMap[deviceID] = visitor;
                            }
                        } catch (parseError) {
                            logger.warn('Skipped invalid visitor history entry: %s', parseError.message);
                        }
                    });
                }

                deviceMap[newVisitor.DeviceID] = newVisitor;

                done.vars = done.vars || {};
                done.vars.valuesToRemove = valuesToRemove;
                done.vars.newVisitorValue = JSON.stringify(newVisitor);
                done();
            });
        })
        .seq(function() {
            var done = this;
            var vars = done.vars || {};
            var valuesToRemove = vars.valuesToRemove || [];
            var transaction = db.multi();

            valuesToRemove.forEach(function(value) {
                transaction.lrem(visitKey, 0, value);
            });

            transaction.lpush(visitKey, vars.newVisitorValue);
            transaction.ltrim(visitKey, 0, configuration.maximumNumberOfLocationVistors - 1);

            transaction.exec(function(error) {
                done(error);
            });
        })
        .seq(function() {
            callback();
        })
        .catch(function(error) {
            logger.warn('Error recording visitor history: %s', error.message);
            callback();
        });
}

function recordDetailedVisitorHistory(visitKey, visitValue) {
    seq()
        .seq(function() {
            db.lpush(visitKey, stringifyVisitor(visitValue), this);
        })
        .seq(function() {
            db.ltrim(visitKey, 0, configuration.maximumNumberOfLocationVistors - 1, this);
        })
        .catch(function(error) {
            logger.warn('Error recording visitor history: %s', error.message);
        });
}

function normalizeVisitor(visitValue) {
    if (typeof visitValue === 'string') {
        return JSON.parse(visitValue);
    }

    return visitValue;
}

function stringifyVisitor(visitValue) {
    if (typeof visitValue === 'string') {
        return visitValue;
    }

    return JSON.stringify(visitValue);
}

module.exports = {
    recordVisitorHistory: recordVisitorHistory,
    touchVisitorHistory: touchVisitorHistory
};
