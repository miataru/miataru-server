var http = require('http');
var path = require('path');

var express = require('express');

var configuration = require('./lib/configuration');
var routes = require('./lib/routes');
var middlewares = require('./lib/middlewares');
var logger = require('./lib/logger');

var app = express();

app.use(express.bodyParser());
app.use(express.favicon(__dirname + '/favicon.ico')); 

middlewares.install(app);
routes.install(app);

app.all('*', function(req, res, next) {
    var e = new Error('Not found: ' + req.method + '_' + req.path);
    e.statusCode = 404;
    handleError(e, req, res, next);
});

app.use(handleError);

app.listen(configuration.port, configuration.listenip);

logger.info('miataru server is listening to: %d on %s', configuration.port,configuration.listenip);

function handleError(error, req, res, next) {
    logger.error('error handler received error: ' + error.message);
    console.log(error.stack);
    res.send(error.statusCode || 500, {error: error.message});
}
