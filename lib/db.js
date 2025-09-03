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
}

module.exports = myRedis;