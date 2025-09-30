var cors = require('cors');
var configuration = require('../configuration');
var rateLimiter = require('./rateLimiter');

function install(app) {
    rateLimiter.install(app);

    //CORS middleware configuration
    var corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Check if the origin is in the allowed list
            if (configuration.cors && configuration.cors.allowedOrigins && 
                configuration.cors.allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                // Return false to reject the origin
                callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };

    app.use(cors(corsOptions));
}

module.exports.install = install;