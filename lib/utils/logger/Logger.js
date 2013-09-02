var util = require('util');

var moment = require('moment');

var transports = require('./transports');

//TODO: implement configurable loglevels

function Logger(name, sink) {
    this._name = name || 'default';
    this._sink = sink || new transports.Console();
}

Logger.prototype._log = function(level, parameters) {
    var message = util.format.apply(null, parameters);
    var logMessage = util.format('%s [%s] [%s] "%s"', moment().format(), level.toUpperCase(), this._name, message);

    this._sink.write(logMessage);
};

Logger.prototype.info = function() {
    this._log('INFO', [].slice.call(arguments));
};

Logger.prototype.warn = function() {
    this._log('WARN', [].slice.call(arguments));
};

Logger.prototype.error = function() {
    this._log('ERROR', [].slice.call(arguments));
};

//child logger allow for namespaced logging
Logger.prototype.Logger = function(name) {
    return new Logger(this._name + ':' + name);
};

module.exports = Logger;