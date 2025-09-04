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
    logger.error('error handler received error: ' + error.message);

    res.status(error.statusCode || 500).json({error: error.message});
}