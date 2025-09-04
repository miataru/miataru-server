var path = require('path');
var yargs = require('yargs/yargs');
var args = yargs(process.argv.slice(2)).argv;

var configLoader = require('./utils/configurationLoader');

var configuration = configLoader.load(path.join(__dirname, '../config'), args);

module.exports = configuration;