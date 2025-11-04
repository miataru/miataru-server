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
    // Create Redis client with explicit legacy compatibility so callback-based helpers remain available.
    myRedis = redis.createClient({
        socket: {
            host: configuration.database.host,
            port: configuration.database.port
        },
        legacyMode: true
    });

    // Connect to Redis
    myRedis.connect().catch(function(err) {
        console.error('Redis connection error:', err);
    });

    // Ensure the legacy helper methods exist even when the underlying client only exposes the modern promise API.
    var modernRedis = myRedis.v4 || myRedis;
    var methodMappings = [
        { legacy: 'lpush', modern: 'lPush' },
        { legacy: 'ltrim', modern: 'lTrim' },
        { legacy: 'llen', modern: 'lLen' },
        { legacy: 'lrange', modern: 'lRange' },
        { legacy: 'get', modern: 'get' },
        { legacy: 'set', modern: 'set' },
        { legacy: 'setex', modern: 'setEx' },
        { legacy: 'del', modern: 'del' },
        { legacy: 'exists', modern: 'exists' },
        { legacy: 'keys', modern: 'keys' },
        { legacy: 'expire', modern: 'expire' },
        { legacy: 'ttl', modern: 'ttl' }
    ];

    methodMappings.forEach(function(mapping) {
        attachLegacyWrapper(myRedis, modernRedis, mapping.legacy, mapping.modern);
        ensureModernAlias(myRedis, mapping.legacy, mapping.modern);
    });
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

    // Support both camelCase and legacy lowercase names without wrapping twice.
    var methodGroups = [
        ['lpush', 'lPush'],
        ['ltrim', 'lTrim'],
        ['llen', 'lLen'],
        ['lrange', 'lRange'],
        ['get'],
        ['set'],
        ['setex', 'setEx'],
        ['del'],
        ['exists'],
        ['keys'],
        ['expire'],
        ['ttl']
    ];

    methodGroups.forEach(function(group) {
        var targetName = null;

        group.some(function(name) {
            if (typeof client[name] === 'function') {
                targetName = name;
                return true;
            }

            return false;
        });

        if (!targetName) {
            return;
        }

        var wrapped = wrapRedisMethod(client, targetName);

        group.forEach(function(name) {
            if (typeof client[name] === 'function') {
                client[name] = wrapped;
            }
        });
    });
}

// Decorate a Redis API method to respect the limiter and both promise/callback styles.
function wrapRedisMethod(client, methodName) {
    var original = client[methodName];

    if (typeof original !== 'function') {
        return;
    }

    original = original.bind(client);

    var wrapped = function() {
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

    client[methodName] = wrapped;

    return wrapped;
}

// Bridge legacy callback-style helpers onto the modern Redis client when necessary.
function attachLegacyWrapper(client, modernClient, legacyName, modernName) {
    if (typeof client[legacyName] === 'function') {
        return;
    }

    if (!modernClient || typeof modernClient[modernName] !== 'function') {
        return;
    }

    client[legacyName] = function() {
        var args = Array.prototype.slice.call(arguments);
        var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        var promise;

        try {
            promise = modernClient[modernName].apply(modernClient, args);
        } catch (invokeError) {
            if (callback) {
                setImmediate(function() {
                    callback(invokeError);
                });
                return undefined;
            }

            throw invokeError;
        }

        if (!callback) {
            return promise;
        }

        promise.then(function(result) {
            callback(null, result);
        }).catch(function(err) {
            callback(err);
        });

        return undefined;
    };
}

// Provide camelCase conveniences for callers that rely on the modern method names.
function ensureModernAlias(client, legacyName, modernName) {
    if (legacyName === modernName) {
        return;
    }

    if (typeof client[modernName] === 'function') {
        return;
    }

    if (typeof client[legacyName] !== 'function') {
        return;
    }

    client[modernName] = client[legacyName];
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
