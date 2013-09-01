var path = require('path');

var configLoader = require('./utils/configurationLoader');

var configuration = configLoader.load(path.join(__dirname, '../config'));

module.exports = configuration;