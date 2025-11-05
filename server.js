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

app.use(bodyParser.json({
    verify: captureRawBody
}));
app.use(bodyParser.urlencoded({ extended: true, verify: captureRawBody }));
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
    var statusCode = 500;

    if (error) {
        if (typeof error.statusCode === 'number') {
            statusCode = error.statusCode;
        } else if (typeof error.status === 'number') {
            statusCode = error.status;
        }
    }
    var errorMessage = error && error.message ? error.message : 'Internal Server Error';
    var logContext = buildErrorLogContext(error, req);
    var logMessage = 'error handler received error: ' + errorMessage + logContext;

    if (!error || statusCode >= 500 || statusCode < 400) {
        logger.error(logMessage);
    } else if (statusCode === 404 || statusCode === 405) {
        logger.info(logMessage);
    } else {
        logger.warn(logMessage);
    }

    res.status(statusCode).json({error: errorMessage});
}

function captureRawBody(req, res, buf, encoding) {
    if (!req) {
        return;
    }

    if (!buf || !buf.length) {
        req.rawBody = '';
        return;
    }

    var charset = encoding || 'utf8';

    try {
        req.rawBody = buf.toString(charset);
    } catch (error) {
        req.rawBody = '[unable to decode raw body: ' + error.message + ']';
    }
}

function buildErrorLogContext(error, req) {
    var details = [];

    if (req) {
        if (req.method) {
            details.push('method=' + req.method);
        }

        if (req.originalUrl || req.url) {
            details.push('path=' + (req.originalUrl || req.url));
        }

        if (req.headers && req.headers['content-type']) {
            details.push('content-type=' + req.headers['content-type']);
        }

        if (req.headers && req.headers['content-length']) {
            details.push('content-length=' + req.headers['content-length']);
        }
    }

    if (error) {
        if (error.type) {
            details.push('error.type=' + error.type);
        }

        if (typeof error.status === 'number') {
            details.push('error.status=' + error.status);
        }

        if (typeof error.statusCode === 'number' && error.statusCode !== error.status) {
            details.push('error.statusCode=' + error.statusCode);
        }
    }

    var rawBody = (error && error.body) || (req && req.rawBody);

    if (rawBody !== undefined) {
        var maxLength = 200;
        var length;
        var preview;

        if (Buffer.isBuffer(rawBody)) {
            length = rawBody.length;
            preview = rawBody.toString('utf8', 0, Math.min(maxLength, length));
        } else {
            var stringValue = typeof rawBody === 'string' ? rawBody : String(rawBody);
            length = stringValue.length;
            preview = stringValue.slice(0, Math.min(maxLength, length));
        }

        if (length > maxLength) {
            preview += '…';
        }

        details.push('rawBodyLength=' + length);
        details.push('rawBodyPreview=' + preview.replace(/\s+/g, ' '));
    }

    if (!details.length) {
        return '';
    }

    return ' (' + details.join(', ') + ')';
}
