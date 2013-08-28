var http = require('http');
var path = require('path');

var express = require('express');

var configuration = require('./lib/configuration');
var routes = require('./lib/routes');
var middlewares = require('./lib/middlewares');

var app = express();

app.use(express.bodyParser());

middlewares.install(app);
routes.install(app);

app.all('*', function(req, res, next) {
    res.send(404, {error: 'Not found: ' + req.method + '_' + req.path});
});

app.use(function(error, req, res, next) {
    res.send(error.statusCode || 500, {error: error.message});
});

app.listen(configuration.port);

console.log('miataru server is listening to: ' + configuration.port);