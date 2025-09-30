var redis = require('redis');
var fakeRedis = require('fakeredis');

var configuration = require('./configuration');
var logger = require('./logger');
var limiterModule = require('./utils/concurrencyLimiter');
var ConcurrencyLimiter = limiterModule.ConcurrencyLimiter;
var limiterErrors = ConcurrencyLimiter.ERROR_CODES;

var DB_KEY_MOCK = 'mock';
var DB_KEY_REAL = 'real';

var myRedis;

var REDIS_LIMITER_KEY = '__redis__';
// Capture the Redis limiter configuration once so we can construct a shared limiter.
var redisLimiterConfig = configuration.rateLimiting && configuration.rateLimiting.redis;
var redisLimiter = null;

if (redisLimiterConfig && redisLimiterConfig.enabled !== false) {
    redisLimiter = new ConcurrencyLimiter({
        maxConcurrent: typeof redisLimiterConfig.maxConcurrent === 'number' ? redisLimiterConfig.maxConcurrent : 50,
        maxQueue: typeof redisLimiterConfig.maxQueue === 'number' ? redisLimiterConfig.maxQueue : Infinity,
        queueTimeoutMs: typeof redisLimiterConfig.queueTimeoutMs === 'number' ? redisLimiterConfig.queueTimeoutMs : 0
    });
}

if(configuration.database.type === DB_KEY_MOCK) {
    myRedis = fakeRedis.createClient();
} else {
    // Create Redis client with modern Redis v4+ API
    myRedis = redis.createClient({
        socket: {
            host: configuration.database.host,
            port: configuration.database.port
        }
    });
    
    // Connect to Redis
    myRedis.connect().catch(function(err) {
        console.error('Redis connection error:', err);
    });
    
    // Store references to original Redis methods before overwriting them
    var originalRedis = {
        lPush: myRedis.lPush.bind(myRedis),
        lTrim: myRedis.lTrim.bind(myRedis),
        get: myRedis.get.bind(myRedis),
        set: myRedis.set.bind(myRedis),
        setEx: myRedis.setEx.bind(myRedis),
        del: myRedis.del.bind(myRedis),
        exists: myRedis.exists.bind(myRedis),
        keys: myRedis.keys.bind(myRedis),
        expire: myRedis.expire.bind(myRedis),
        ttl: myRedis.ttl.bind(myRedis)
    };
    
    // Create a compatibility layer for the old Redis API
    var compatibilityLayer = {
        // List operations
        lpush: function(key, value, callback) {
            originalRedis.lPush(key, value).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        ltrim: function(key, start, stop, callback) {
            originalRedis.lTrim(key, start, stop).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        // String operations
        get: function(key, callback) {
            originalRedis.get(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        set: function(key, value, callback) {
            originalRedis.set(key, value).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        setex: function(key, seconds, value, callback) {
            originalRedis.setEx(key, seconds, value).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        del: function(key, callback) {
            originalRedis.del(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        exists: function(key, callback) {
            originalRedis.exists(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        keys: function(pattern, callback) {
            originalRedis.keys(pattern).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        expire: function(key, seconds, callback) {
            originalRedis.expire(key, seconds).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        ttl: function(key, callback) {
            originalRedis.ttl(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        }
    };
    
    // Merge the compatibility layer with the original client
    Object.assign(myRedis, compatibilityLayer);
}

installRedisRateLimiter(myRedis);

module.exports = myRedis;
module.exports.installRedisRateLimiter = installRedisRateLimiter;
module.exports._isLimiterError = isLimiterError;
module.exports._translateLimiterError = translateLimiterError;

// Wrap selected Redis client methods with the shared concurrency limiter.
function installRedisRateLimiter(client) {
    if (!redisLimiter || !client) {
        return;
    }

    // Support both camelCase and legacy lowercase names.
    var methodsToWrap = [
        'lpush', 'ltrim', 'llen', 'lrange', 'get', 'set', 'setex', 'del', 'exists', 'keys', 'expire', 'ttl',
        'lPush', 'lTrim', 'lLen', 'lRange', 'get', 'set', 'setEx', 'del', 'exists', 'keys', 'expire', 'ttl'
    ];

    var seen = Object.create(null);

    methodsToWrap.forEach(function(methodName) {
        if (seen[methodName]) {
            return;
        }

        seen[methodName] = true;

        if (typeof client[methodName] === 'function') {
            wrapRedisMethod(client, methodName);
        }
    });
}

// Decorate a Redis API method to respect the limiter and both promise/callback styles.
function wrapRedisMethod(client, methodName) {
    var original = client[methodName];

    if (typeof original !== 'function') {
        return;
    }

    original = original.bind(client);

    client[methodName] = function() {
        var args = Array.prototype.slice.call(arguments);
        var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        var callbackInvoked = false;

        var operation = function() {
            return new Promise(function(resolve, reject) {
                if (callback) {
                    var opArgs = args.slice();

                    opArgs.push(function(err, result) {
                        callbackInvoked = true;

                        try {
                            callback(err, result);
                        } catch (callbackError) {
                            reject(callbackError);
                            return;
                        }

                        if (err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });

                    try {
                        original.apply(client, opArgs);
                    } catch (applyError) {
                        reject(applyError);
                    }
                } else {
                    try {
                        var result = original.apply(client, args);

                        if (result && typeof result.then === 'function') {
                            result.then(resolve, reject);
                        } else {
                            resolve(result);
                        }
                    } catch (executeError) {
                        reject(executeError);
                    }
                }
            });
        };

        // Run the Redis call under the global limiter so concurrent operations queue consistently.
        var promise = redisLimiter
            ? redisLimiter.schedule(operation, REDIS_LIMITER_KEY).catch(function(err) {
                if (isLimiterError(err)) {
                    var translated = translateLimiterError(err);
                    logger.warn('Redis rate limiter rejected operation: %s', translated.message);
                    throw translated;
                }

                throw err;
            })
            : operation();

        if (!callback) {
            return promise;
        }

        promise.catch(function(err) {
            if (!callbackInvoked) {
                // Surface limiter errors through the callback with the translated Redis codes.
                if (isLimiterError(err) && !err.cause) {
                    err = translateLimiterError(err);
                }

                setImmediate(function() {
                    callback(err);
                });
            }
        });

        return undefined;
    };
}

// Recognize limiter errors regardless of whether they have been translated yet.
function isLimiterError(err) {
    return !!err && (err.code === limiterErrors.QUEUE_FULL || err.code === limiterErrors.QUEUE_TIMEOUT || err.code === 'REDIS_QUEUE_FULL' || err.code === 'REDIS_QUEUE_TIMEOUT');
}

function translateLimiterError(err) {
    if (!err) {
        return err;
    }

    if (err.code === limiterErrors.QUEUE_FULL) {
        var queueError = new Error('Redis concurrency limit exceeded');
        queueError.code = 'REDIS_QUEUE_FULL';
        queueError.cause = err;
        return queueError;
    }

    if (err.code === limiterErrors.QUEUE_TIMEOUT) {
        var timeoutError = new Error('Redis operation timed out while waiting for concurrency slot');
        timeoutError.code = 'REDIS_QUEUE_TIMEOUT';
        timeoutError.cause = err;
        return timeoutError;
    }

    return err;
}
