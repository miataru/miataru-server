var path = require('path');
var args = require('optimist').argv;

var configLoader = require('./configurationLoader');

var configuration = configLoader.load(path.join(__dirname, '../config'), args);

module.exports = configuration;