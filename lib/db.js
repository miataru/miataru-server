const redis = require('redis');
const fakeRedis = require('fakeredis');

const configuration = require('./configuration');

const DB_KEY_MOCK = 'mock';
const DB_KEY_REAL = 'real';

let myRedis;

if (configuration.database.type === DB_KEY_MOCK) {
    myRedis = fakeRedis.createClient();
} else {
    myRedis = redis.createClient({
        url: `redis://${configuration.database.host}:${configuration.database.port}`,
        legacyMode: true,
        username: configuration.database.userName || undefined,
        password: configuration.database.password || undefined,
    });
    myRedis.connect().catch(console.error);
}

module.exports = myRedis;
