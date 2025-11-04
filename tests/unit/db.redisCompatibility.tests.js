'use strict';

var expect = require('chai').expect;

var configuration = require('../../lib/configuration');

describe('db redis compatibility', function() {
    var redisPath = require.resolve('redis');
    var fakeRedisPath = require.resolve('fakeredis');
    var dbPath = require.resolve('../../lib/db');
    var originalRedisModule;
    var originalFakeRedisModule;
    var configurationSnapshot;

    beforeEach(function() {
        configurationSnapshot = snapshotConfiguration();
        originalRedisModule = require.cache[redisPath];
        originalFakeRedisModule = require.cache[fakeRedisPath];

        delete require.cache[redisPath];
        delete require.cache[fakeRedisPath];
        delete require.cache[dbPath];
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
});

function createModernStub() {
    return {
        lLenCalls: [],
        lRangeCalls: [],
        lLen: function() {
            this.lLenCalls.push(Array.prototype.slice.call(arguments));
            return Promise.resolve(3);
        },
        lRange: function() {
            this.lRangeCalls.push(Array.prototype.slice.call(arguments));
            return Promise.resolve(['a', 'b', 'c']);
        },
        lPush: function() {
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
