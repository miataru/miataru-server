var errors = require('../errors');

function RequestLocationHistory(data) {
    data = data || {};

    this._device = data.Device || null;
    this._amount = +data.Amount || null;

    if(this._device === null || this._amount === null) {
        throw new errors.BadRequestError('missing device or amount');
    }
}

RequestLocationHistory.prototype.device = function() {
    return this._device;
};

RequestLocationHistory.prototype.amount = function() {
    return this._amount;
};

module.exports = RequestLocationHistory;