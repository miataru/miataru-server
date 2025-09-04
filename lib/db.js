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
    
    // Create a compatibility layer for the old Redis API
    var compatibilityLayer = {
        // List operations
        lpush: function(key, value, callback) {
            myRedis.lPush(key, value).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        ltrim: function(key, start, stop, callback) {
            myRedis.lTrim(key, start, stop).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        // String operations
        get: function(key, callback) {
            myRedis.get(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        set: function(key, value, callback) {
            myRedis.set(key, value).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        setex: function(key, seconds, value, callback) {
            myRedis.setEx(key, seconds, value).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        del: function(key, callback) {
            myRedis.del(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        exists: function(key, callback) {
            myRedis.exists(key).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        keys: function(pattern, callback) {
            myRedis.keys(pattern).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        expire: function(key, seconds, callback) {
            myRedis.expire(key, seconds).then(function(result) {
                if (callback) callback(null, result);
            }).catch(function(err) {
                if (callback) callback(err);
            });
        },
        
        ttl: function(key, callback) {
            myRedis.ttl(key).then(function(result) {
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