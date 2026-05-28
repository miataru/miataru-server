'use strict';

function createLogger(options) {
    options = options || {};

    var output = options.output || console;
    var errorsOnly = options.errorsOnly === true;

    return {
        info: function(message) {
            if (!errorsOnly && output.info) {
                output.info(message);
            }
        },
        warn: function(message) {
            if (!errorsOnly && output.warn) {
                output.warn(message);
            }
        },
        error: function(message) {
            if (output.error) {
                output.error(message);
            }
        }
    };
}

module.exports = {
    createLogger: createLogger
};
