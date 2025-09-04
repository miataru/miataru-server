var errors = require('../errors');

function RequestDevice(data) {
    if (!data) {
        throw new errors.BadRequestError('missing data');
    }
    
    this._device = data.Device;

    if(this._device === null || this._device === undefined || this._device === '') {
        throw new errors.BadRequestError('missing device');
    }
}

RequestDevice.prototype.device = function() {
    return this._device;
};

module.exports = RequestDevice;