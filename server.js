const http = require('http');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');

const configuration = require('./lib/configuration');
const routes = require('./lib/routes');
const middlewares = require('./lib/middlewares');
const logger = require('./lib/logger');
const errors = require('./lib/errors');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(favicon(path.join(__dirname, 'favicon.ico')));

middlewares.install(app);
routes.install(app);

app.all('*', function(req, res, next) {
    next(new errors.NotFoundError(req.path));
});

app.use(handleError);

app.listen(configuration.port, configuration.listenip);

logger.info('miataru server is listening to: %d on %s', configuration.port, configuration.listenip);

function handleError(error, req, res, next) {
    logger.error('error handler received error: ' + error.message);

    res.status(error.statusCode || 500).send({ error: error.message });
}

