var path = require('path');

var configLoader = require('./configurationLoader');

var configuration = configLoader.load(path.join(__dirname, '../config'));

module.exports = configuration;