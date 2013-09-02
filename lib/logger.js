var Logger = require('./utils/logger/Logger');
var configuration = require('./configuration');

module.exports = new Logger('miataru', configuration.logging.logLevel);