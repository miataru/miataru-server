var errors = require('../errors');

function normalizeHistoryData(data) {
    var normalized = {};
    var sources = Array.isArray(data) ? data : [data];

    sources.forEach(function(item) {
        if (!item || typeof item !== 'object') {
            return;
        }

        Object.keys(item).forEach(function(key) {
            var normalizedKey = key.toLowerCase();

            if (normalized[normalizedKey] === undefined) {
                normalized[normalizedKey] = item[key];
            }
        });
    });

    return normalized;
}

function RequestLocationHistory(data) {
    data = data || {};

    var normalized = normalizeHistoryData(data);

    var device = normalized.device;
    var amountRaw = normalized.amount;

    if (device === undefined || device === null || device === '') {
        device = null;
    }

    var amount = null;
    if (amountRaw !== undefined && amountRaw !== null && amountRaw !== '') {
        amount = Number(amountRaw);

        if (!isFinite(amount) || amount <= 0) {
            amount = null;
        }
    }

    this._device = device;
    this._amount = amount;

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