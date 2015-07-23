var errors = require('../errors');

function RequestVisitorHistory(data) {
    data = data || {};

    this._device = data.Device || null;
    this._amount = +data.Amount || null;

    if(this._device === null || this._amount === null) {
        throw new errors.BadRequestError('missing device or amount');
    }
}

RequestVisitorHistory.prototype.device = function() {
    return this._device;
};

RequestVisitorHistory.prototype.amount = function() {
    return this._amount;
};

module.exports = RequestVisitorHistory;
