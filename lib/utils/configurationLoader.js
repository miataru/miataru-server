var fs = require('fs');
var path = require('path');

var ce = require('cloneextend');

var KEY_EXTERNAL_FILE = 'externalconfig';
var KEY_DEVELOPMENT = 'development';

/**
 * very basic configuration loader
 *
 * @param baseDir
 * @param cliArgs
 * @return Object
 */
function load(baseDir, cliArgs) {
    cliArgs = cliArgs || {};

    if(Object.keys(cliArgs).length > 0) {
        delete cliArgs['_'];
        delete cliArgs['$0'];
    }

    var environment = process.env.NODE_ENV || KEY_DEVELOPMENT;
    var userName = process.env.USER || process.env.USERNAME || null;

    var pathDefault = path.join(baseDir, 'default.js');
    var pathEnvironment = path.join(baseDir, environment + '.js');
    var pathUser = path.join(baseDir, 'user.' + userName + '.js');

    //fail dramatically if default config is not found or the format sucks. file name pattern: default.js
    var configuration = require(pathDefault);

    //we're checking if theres a config file named after the current environment. file name pattern: {environmentName}.js
    if(fs.existsSync(pathEnvironment)) {
        configuration = ce.extend(configuration, require(pathEnvironment));
    }


    //we're checking if there's a config file named after the current user, but only in development. file name pattern: user.{userName}.js
    if(environment === KEY_DEVELOPMENT) {
        if(fs.existsSync(pathUser)) {
            configuration = ce.extend(configuration, require(pathUser));
        }
    }

    //we provide the possibility to assign the path to a external configuration file
    if(cliArgs[KEY_EXTERNAL_FILE]) {
        var externalConfigPath = cliArgs[KEY_EXTERNAL_FILE];

        if(fs.existsSync(externalConfigPath)) {
            configuration = ce.extend(configuration, require(externalConfigPath));
        } else {
            throw new Error('supplied external config file could not be found');
        }

        delete cliArgs[KEY_EXTERNAL_FILE];
    }

    if(Object.keys(cliArgs).length > 0) {
        ce.extend(configuration, cliArgs);
    }

    return ce.clone(configuration);
}

module.exports.load = load;