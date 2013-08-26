var http = require('http');
var path = require('path');

var express = require('express');

var configuration = require('./lib/configuration');
var routes = require('./lib/routes');
var middlewares = require('./lib/middlewares');

var app = express();

app.use(express.logger('dev'));
app.use(express.bodyParser());

middlewares.install(app);
routes.install(app);

app.use(function(error, req, res, next) {
    res.end('damn, something went wrong: ' + error.message);
});

app.listen(configuration.port);

console.log('miataru server is listening to: ' + configuration.port);