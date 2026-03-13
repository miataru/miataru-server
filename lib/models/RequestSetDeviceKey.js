var errors = require('../errors');
var validation = require('../utils/inputValidation');

function RequestSetDeviceKey(data) {
    data = data || {};

    this._deviceId = data.DeviceID !== undefined ? data.DeviceID : null;
    // CurrentDeviceKey is optional - can be null/empty for first-time setup
    this._currentDeviceKey = validation.normalizeOptionalDeviceKey(data.CurrentDeviceKey, 'CurrentDeviceKey');
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

    validation.ensureDeviceIdAllowed(this._deviceId, 'DeviceID');
    this._newDeviceKey = validation.normalizeRequiredDeviceKey(this._newDeviceKey, 'NewDeviceKey');
};

module.exports = RequestSetDeviceKey;
