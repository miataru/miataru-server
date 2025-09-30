'use strict';

var configuration = require('../configuration');
var logger = require('../logger');
var limiterModule = require('../utils/concurrencyLimiter');
var ConcurrencyLimiter = limiterModule.ConcurrencyLimiter;
var limiterErrors = ConcurrencyLimiter.ERROR_CODES;

// Attach the HTTP concurrency limiter middleware when enabled in configuration.
function install(app) {
    var httpConfig = configuration.rateLimiting && configuration.rateLimiting.http;

    if (!httpConfig || httpConfig.enabled === false) {
        return;
    }

    var limiter = new ConcurrencyLimiter({
        maxConcurrent: typeof httpConfig.maxConcurrentPerIp === 'number' ? httpConfig.maxConcurrentPerIp : 10,
        maxQueue: typeof httpConfig.maxQueuePerIp === 'number' ? httpConfig.maxQueuePerIp : 50,
        queueTimeoutMs: typeof httpConfig.queueTimeoutMs === 'number' ? httpConfig.queueTimeoutMs : 0
    });

    var statusCode = typeof httpConfig.rejectionStatusCode === 'number' ? httpConfig.rejectionStatusCode : 429;
    var rejectionMessage = typeof httpConfig.rejectionMessage === 'string' ? httpConfig.rejectionMessage : 'Too Many Requests';
    var timeoutMessage = typeof httpConfig.timeoutMessage === 'string' ? httpConfig.timeoutMessage : rejectionMessage;

    app.use(function(req, res, next) {
        var key = req.ip || req.connection.remoteAddress || 'unknown';

        limiter.acquire(key).then(function(release) {
            var cleanedUp = false;

            function cleanup() {
                if (cleanedUp) {
                    return;
                }

                cleanedUp = true;
                res.removeListener('finish', cleanup);
                res.removeListener('close', cleanup);
                // Always release the slot regardless of how the response finished.
                release();
            }

            res.on('finish', cleanup);
            res.on('close', cleanup);

            next();
        }).catch(function(error) {
            var message = rejectionMessage;

            if (error && error.code === limiterErrors.QUEUE_TIMEOUT) {
                // Swap to the configured timeout message when the queue wait expired.
                message = timeoutMessage;
            }

            logger.warn('HTTP rate limiter rejected request from %s: %s', key, message);
            res.status(statusCode).json({ error: message });
        });
    });
}

module.exports.install = install;
