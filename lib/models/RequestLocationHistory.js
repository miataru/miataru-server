var errors = require('../errors');

function flattenHistorySources(source) {
    if (source === null || source === undefined) {
        return [];
    }

    if (typeof source === 'string') {
        try {
            return flattenHistorySources(JSON.parse(source));
        } catch (parseError) {
            return [];
        }
    }

    if (Array.isArray(source)) {
        return source.reduce(function(list, item) {
            return list.concat(flattenHistorySources(item));
        }, []);
    }

    if (typeof source === 'object') {
        return [source];
    }

    return [];
}

function pickCaseInsensitive(entries, keyName) {
    var normalizedKey = keyName.toLowerCase();

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        if (!entry || typeof entry !== 'object') {
            continue;
        }

        if (Object.prototype.hasOwnProperty.call(entry, keyName) && entry[keyName] !== undefined) {
            return entry[keyName];
        }

        var keys = Object.keys(entry);

        for (var j = 0; j < keys.length; j++) {
            var candidate = keys[j];

            if (candidate && candidate.toLowerCase() === normalizedKey && entry[candidate] !== undefined) {
                return entry[candidate];
            }
        }
    }

    return undefined;
}

function RequestLocationHistory(data) {
    var entries = flattenHistorySources(data || {});

    if (entries.length === 0 && data && typeof data === 'object') {
        entries = [data];
    }

    var device = pickCaseInsensitive(entries, 'Device');
    var amountRaw = pickCaseInsensitive(entries, 'Amount');

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
