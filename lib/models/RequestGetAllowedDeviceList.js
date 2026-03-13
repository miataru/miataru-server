var errors = require('../errors');
var validation = require('../utils/inputValidation');

function RequestGetAllowedDeviceList(data) {
    data = data || {};

    this._deviceId = data.DeviceID !== undefined ? data.DeviceID : null;
    this._deviceKey = data.DeviceKey !== undefined ? data.DeviceKey : null;

    this._validate();
}

RequestGetAllowedDeviceList.prototype.deviceId = function() {
    return this._deviceId;
};

RequestGetAllowedDeviceList.prototype.deviceKey = function() {
    return this._deviceKey;
};

RequestGetAllowedDeviceList.prototype._validate = function() {
    if (this._deviceId === null || this._deviceId === undefined || this._deviceId === '') {
        throw new errors.BadRequestError('missing DeviceID');
    }

    validation.ensureDeviceIdAllowed(this._deviceId, 'DeviceID');
    this._deviceKey = validation.normalizeRequiredDeviceKey(this._deviceKey, 'DeviceKey');
};

module.exports = RequestGetAllowedDeviceList;
