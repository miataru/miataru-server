var errors = require('../errors');

function RequestLocationHistory(data) {
    data = data || {};

    this._device = data.Device || null;
    this._amount = +data.Amount || null;

    if (Object.prototype.hasOwnProperty.call(data, 'StartTimestamp')) {
        this._startTimestamp = +data.StartTimestamp;
        if (isNaN(this._startTimestamp)) {
            this._startTimestamp = null;
        }
    } else {
        this._startTimestamp = null;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'EndTimestamp')) {
        this._endTimestamp = +data.EndTimestamp;
        if (isNaN(this._endTimestamp)) {
            this._endTimestamp = null;
        }
    } else {
        this._endTimestamp = null;
    }

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

RequestLocationHistory.prototype.startTimestamp = function() {
    return this._startTimestamp;
};

RequestLocationHistory.prototype.endTimestamp = function() {
    return this._endTimestamp;
};

module.exports = RequestLocationHistory;