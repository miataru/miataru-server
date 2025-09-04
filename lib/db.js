var redis = require('redis');
var fakeRedis = require('fakeredis');

var configuration = require('./configuration');

var DB_KEY_MOCK = 'mock';
var DB_KEY_REAL = 'real';

var myRedis;

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

module.exports = myRedis;