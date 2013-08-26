var redis = require('redis');
var fakeRedis = require('fakeredis');

var configuration = require('./configuration');

var DB_KEY_MOCK = 'mock';
var DB_KEY_REAL = 'real';

var myRedis;

if(configuration.database.type === DB_KEY_MOCK) {
    myRedis = fakeRedis.createClient();
} else {
    //TODO: the options hash needs love, we probably should read some of them from the config
    myRedis = redis.createClient(configuration.database.port, configuration.database.host, {});
}

module.exports = myRedis;