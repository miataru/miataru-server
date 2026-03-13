var errors = require('../errors');
var validation = require('../utils/inputValidation');

function RequestDevice(data) {
    if (!data) {
        throw new errors.BadRequestError('missing data');
    }
    
    this._device = data.Device;
    // DeviceKey is optional (API 1.1 feature) - can be null, empty, or undefined
    this._deviceKey = validation.normalizeOptionalDeviceKey(data.DeviceKey, 'DeviceKey');

    if(this._device === null || this._device === undefined || this._device === '') {
        throw new errors.BadRequestError('missing device');
    }

    validation.ensureDeviceIdAllowed(this._device, 'Device');
}

RequestDevice.prototype.device = function() {
    return this._device;
};

RequestDevice.prototype.deviceKey = function() {
    return this._deviceKey;
};

module.exports = RequestDevice;
