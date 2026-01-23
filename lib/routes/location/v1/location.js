/*
	UpdateLocation POST

	By doing a HTTP Post on the /UpdateLocation method of this server you should
	be able to trigger this method here.

	curl -H "Content-Type: application/json" -X POST http://localhost:3000/UpdateLocation -d '{"JSON": "HERE"}'

	curl -H "Content-Type: application/json" -X POST http://localhost:3000/UpdateLocation -d '{"MiataruConfig":{"EnableLocationHistory":"Fa":"15"},"MiataruLocation":[{"Device":"7b8e6e0ee5296db345162dc2ef652c1350761823","Timestamp":"1376735651302","Longitude":"10.837502","Latitude":"49.828925","HorizontalAccuracy":"50.00"}]}'

	To store information Redis is used. The naming conventions are as follows:

	Last Known Location (expiring key-value): miad:$deviceid:last
	Location History (non expiring list): miad:$deviceid:hist
 */

var seq = require('seq');

var configuration = require('../../../configuration');
var db = require('../../../db');
var kb = require('../../../utils/keyBuilder');
var models = require('../../../models');
var errors = require('../../../errors');
var logger = require('../../../logger');

var KEY_HISTORY = 'hist';
var KEY_LAST = 'last';
var KEY_VISIT = 'visit';

/**
 * Record visitor history entry
 * Handles both detailed (every access) and non-detailed (update existing) modes
 * Executes the operation asynchronously (fire-and-forget)
 * @param {string} visitKey - Redis key for visitor history
 * @param {string} visitValue - JSON stringified visitor object
 */
function recordVisitorHistory(visitKey, visitValue) {
    if (configuration.recordDetailedVisitorHistory === true) {
        // ON mode: record every access as separate entry (current behavior)
        seq()
            .seq(function() {
                db.lpush(visitKey, visitValue, this);
            })
            .seq(function() {
                db.ltrim(visitKey, 0, configuration.maximumNumberOfLocationVistors-1, this);
            })
            .catch(function(error) {
                logger.warn('Error recording visitor history: %s', error.message);
            });
    } else {
        // OFF mode: update existing entry if device already visited, otherwise add new
        seq()
            .seq(function() {
                var done = this;
                // Read all existing visitor entries
                db.lrange(visitKey, 0, configuration.maximumNumberOfLocationVistors-1, function(error, list) {
                    if (error) return done(error);
                    
                    var newVisitor;
                    try {
                        newVisitor = JSON.parse(visitValue);
                    } catch (parseError) {
                        return done(parseError);
                    }
                    
                    var existingVisitors = [];
                    
                    // Parse and filter existing entries
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
                                // If this visitor has the same DeviceID as the new one, skip it (we'll add the new one)
                                if (visitor.DeviceID !== newVisitor.DeviceID) {
                                    existingVisitors.push(serialized);
                                }
                            } catch (parseError) {
                                // Skip invalid entries
                                logger.warn('Skipped invalid visitor history entry: %s', parseError.message);
                            }
                        });
                    }
                    
                    // Add the new visitor entry
                    existingVisitors.push(visitValue);
                    
                    // Sort all visitors by timestamp (newest first) to ensure proper ordering
                    existingVisitors.sort(function(a, b) {
                        try {
                            var visitorA = JSON.parse(a);
                            var visitorB = JSON.parse(b);
                            var timeA = visitorA.TimeStamp || 0;
                            var timeB = visitorB.TimeStamp || 0;
                            // Sort descending (newest first)
                            return timeB - timeA;
                        } catch (parseError) {
                            // If parsing fails, maintain original order
                            return 0;
                        }
                    });
                    
                    // Store visitors to add in vars for next step
                    done.vars = done.vars || {};
                    done.vars.visitorsToAdd = existingVisitors;
                    done();
                });
            })
            .seq(function() {
                var done = this;
                // Delete the existing list
                db.del(visitKey, function(error) {
                    if (error) return done(error);
                    done();
                });
            })
            .seq(function() {
                var done = this;
                var visitorsToAdd = (done.vars || {}).visitorsToAdd || [];
                
                // Re-add all visitors (sorted by timestamp, newest first)
                if (visitorsToAdd.length === 0) {
                    // Still need to trim even if empty
                    db.ltrim(visitKey, 0, configuration.maximumNumberOfLocationVistors-1, function(error) {
                        if (error) return done(error);
                        done();
                    });
                    return;
                }
                
                // Add all visitors back sequentially
                // Since lpush adds to the head, we need to push in reverse order
                // to maintain newest-first ordering
                var addNext = function(index) {
                    if (index < 0) {
                        // All visitors added (pushed in reverse), now trim
                        db.ltrim(visitKey, 0, configuration.maximumNumberOfLocationVistors-1, function(error) {
                            if (error) return done(error);
                            done();
                        });
                        return;
                    }
                    
                    db.lpush(visitKey, visitorsToAdd[index], function(error) {
                        if (error) return done(error);
                        addNext(index - 1);
                    });
                };
                
                // Start from the last item (oldest) and work backwards
                // This ensures newest ends up at the top after all lpush operations
                addNext(visitorsToAdd.length - 1);
            })
            .catch(function(error) {
                logger.warn('Error recording visitor history: %s', error.message);
            });
    }
}

/**
 * GetLocationHistory
 * Retrieves the complete History
 * @param req
 * @param res
 * @param next
 */
function getLocationHistory(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var requestConfig = req.MIATARU.config;
    var key = kb.build(locationRequest.device(), KEY_HISTORY);

    seq()
        .par('listLength', function() {
            db.llen(key, this);
        })
        .seq(function() {
            var done = this;
            var vars = done.vars = done.vars || {};
            var available = Number(vars.listLength) || 0;
            var requested = Number(locationRequest.amount());

            if (!isFinite(requested) || requested <= 0) {
                vars.list = [];
                return done();
            }

            var toFetch = Math.min(requested, available);

            if (toFetch <= 0) {
                vars.list = [];
                return done();
            }

            db.lrange(key, 0, toFetch - 1, function(error, list) {
                if (error) {
                    return done(error);
                }

                vars.list = list || [];
                done();
            });
        })
        .seq(function() {

            // only if this device is existing we update the visitor list...
            if (this.vars.listLength != 0)
            {
              // store the visitor for this device (if it's not empty)...
              var visitKey = kb.build(locationRequest.device(), KEY_VISIT);
              var miataruVisitorObject = requestConfig.requestMiataruVisitorObject(locationRequest.device());
              // only if the object is not null (= we do not want to store the visitor history of unknown devices)
              if (miataruVisitorObject != null)
              {
                  var visitValue = JSON.stringify(miataruVisitorObject);
                  // record visitor history using helper function (handles both detailed and non-detailed modes)
                  recordVisitorHistory(visitKey, visitValue);
              }
            }

            var parsedList = [];
            var invalidEntries = 0;

            (this.vars.list || []).forEach(function(value) {
                if (value === null || value === undefined) {
                    invalidEntries++;
                    return;
                }

                var serialized = value;

                if (Buffer.isBuffer(value)) {
                    serialized = value.toString();
                }

                try {
                    parsedList.push(JSON.parse(serialized));
                } catch (parseError) {
                    invalidEntries++;
                }
            });

            if (invalidEntries > 0) {
                logger.warn('Skipped %d invalid location history entr%s for device %s', invalidEntries, invalidEntries === 1 ? 'y' : 'ies', locationRequest.device());
            }

            var listLength = Number(this.vars.listLength);

            if (!isFinite(listLength) || listLength < 0) {
                listLength = 0;
            }

            res.json((new models.ResponseLocationHistory(
                listLength,
                configuration.maximumNumberOfHistoryItems,
                parsedList
            )).data());
        })
        .catch(function(error) {
            next(new errors.InternalServerError(error));
        });
}

/**
 * UpdateLocation
 * api endpoint that updates the currentLocation and a arbitrary number of history locations
 *
 * @param req
 * @param res
 * @param next
 */
function updateLocation(req, res, next) {
    var MIATARU = req.MIATARU;
    var requestConfig = MIATARU.config;
    var locations = MIATARU.locations;

    var chain = seq();

    if(requestConfig.enableLocationHistory()) {
        locations.forEach(function(loc, idx) {
            var value = JSON.stringify(loc.data());
            var historyKey = kb.build(loc.device(), KEY_HISTORY);
            var lastKey = kb.build(loc.device(), KEY_LAST);

            chain
                // we do want to store location history, so check if we got, so lpush and trim
                .seq(function() {
                    db.lpush(historyKey, value, this);
                })
                // take care that the location history does not grow beyond the set range of maximumNumberOfHistoryItems
                .seq(function() {
                    db.ltrim(historyKey, 0, configuration.maximumNumberOfHistoryItems-1, this);
                });

            if(idx === locations.length - 1) {
                // finally also update the last known location...
                chain.seq(function() {
                    db.set(lastKey, value, this);
                });
            }
        });
    } else {
        //we're only interested in the last item as we're not saving a history
        var loc = locations[locations.length-1];

        var timeToKeep = requestConfig.locationDataRetentionTime() * 60;
        var value = JSON.stringify(loc.data());

        chain
            // we do not want to save a location history, this means if there's one we delete it...
            .par(function() {
                db.del(kb.build(loc.device(), KEY_HISTORY), this);
            })
            // update the last known location
            .par(function() {
                db.setex(kb.build(loc.device(), KEY_LAST), timeToKeep, value, this);
            });
    }

    chain
        .seq(function() {
            var eyes = ['x', '!', '^', '°'];
            res.send((new models.ResponseUpdateLocation(eyes[parseInt(Math.random() * eyes.length, 10)])).data());
        })
        .catch(next);
}

/**
 * GetLocation
 * This is used to get the current location of a device.
 *
 * @param req
 * @param res
 * @param next
 */
function getLocation(req, res, next) {
    var chain = seq();
		var requestConfig = req.MIATARU.config;
    var response = new models.ResponseLocation();

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), KEY_LAST), function (error, reply) {
                if(error)  return done(error);

                // only if this device is existing we update the visitor list...
                if (reply != null)
                {
                  // store the visitor for this device (if it's not empty)...
                  var visitKey = kb.build(device.device(), KEY_VISIT);
                  var miataruVisitorObject = requestConfig.requestMiataruVisitorObject(device.device());
                  // only if the object is not null (= we do not want to store the visitor history of unknown devices)
                  if (miataruVisitorObject != null)
                  {
                      var visitValue = JSON.stringify(miataruVisitorObject);
                      // record visitor history using helper function (handles both detailed and non-detailed modes)
                      recordVisitorHistory(visitKey, visitValue);
                  }
                }
                if (reply != null) {
                    try {
                        response.pushLocation(JSON.parse(reply));
                    } catch (parseError) {
                        return done(new errors.InternalServerError('Invalid location data format'));
                    }
                } else {
                    response.pushLocation(null);
                }
                done();
            });
        });
    });

    chain.seq(function() {
        res.send(response.data());
    })
    .catch(next);
}

/**
 * GetLocationGeoJSON
 * This is used to get the current location of a device encoded as GeoJSON
 *
 * @param req
 * @param res
 * @param next
 */
function getLocationGeoJSON(req, res, next) {
    var chain = seq();
    var response = new models.ResponseLocationGeoJSON();

    req.MIATARU.devices.forEach(function(device) {
        chain.par(function() {
            var done = this;

            db.get(kb.build(device.device(), KEY_LAST), function (error, reply) {
                if(error)  return done(error);

                if (reply != null) {
                    try {
                        response.pushLocation(JSON.parse(reply));
                    } catch (parseError) {
                        return done(new errors.InternalServerError('Invalid location data format'));
                    }
                } else {
                    response.pushLocation(null);
                }
                done();
            });
        });
    });

    chain.seq(function() {
        res.send(response.data());
    })
    .catch(next);
}

/**
 * GetLocationGeoJSONGET
 * This is used to get the current location of a device encoded as GeoJSON, but this time as a one-shot request for just one device
 * @param req
 * @param res
 * @param next
 */
function getLocationGeoJSONGET(id, res, next) {
    var chain = seq();
    var response = new models.ResponseLocationGeoJSON();

    chain.par(function() {
        var done = this;

        db.get(kb.build(id, KEY_LAST), function (error, reply) {
            if(error)  return done(error);

            if (reply != null) {
                try {
                    response.pushLocation(JSON.parse(reply));
                } catch (parseError) {
                    return done(new errors.InternalServerError('Invalid location data format'));
                }
            } else {
                response.pushLocation(null);
            }
            done();
        });
    })

    chain.seq(function() {
        res.send(response.data());
    }).catch(next);
}

/**
 * GetVisitorHistory
 * Retrieves the complete visitor history
 * @param req
 * @param res
 * @param next
 */
function getVisitorHistory(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var key = kb.build(locationRequest.device(), KEY_VISIT);

    seq()
        .par('listLength', function() {
            db.llen(key, this);
        })
        .seq(function() {
            var done = this;
            var vars = done.vars = done.vars || {};
            var available = Number(vars.listLength) || 0;
            var requested = Number(locationRequest.amount());

            if (!isFinite(requested) || requested <= 0) {
                vars.list = [];
                return done();
            }

            var toFetch = Math.min(requested, available);

            if (toFetch <= 0) {
                vars.list = [];
                return done();
            }

            db.lrange(key, 0, toFetch - 1, function(error, list) {
                if (error) {
                    return done(error);
                }

                vars.list = list || [];
                done();
            });
        })
        .seq(function() {

            try {
                var targetDeviceID = locationRequest.device();
                var parsedList = (this.vars.list || []).map(function(value) {
                    return JSON.parse(value);
                }).filter(function(visitor) {
                    // Filter out entries where visitor DeviceID equals the requested deviceID
                    return visitor.DeviceID !== targetDeviceID;
                });

                // Recalculate the filtered list length for the response
                var filteredListLength = parsedList.length;

                res.send((new models.ResponseVisitorHistory(
                    filteredListLength,
                    configuration.maximumNumberOfLocationVistors,
                    parsedList
                )).data());
            } catch (parseError) {
                next(new errors.InternalServerError('Invalid visitor history data format'));
            }
        })
        .catch(function(error) {
            next(new errors.InternalServerError(error));
        });
}

/**
 * DeleteLocation
 * Deletes all location data (current and historical) for a device
 * @param req
 * @param res
 * @param next
 */
function deleteLocation(req, res, next) {
    var locationRequest = req.MIATARU.request;
    var deviceId = locationRequest.device();
    
    var lastKey = kb.build(deviceId, KEY_LAST);
    var historyKey = kb.build(deviceId, KEY_HISTORY);
    var visitKey = kb.build(deviceId, KEY_VISIT);
    
    var deletedCount = 0;

    seq()
        // Delete last known location
        .par(function() {
            var done = this;
            db.del(lastKey, function(error, reply) {
                if (error) return done(error);
                if (reply > 0) deletedCount++;
                done();
            });
        })
        // Delete location history
        .par(function() {
            var done = this;
            db.del(historyKey, function(error, reply) {
                if (error) return done(error);
                if (reply > 0) deletedCount++;
                done();
            });
        })
        // Delete visitor history
        .par(function() {
            var done = this;
            db.del(visitKey, function(error, reply) {
                if (error) return done(error);
                if (reply > 0) deletedCount++;
                done();
            });
        })
        .seq(function() {
            res.send((new models.ResponseDeleteLocation(deviceId, deletedCount)).data());
        })
        .catch(function(error) {
            next(new errors.InternalServerError(error));
        });
}


module.exports = {
    updateLocation: updateLocation,
    getLocation: getLocation,
    getLocationGeoJSON: getLocationGeoJSON,
    getLocationGeoJSONGET: getLocationGeoJSONGET,
    getLocationHistory: getLocationHistory,
    getVisitorHistory: getVisitorHistory,
    deleteLocation: deleteLocation
};
