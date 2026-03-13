var errors = require('../errors');
var validation = require('../utils/inputValidation');

function RequestVisitorHistory(data) {
    data = data || {};

    this._device = data.Device || null;
    this._amount = +data.Amount || null;
    // DeviceKey is optional (API 1.1 feature) - can be null, empty, or undefined
    this._deviceKey = validation.normalizeOptionalDeviceKey(data.DeviceKey, 'DeviceKey');

    if(this._device === null || this._amount === null) {
        throw new errors.BadRequestError('missing device or amount');
    }

    validation.ensureDeviceIdAllowed(this._device, 'Device');
}

RequestVisitorHistory.prototype.device = function() {
    return this._device;
};

RequestVisitorHistory.prototype.amount = function() {
    return this._amount;
};

RequestVisitorHistory.prototype.deviceKey = function() {
    return this._deviceKey;
};

module.exports = RequestVisitorHistory;
