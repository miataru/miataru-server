var http = require('http');
var path = require('path');

var express = require('express');

var configuration = require('./lib/configuration');
var routes = require('./lib/routes');
var middlewares = require('./lib/middlewares');

var app = express();

// all environments
app.use(express.logger('dev'));

middlewares.install(app);
routes.install(app);

app.listen(configuration.port);

console.log('miataru server is listening to: ' + configuration.port);