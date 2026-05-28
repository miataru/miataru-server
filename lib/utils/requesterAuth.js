var configuration = require('../configuration');
var errors = require('../errors');
var deviceKeyUtils = require('./deviceKey');

function validateRequestingDeviceKeyForGetLocation(requestConfig, callback) {
    if (configuration.strictDeviceKeyCheck === false) {
        return callback();
    }

    var requestingDeviceId = requestConfig.requestMiataruDeviceID();
    var requestingDeviceKey = requestConfig.requestMiataruDeviceKey();

    // Let the caller's existing validation path handle missing requester IDs.
    if (!requestingDeviceId || requestingDeviceId === '') {
        return callback();
    }

    deviceKeyUtils.getDeviceKey(requestingDeviceId, function(error, storedKey) {
        if (error) {
            return callback(error);
        }

        // If requesting device has no configured key, continue as before.
        if (storedKey === null || storedKey === undefined) {
            return callback();
        }

        deviceKeyUtils.validateDeviceKey(requestingDeviceId, requestingDeviceKey, function(validationError, isValid) {
            if (validationError) {
                return callback(validationError);
            }

            if (!isValid) {
                return callback(new errors.ForbiddenError('RequestMiataruDeviceKey does not match (strictDeviceKeyCheck is enabled)'));
            }

            callback();
        });
    });
}

module.exports = {
    validateRequestingDeviceKeyForGetLocation: validateRequestingDeviceKeyForGetLocation
};
