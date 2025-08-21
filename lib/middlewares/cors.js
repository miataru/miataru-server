var cors = require('cors');
var config = require('../configuration');

var allowed = (config.cors && config.cors.allowedOrigins) || [];

var options = {
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowed.indexOf('*') !== -1 || allowed.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(null, false);
    }
};

module.exports = cors(options);
