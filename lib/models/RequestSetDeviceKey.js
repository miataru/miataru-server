var errors = require('../errors');

function RequestSetDeviceKey(data) {
    data = data || {};

    this._deviceId = data.DeviceID !== undefined ? data.DeviceID : null;
    // CurrentDeviceKey is optional - can be null/empty for first-time setup
    this._currentDeviceKey = data.CurrentDeviceKey !== undefined ? (data.CurrentDeviceKey || null) : null;
    this._newDeviceKey = data.NewDeviceKey !== undefined ? data.NewDeviceKey : null;

    this._validate();
}

RequestSetDeviceKey.prototype.deviceId = function() {
    return this._deviceId;
};

RequestSetDeviceKey.prototype.currentDeviceKey = function() {
    return this._currentDeviceKey;
};

RequestSetDeviceKey.prototype.newDeviceKey = function() {
    return this._newDeviceKey;
};

RequestSetDeviceKey.prototype._validate = function() {
    if (this._deviceId === null || this._deviceId === undefined || this._deviceId === '') {
        throw new errors.BadRequestError('missing DeviceID');
    }

    if (this._newDeviceKey === null || this._newDeviceKey === undefined) {
        throw new errors.BadRequestError('missing NewDeviceKey');
    }

    // Validate NewDeviceKey is a string
    if (typeof this._newDeviceKey !== 'string') {
        throw new errors.BadRequestError('NewDeviceKey must be a string');
    }

    // Validate NewDeviceKey length (max 256 characters unicode)
    if (this._newDeviceKey.length > 256) {
        throw new errors.BadRequestError('NewDeviceKey must not exceed 256 characters');
    }
};

module.exports = RequestSetDeviceKey;
