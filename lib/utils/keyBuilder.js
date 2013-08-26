var configuration = require('../configuration');

function build() {
    var args = [].slice.apply(arguments);

    args.unshift(configuration.redisMiataruNamespace);

    return args.join(':');
}

module.exports.build = build;