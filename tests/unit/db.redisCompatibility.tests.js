'use strict';

var expect = require('chai').expect;

var configuration = require('../../lib/configuration');

describe('db redis compatibility', function() {
    var redisPath = require.resolve('redis');
    var fakeRedisPath = require.resolve('fakeredis');
    var dbPath = require.resolve('../../lib/db');
    var limiterPath = require.resolve('../../lib/utils/concurrencyLimiter');
    var originalRedisModule;
    var originalFakeRedisModule;
    var originalLimiterModule;
    var configurationSnapshot;

    beforeEach(function() {
        configurationSnapshot = snapshotConfiguration();
        originalRedisModule = require.cache[redisPath];
        originalFakeRedisModule = require.cache[fakeRedisPath];
        originalLimiterModule = require.cache[limiterPath];

        delete require.cache[redisPath];
        delete require.cache[fakeRedisPath];
        delete require.cache[dbPath];
        delete require.cache[limiterPath];
    });

    afterEach(function() {
        restoreConfiguration(configurationSnapshot);

        if (originalRedisModule) {
            require.cache[redisPath] = originalRedisModule;
        } else {
            delete require.cache[redisPath];
        }

        if (originalFakeRedisModule) {
            require.cache[fakeRedisPath] = originalFakeRedisModule;
        } else {
            delete require.cache[fakeRedisPath];
        }

        if (originalLimiterModule) {
            require.cache[limiterPath] = originalLimiterModule;
        } else {
            delete require.cache[limiterPath];
        }

        delete require.cache[dbPath];
    });

    it('exposes legacy list helpers when using the modern redis client', function(done) {
        var modernApi = createModernStub();
        var client = createClientStub(modernApi);
        var createClientCalls = [];

        require.cache[redisPath] = {
            exports: {
                createClient: function(options) {
                    createClientCalls.push(options);
                    return client;
                }
            }
        };

        require.cache[fakeRedisPath] = {
            exports: {
                createClient: function() {
                    throw new Error('fakeredis stub should not be used in real mode');
                }
            }
        };

        configuration.database.type = 'real';
        configuration.database.host = '127.0.0.1';
        configuration.database.port = 6379;
        configuration.rateLimiting = { redis: { enabled: false } };

        var db = require('../../lib/db');

        expect(createClientCalls).to.have.lengthOf(1);
        expect(createClientCalls[0]).to.have.property('legacyMode', true);

        db.llen('history:key', function(err, length) {
            try {
                expect(err).to.equal(null);
                expect(length).to.equal(3);
                expect(modernApi.lLenCalls).to.deep.equal([['history:key']]);

                db.lrange('history:key', 0, 2, function(rangeErr, values) {
                    try {
                        expect(rangeErr).to.equal(null);
                        expect(values).to.deep.equal(['a', 'b', 'c']);
                        expect(modernApi.lRangeCalls).to.deep.equal([[ 'history:key', 0, 2 ]]);
                        done();
                    } catch (assertRangeErr) {
                        done(assertRangeErr);
                    }
                });
            } catch (assertLenErr) {
                done(assertLenErr);
            }
        });
    });

    it('schedules redis operations only once even when using camelCase aliases', function() {
        var modernApi = createModernStub();
        var client = createClientStub(modernApi);
        var scheduleCalls = [];

        require.cache[redisPath] = {
            exports: {
                createClient: function() {
                    return client;
                }
            }
        };

        require.cache[fakeRedisPath] = {
            exports: {
                createClient: function() {
                    throw new Error('fakeredis stub should not be used in real mode');
                }
            }
        };

        require.cache[limiterPath] = {
            exports: createLimiterStub(scheduleCalls)
        };

        configuration.database.type = 'real';
        configuration.database.host = '127.0.0.1';
        configuration.database.port = 6379;
        configuration.rateLimiting = { redis: { enabled: true, maxConcurrent: 1, maxQueue: 1 } };

        var db = require('../../lib/db');

        return db.lPush('history:key', 'value').then(function(result) {
            expect(result).to.equal(1);
            expect(modernApi.lPushCalls).to.deep.equal([[ 'history:key', 'value' ]]);
            expect(scheduleCalls).to.have.lengthOf(1);
            expect(scheduleCalls[0].key).to.equal('__redis__');

            return db.lpush('history:key', 'value2');
        }).then(function(result) {
            expect(result).to.equal(1);
            expect(modernApi.lPushCalls).to.deep.equal([[ 'history:key', 'value' ], [ 'history:key', 'value2' ]]);
            expect(scheduleCalls).to.have.lengthOf(2);
            expect(scheduleCalls[1].key).to.equal('__redis__');
        });
    });
});

function createModernStub() {
    return {
        lLenCalls: [],
        lRangeCalls: [],
        lPushCalls: [],
        lLen: function() {
            this.lLenCalls.push(Array.prototype.slice.call(arguments));
            return Promise.resolve(3);
        },
        lRange: function() {
            this.lRangeCalls.push(Array.prototype.slice.call(arguments));
            return Promise.resolve(['a', 'b', 'c']);
        },
        lPush: function() {
            this.lPushCalls.push(Array.prototype.slice.call(arguments));
            return Promise.resolve(1);
        },
        lTrim: function() {
            return Promise.resolve('OK');
        },
        get: function() {
            return Promise.resolve(null);
        },
        set: function() {
            return Promise.resolve('OK');
        },
        setEx: function() {
            return Promise.resolve('OK');
        },
        del: function() {
            return Promise.resolve(0);
        },
        exists: function() {
            return Promise.resolve(0);
        },
        keys: function() {
            return Promise.resolve([]);
        },
        expire: function() {
            return Promise.resolve(1);
        },
        ttl: function() {
            return Promise.resolve(-1);
        }
    };
}

function createClientStub(modernApi) {
    return {
        v4: modernApi,
        connect: function() {
            return Promise.resolve();
        },
        on: function() {}
    };
}

function createLimiterStub(scheduleCalls) {
    function StubLimiter(options) {
        this.options = options;
    }

    StubLimiter.ERROR_CODES = {
        QUEUE_FULL: 'QUEUE_FULL',
        QUEUE_TIMEOUT: 'QUEUE_TIMEOUT'
    };

    StubLimiter.prototype.schedule = function(task, key) {
        scheduleCalls.push({ key: key, task: task });

        var result;

        try {
            result = task();
        } catch (error) {
            return Promise.reject(error);
        }

        return Promise.resolve(result);
    };

    return {
        ConcurrencyLimiter: StubLimiter
    };
}

function snapshotConfiguration() {
    return JSON.parse(JSON.stringify(configuration));
}

function restoreConfiguration(snapshot) {
    Object.keys(configuration).forEach(function(key) {
        delete configuration[key];
    });

    Object.keys(snapshot).forEach(function(key) {
        configuration[key] = snapshot[key];
    });
}
