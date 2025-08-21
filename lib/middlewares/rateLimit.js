var db = require('../db');
var configuration = require('../configuration');

var windowSeconds = (configuration.rateLimit && configuration.rateLimit.windowSeconds) || 60;
var maxRequests = (configuration.rateLimit && configuration.rateLimit.maxRequests) || 100;

module.exports = function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
        (req.connection && req.connection.remoteAddress) ||
        req.ip || 'unknown';

    var key = 'ratelimit:' + ip;

    db.incr(key, function(err, count) {
        if (err) {
            return next(err);
        }

        if (count === 1) {
            db.expire(key, windowSeconds);
        }

        if (count > maxRequests) {
            res.send(429, {error: 'Too many requests'});
        } else {
            next();
        }
    });
};
