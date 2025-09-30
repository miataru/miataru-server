var http = require('http');
var path = require('path');

var express = require('express');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');

var configuration = require('./lib/configuration');
var routes = require('./lib/routes');
var middlewares = require('./lib/middlewares');
var logger = require('./lib/logger');
var errors = require('./lib/errors');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(favicon(__dirname + '/favicon.ico')); 

middlewares.install(app);
routes.install(app);

app.all('*', function(req, res, next) {
    next(new errors.NotFoundError(req.path));
});

app.use(handleError);

// Only start the server if this file is run directly (not required for testing)
if (require.main === module) {
    app.listen(configuration.port, configuration.listenip);
    logger.info('miataru server is listening to: %d on %s', configuration.port,configuration.listenip);
}

module.exports = app;

function handleError(error, req, res, next) {
    var statusCode = (error && typeof error.statusCode === 'number') ? error.statusCode : 500;
    var errorMessage = error && error.message ? error.message : 'Internal Server Error';
    var logMessage = 'error handler received error: ' + errorMessage;

    if (!error || statusCode >= 500 || statusCode < 400) {
        logger.error(logMessage);
    } else if (statusCode === 404 || statusCode === 405) {
        logger.info(logMessage);
    } else {
        logger.warn(logMessage);
    }

    res.status(statusCode).json({error: errorMessage});
}
