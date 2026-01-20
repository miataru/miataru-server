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
    verify: captureRawBody,
    limit: '10mb' // Explicitly set a high limit to avoid truncation issues
}));
app.use(bodyParser.urlencoded({ extended: true, verify: captureRawBody, limit: '10mb' }));
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
    
    // For body parser errors, add additional diagnostic information
    if (error && error.type === 'entity.parse.failed') {
        logger.error('Body parser JSON parsing failed: %s, path=%s, content-type=%s, content-length=%s', 
            error.message, 
            req.path || req.url, 
            req.headers && req.headers['content-type'],
            req.headers && req.headers['content-length']);
        
        // If we have rawBody, log it for debugging
        if (req.rawBody !== undefined) {
            logger.error('Raw body that failed to parse (length=%d): %s', 
                req.rawBody.length, 
                req.rawBody.substring(0, 500));
        } else {
            logger.error('Raw body was not captured before parse failure');
        }
    }
    
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
    var contentLength = req.headers && req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : null;

    try {
        req.rawBody = buf.toString(charset);
        
        // Log if there's a mismatch between Content-Length header and actual body size
        if (contentLength !== null && !isNaN(contentLength) && buf.length !== contentLength) {
            logger.warn('Content-Length mismatch detected: header=%d, actual-buffer=%d, path=%s', 
                contentLength, buf.length, req.path || req.url);
        }
        
        // Validate JSON structure for JSON content types
        if (req.headers && req.headers['content-type'] && 
            req.headers['content-type'].includes('application/json')) {
            try {
                JSON.parse(req.rawBody);
                logger.debug('Request body validated as JSON: length=%d, path=%s', buf.length, req.path || req.url);
            } catch (parseError) {
                logger.error('Request body failed JSON validation: %s, path=%s, body-preview=%s', 
                    parseError.message, req.path || req.url, req.rawBody.substring(0, 300));
            }
        }
    } catch (error) {
        req.rawBody = '[unable to decode raw body: ' + error.message + ']';
        logger.error('Failed to decode raw body: %s, path=%s', error.message, req.path || req.url);
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
        
        // Add more error details for parsing errors
        if (error.expose !== undefined) {
            details.push('error.expose=' + error.expose);
        }
        
        if (error.statusCode === 400 && error.type === 'entity.parse.failed') {
            // This is a JSON parsing error from body-parser
            logger.debug('JSON parsing error details: %j', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    var rawBody = (error && error.body) || (req && req.rawBody);

    if (rawBody !== undefined) {
        var maxLength = 500; // Increased from 200 to capture more context
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
        
        // If body seems truncated, log a warning
        if (req && req.headers && req.headers['content-length']) {
            var expectedLength = parseInt(req.headers['content-length'], 10);
            if (!isNaN(expectedLength) && length < expectedLength) {
                details.push('WARNING: body-truncated (expected=' + expectedLength + ', actual=' + length + ')');
            }
        }
    }

    if (!details.length) {
        return '';
    }

    return ' (' + details.join(', ') + ')';
}
