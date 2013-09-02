var path = require('path');
var args = require('optimist').argv;

var configLoader = require('./utils/configurationLoader');

var configuration = configLoader.load(path.join(__dirname, '../config'), args);

module.exports = configuration;