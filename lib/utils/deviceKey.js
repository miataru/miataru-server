var db = require('../db');
var kb = require('./keyBuilder');

var KEY_SUFFIX = 'key';

/**
 * Get device key from Redis
 * @param {string} deviceId - The device ID
 * @param {function} callback - Callback function (error, deviceKey)
 */
function getDeviceKey(deviceId, callback) {
    if (!deviceId) {
        return callback(new Error('Device ID is required'));
    }

    var key = kb.build(deviceId, KEY_SUFFIX);
    db.get(key, function(error, reply) {
        if (error) {
            return callback(error);
        }

        // Return null if key doesn't exist, otherwise return the key string
        callback(null, reply || null);
    });
}

/**
 * Set device key in Redis
 * @param {string} deviceId - The device ID
 * @param {string} deviceKey - The device key (up to 256 characters unicode)
 * @param {function} callback - Callback function (error)
 */
function setDeviceKey(deviceId, deviceKey, callback) {
    if (!deviceId) {
        return callback(new Error('Device ID is required'));
    }

    if (deviceKey === null || deviceKey === undefined) {
        return callback(new Error('Device key is required'));
    }

    // Validate length (max 256 characters unicode)
    if (typeof deviceKey !== 'string' || deviceKey.length > 256) {
        return callback(new Error('Device key must be a string with maximum 256 characters'));
    }

    var key = kb.build(deviceId, KEY_SUFFIX);
    db.set(key, deviceKey, function(error) {
        if (error) {
            return callback(error);
        }

        callback(null);
    });
}

/**
 * Validate provided device key against stored key
 * Uses constant-time comparison to prevent timing attacks
 * @param {string} deviceId - The device ID
 * @param {string} providedKey - The device key provided by the client
 * @param {function} callback - Callback function (error, isValid)
 */
function validateDeviceKey(deviceId, providedKey, callback) {
    if (!deviceId) {
        return callback(new Error('Device ID is required'));
    }

    // Get stored key
    getDeviceKey(deviceId, function(error, storedKey) {
        if (error) {
            return callback(error);
        }

        // If no key is set, validation passes (backward compatibility)
        if (storedKey === null || storedKey === undefined) {
            return callback(null, true);
        }

        // If provided key is null/undefined/empty, validation fails
        if (!providedKey || typeof providedKey !== 'string') {
            return callback(null, false);
        }

        // Constant-time comparison to prevent timing attacks
        var isValid = constantTimeCompare(storedKey, providedKey);
        callback(null, isValid);
    });
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
function constantTimeCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    var result = 0;
    for (var i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

module.exports = {
    getDeviceKey: getDeviceKey,
    setDeviceKey: setDeviceKey,
    validateDeviceKey: validateDeviceKey
};
