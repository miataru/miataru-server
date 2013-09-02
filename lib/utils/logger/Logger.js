var util = require('util');

var moment = require('moment');

var transports = require('./transports');

var LOG_LEVELS = {
    INFO: {label: 'info', level: 0},
    WARN: {label: 'warn', level: 1},
    ERROR: {label: 'error', level: 2}
};

function Logger(name, logLevel, sink) {
    this._name = name || 'default';
    this._logLevel = this._lookupLogLevel(logLevel);
    this._sink = sink || new transports.Console();
}

Logger.prototype._lookupLogLevel = function(level) {
    if(!isNaN(level)) {
        return level;
    }

    var key = (level + '').toUpperCase();
    if(LOG_LEVELS[key]) {
        return LOG_LEVELS[key].level;
    } else {
        return 0;
    }
};

Logger.prototype._log = function(level, parameters) {
    if(level.level < this._logLevel) {
        return;
    }

    var message = util.format.apply(null, parameters);
    var logMessage = util.format('%s [%s] [%s] "%s"', moment().format(), level.label.toUpperCase(), this._name, message);

    this._sink.write(logMessage);
};

Logger.prototype.info = function() {
    this._log(LOG_LEVELS.INFO, [].slice.call(arguments));
};

Logger.prototype.warn = function() {
    this._log(LOG_LEVELS.WARN, [].slice.call(arguments));
};

Logger.prototype.error = function() {
    this._log(LOG_LEVELS.ERROR, [].slice.call(arguments));
};

//child logger allow for namespaced logging
Logger.prototype.Logger = function(name) {
    return new Logger(this._name + ':' + name);
};

module.exports = Logger;