var db = require('../db');
var kb = require('./keyBuilder');
var seq = require('seq');
var errors = require('../errors');

var KEY_SUFFIX = 'allowed';
var ENABLED_FLAG_SUFFIX = 'allowed:enabled';
var ACCESS_TYPE_CURRENT_LOCATION = 'currentLocation';
var ACCESS_TYPE_HISTORY = 'history';

/**
 * Check if allowed devices list is enabled for a device
 * @param {string} deviceId - The device ID
 * @param {function} callback - Callback function (error, isEnabled)
 */
function isAllowedDeviceEnabled(deviceId, callback) {
    if (!deviceId) {
        return callback(new Error('Device ID is required'));
    }

    var flagKey = kb.build(deviceId, ENABLED_FLAG_SUFFIX);
    db.exists(flagKey, function(error, exists) {
        if (error) {
            return callback(error);
        }

        callback(null, exists === 1);
    });
}

/**
 * Get allowed devices list from Redis
 * @param {string} deviceId - The device ID
 * @param {function} callback - Callback function (error, allowedDevices)
 *                              allowedDevices is an array of objects with DeviceID, hasCurrentLocationAccess, hasHistoryAccess
 */
function getAllowedDevices(deviceId, callback) {
    if (!deviceId) {
        return callback(new Error('Device ID is required'));
    }

    var hashKey = kb.build(deviceId, KEY_SUFFIX);
    
    // Check if enabled first
    isAllowedDeviceEnabled(deviceId, function(error, isEnabled) {
        if (error) {
            return callback(error);
        }

        if (!isEnabled) {
            return callback(null, []);
        }

        // Get all fields from hash
        db.hgetall(hashKey, function(error, hashData) {
            if (error) {
                return callback(error);
            }

            if (!hashData || Object.keys(hashData).length === 0) {
                return callback(null, []);
            }

            // Convert hash data to array of allowed device objects
            // Hash structure: { "$allowedDeviceId:currentLocation": "true/false", "$allowedDeviceId:history": "true/false" }
            var allowedDevicesMap = {};
            var allowedDevices = [];

            Object.keys(hashData).forEach(function(key) {
                var parts = key.split(':');
                if (parts.length === 2) {
                    var allowedDeviceId = parts[0];
                    var accessType = parts[1];
                    var value = hashData[key] === 'true' || hashData[key] === '1';

                    if (!allowedDevicesMap[allowedDeviceId]) {
                        allowedDevicesMap[allowedDeviceId] = {
                            DeviceID: allowedDeviceId,
                            hasCurrentLocationAccess: false,
                            hasHistoryAccess: false
                        };
                    }

                    if (accessType === ACCESS_TYPE_CURRENT_LOCATION) {
                        allowedDevicesMap[allowedDeviceId].hasCurrentLocationAccess = value;
                    } else if (accessType === ACCESS_TYPE_HISTORY) {
                        allowedDevicesMap[allowedDeviceId].hasHistoryAccess = value;
                    }
                }
            });

            // Convert map to array
            Object.keys(allowedDevicesMap).forEach(function(deviceId) {
                allowedDevices.push(allowedDevicesMap[deviceId]);
            });

            callback(null, allowedDevices);
        });
    });
}

/**
 * Set allowed devices list in Redis
 * Replaces entire list (client maintains full list)
 * @param {string} deviceId - The device ID
 * @param {Array} allowedDevices - Array of allowed device objects with DeviceID, hasCurrentLocationAccess, hasHistoryAccess
 * @param {function} callback - Callback function (error)
 */
function setAllowedDevices(deviceId, allowedDevices, callback) {
    if (!deviceId) {
        return callback(new Error('Device ID is required'));
    }

    if (!Array.isArray(allowedDevices)) {
        return callback(new Error('Allowed devices must be an array'));
    }

    // Validate array size (max 256 elements)
    if (allowedDevices.length > 256) {
        return callback(new Error('Allowed devices array cannot exceed 256 elements'));
    }

    var hashKey = kb.build(deviceId, KEY_SUFFIX);
    var flagKey = kb.build(deviceId, ENABLED_FLAG_SUFFIX);

    // Delete existing hash first (to handle removals)
    db.del(hashKey, function(error) {
        if (error) {
            return callback(error);
        }

        if (allowedDevices.length === 0) {
            // If empty array, remove the enabled flag
            db.del(flagKey, function(error2) {
                if (error2) {
                    return callback(error2);
                }
                callback(null);
            });
            return;
        }

        // Build hash data structure
        var hashData = {};
        allowedDevices.forEach(function(allowedDevice) {
            if (!allowedDevice || !allowedDevice.DeviceID) {
                return; // Skip invalid entries
            }

            var allowedDeviceId = allowedDevice.DeviceID;
            var currentLocationKey = allowedDeviceId + ':' + ACCESS_TYPE_CURRENT_LOCATION;
            var historyKey = allowedDeviceId + ':' + ACCESS_TYPE_HISTORY;

            hashData[currentLocationKey] = (allowedDevice.hasCurrentLocationAccess === true) ? 'true' : 'false';
            hashData[historyKey] = (allowedDevice.hasHistoryAccess === true) ? 'true' : 'false';
        });

        // Set hash fields sequentially
        var hashFields = Object.keys(hashData);
        
        if (hashFields.length > 0) {
            var chain = seq();
            
            // Set each field-value pair
            hashFields.forEach(function(field) {
                chain.seq(function() {
                    db.hset(hashKey, field, hashData[field], this);
                });
            });
            
            // Set enabled flag after all fields are set
            chain.seq(function() {
                db.set(flagKey, '1', this);
            });
            
            chain.catch(function(error) {
                callback(error);
            });
            
            chain.seq(function() {
                callback(null);
            });
        } else {
            // No valid devices, remove flag
            db.del(flagKey, callback);
        }
    });
}

/**
 * Check if requesting device has access to target device
 * @param {string} deviceId - The target device ID
 * @param {string} requestingDeviceId - The requesting device ID
 * @param {string} accessType - 'currentLocation' or 'history'
 * @param {function} callback - Callback function (error, hasAccess)
 */
function checkAccess(deviceId, requestingDeviceId, accessType, callback) {
    if (!deviceId) {
        return callback(new errors.BadRequestError('Device ID is required'));
    }

    if (!requestingDeviceId || requestingDeviceId === '') {
        return callback(new errors.BadRequestError('RequestMiataruDeviceID is required'));
    }

    if (accessType !== ACCESS_TYPE_CURRENT_LOCATION && accessType !== ACCESS_TYPE_HISTORY) {
        return callback(new errors.BadRequestError('Invalid access type. Must be "currentLocation" or "history"'));
    }

    // Check if allowed devices list is enabled
    isAllowedDeviceEnabled(deviceId, function(error, isEnabled) {
        if (error) {
            return callback(error);
        }

        // If not enabled, return default behavior (backward compatible)
        // Both currentLocation and history default to allow when no list is set
        // This maintains backward compatibility - existing clients get data as before
        // The allowed devices list is an opt-in privacy feature
        if (!isEnabled) {
            return callback(null, true);
        }

        // Check hash for specific access type
        var hashKey = kb.build(deviceId, KEY_SUFFIX);
        var fieldKey = requestingDeviceId + ':' + accessType;

        db.hget(hashKey, fieldKey, function(error2, value) {
            if (error2) {
                return callback(error2);
            }

            // If field doesn't exist, device is not in allowed list
            if (value === null || value === undefined) {
                return callback(null, false);
            }

            // Check if value is true
            var hasAccess = (value === 'true' || value === '1');
            callback(null, hasAccess);
        });
    });
}

module.exports = {
    getAllowedDevices: getAllowedDevices,
    setAllowedDevices: setAllowedDevices,
    isAllowedDeviceEnabled: isAllowedDeviceEnabled,
    checkAccess: checkAccess,
    ACCESS_TYPE_CURRENT_LOCATION: ACCESS_TYPE_CURRENT_LOCATION,
    ACCESS_TYPE_HISTORY: ACCESS_TYPE_HISTORY
};
