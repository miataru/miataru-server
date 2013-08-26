var errors = require('../errors');

function RequestDevice(data) {
    this._device = data.Device || null;

    if(this._device) {
        throw new errors.BadRequestError('missing device');
    }
}

RequestDevice.prototype.device = function() {
    return this._device;
};

module.exports = RequestDevice;