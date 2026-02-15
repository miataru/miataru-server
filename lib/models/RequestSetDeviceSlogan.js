var errors = require('../errors');

var MAX_SLOGAN_LENGTH = 40;
var MAX_DEVICE_KEY_LENGTH = 256;
var CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/;

function RequestSetDeviceSlogan(data) {
    data = data || {};

    this._deviceId = data.DeviceID !== undefined ? data.DeviceID : null;
    this._deviceKey = data.DeviceKey !== undefined ? data.DeviceKey : null;
    this._slogan = data.Slogan !== undefined ? data.Slogan : null;

    this._validate();
}

RequestSetDeviceSlogan.prototype.deviceId = function() {
    return this._deviceId;
};

RequestSetDeviceSlogan.prototype.deviceKey = function() {
    return this._deviceKey;
};

RequestSetDeviceSlogan.prototype.slogan = function() {
    return this._slogan;
};

RequestSetDeviceSlogan.prototype._validate = function() {
    if (this._deviceId === null || this._deviceId === undefined || this._deviceId === '') {
        throw new errors.BadRequestError('missing DeviceID');
    }

    if (this._deviceKey === null || this._deviceKey === undefined || this._deviceKey === '') {
        throw new errors.BadRequestError('missing DeviceKey');
    }

    if (typeof this._deviceKey !== 'string') {
        throw new errors.BadRequestError('DeviceKey must be a string');
    }

    if (this._deviceKey.length > MAX_DEVICE_KEY_LENGTH) {
        throw new errors.BadRequestError('DeviceKey must not exceed 256 characters');
    }

    if (this._slogan === null || this._slogan === undefined) {
        throw new errors.BadRequestError('missing Slogan');
    }

    if (typeof this._slogan !== 'string') {
        throw new errors.BadRequestError('Slogan must be a string');
    }

    if (Array.from(this._slogan).length > MAX_SLOGAN_LENGTH) {
        throw new errors.BadRequestError('Slogan must not exceed 40 characters');
    }

    if (CONTROL_CHARS_REGEX.test(this._slogan)) {
        throw new errors.BadRequestError('Slogan contains invalid control characters');
    }
};

module.exports = RequestSetDeviceSlogan;
