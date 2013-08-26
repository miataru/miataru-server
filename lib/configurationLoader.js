var fs = require('fs');
var path = require('path');

var ce = require('cloneextend');
/**
 * very basic configuration loader
 *
 * @param baseDir
 * @return Object
 */
function load(baseDir) {
    var environment = process.env.NODE_ENV || 'development';
    var username = process.env.USER || process.env.USERNAME || null;

    var pathDefault = path.join(baseDir, 'default.js');
    var pathEnvironment = path.join(baseDir, environment + '.js');
    var pathUser = path.join(baseDir, 'user.' + username + '.js');

    //fail dramatically if default config is not found or the format sucks. file name pattern: default.js
    var configuration = require(pathDefault);

    //we're checking if theres a config file named after the current environment. file name pattern: {environmentName}.js
    if(fs.existsSync(pathEnvironment)) {
        configuration = ce.extend(configuration, require(pathEnvironment));
    }

    //we're checking if there's a config file named after the current user. file name pattern: user.{userName}.js
    if(fs.existsSync(pathUser)) {
        configuration = ce.extend(configuration, require(pathUser));
    }

    return configuration;
}

module.exports.load = load;