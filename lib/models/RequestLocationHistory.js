var errors = require('../errors');

function normalizeHistoryData(data) {
    var normalized = {};
    var sources = Array.isArray(data) ? data : [data];

    function assignValue(key, value) {
        if (typeof key !== 'string') {
            return;
        }

        var normalizedKey = key.toLowerCase();

        if (normalized[normalizedKey] === undefined) {
            normalized[normalizedKey] = value;
        }
    }

    function collect(item) {
        if (item === null || item === undefined) {
            return;
        }

        if (typeof item === 'string') {
            try {
                collect(JSON.parse(item));
            } catch (parseError) {
                // If we cannot parse the string, ignore it and continue.
            }

            return;
        }

        if (Array.isArray(item)) {
            if (item.length === 2 && typeof item[0] === 'string') {
                assignValue(item[0], item[1]);
            } else {
                item.forEach(collect);
            }

            return;
        }

        if (typeof item === 'object') {
            Object.keys(item).forEach(function(key) {
                assignValue(key, item[key]);
            });
        }
    }

    sources.forEach(collect);

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