var location = require('./location');
var homepage = require('./homepage');

function install(app) {
    homepage.install(app);
    location.install(app);
}

module.exports.install = install;