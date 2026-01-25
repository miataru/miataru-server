var errors = require('../errors');

function RequestSetAllowedDeviceList(data) {
    data = data || {};

    this._deviceId = data.DeviceID !== undefined ? data.DeviceID : null;
    this._deviceKey = data.DeviceKey !== undefined ? data.DeviceKey : null;
    this._allowedDevices = data.allowedDevices !== undefined ? data.allowedDevices : null;

    this._validate();
}

RequestSetAllowedDeviceList.prototype.deviceId = function() {
    return this._deviceId;
};

RequestSetAllowedDeviceList.prototype.deviceKey = function() {
    return this._deviceKey;
};

RequestSetAllowedDeviceList.prototype.allowedDevices = function() {
    return this._allowedDevices;
};

RequestSetAllowedDeviceList.prototype._validate = function() {
    if (this._deviceId === null || this._deviceId === undefined || this._deviceId === '') {
        throw new errors.BadRequestError('missing DeviceID');
    }

    if (this._deviceKey === null || this._deviceKey === undefined || this._deviceKey === '') {
        throw new errors.BadRequestError('missing DeviceKey');
    }

    if (this._allowedDevices === null || this._allowedDevices === undefined) {
        throw new errors.BadRequestError('missing allowedDevices');
    }

    if (!Array.isArray(this._allowedDevices)) {
        throw new errors.BadRequestError('allowedDevices must be an array');
    }

    // Validate array size (max 256 elements)
    if (this._allowedDevices.length > 256) {
        throw new errors.BadRequestError('allowedDevices array cannot exceed 256 elements');
    }

    // Validate each allowedDevice structure
    this._allowedDevices.forEach(function(allowedDevice, index) {
        if (!allowedDevice || typeof allowedDevice !== 'object') {
            throw new errors.BadRequestError('allowedDevices[' + index + '] must be an object');
        }

        if (!allowedDevice.DeviceID || typeof allowedDevice.DeviceID !== 'string') {
            throw new errors.BadRequestError('allowedDevices[' + index + '].DeviceID is required and must be a string');
        }

        // Validate boolean fields
        if (allowedDevice.hasCurrentLocationAccess !== undefined && typeof allowedDevice.hasCurrentLocationAccess !== 'boolean') {
            throw new errors.BadRequestError('allowedDevices[' + index + '].hasCurrentLocationAccess must be a boolean');
        }

        if (allowedDevice.hasHistoryAccess !== undefined && typeof allowedDevice.hasHistoryAccess !== 'boolean') {
            throw new errors.BadRequestError('allowedDevices[' + index + '].hasHistoryAccess must be a boolean');
        }

        // Set defaults if not provided
        if (allowedDevice.hasCurrentLocationAccess === undefined) {
            allowedDevice.hasCurrentLocationAccess = false;
        }

        if (allowedDevice.hasHistoryAccess === undefined) {
            allowedDevice.hasHistoryAccess = false;
        }
    });
};

module.exports = RequestSetAllowedDeviceList;
