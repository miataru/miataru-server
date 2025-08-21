var rateLimit = require('./rateLimit');

function install(app) {
    //global rate limiting middleware
    app.use(rateLimit);
}

module.exports.install = install;