var errors = require('../errors');
var validation = require('../utils/inputValidation');

function assignNormalizedValue(target, key, value) {
    if (typeof key !== 'string') {
        throw new errors.BadRequestError('invalid GetLocationHistory key');
    }

    var normalizedKey = key.toLowerCase();

    if (normalizedKey !== 'device' && normalizedKey !== 'amount') {
        throw new errors.BadRequestError('invalid GetLocationHistory key: ' + key);
    }

    if (target[normalizedKey] !== undefined) {
        throw new errors.BadRequestError('duplicate GetLocationHistory key: ' + key);
    }

    target[normalizedKey] = value;
}

function collectNormalizedValue(target, item) {
    if (item === null || item === undefined) {
        return;
    }

    if (Array.isArray(item)) {
        if (item.length === 2 && typeof item[0] === 'string') {
            assignNormalizedValue(target, item[0], item[1]);
            return;
        }

        item.forEach(function(entry) {
            collectNormalizedValue(target, entry);
        });
        return;
    }

    if (typeof item === 'object') {
        Object.keys(item).forEach(function(key) {
            assignNormalizedValue(target, key, item[key]);
        });
        return;
    }

    throw new errors.BadRequestError('invalid GetLocationHistory payload');
}

function parseLegacyHistoryString(value) {
    if (value.indexOf(';') !== -1 || value.indexOf(',') !== -1 || value.indexOf(':') !== -1) {
        throw new errors.BadRequestError('GetLocationHistory legacy format must use "&" and "=" only');
    }

    var normalized = {};
    var fragments = value.split('&');

    fragments.forEach(function(fragment) {
        if (!fragment) {
            return;
        }

        var separatorIndex = fragment.indexOf('=');

        if (separatorIndex === -1) {
            throw new errors.BadRequestError('invalid GetLocationHistory legacy format');
        }

        var key = fragment.slice(0, separatorIndex).trim();
        var rawValue = fragment.slice(separatorIndex + 1).trim();

        if (!key) {
            throw new errors.BadRequestError('invalid GetLocationHistory legacy format');
        }

        assignNormalizedValue(normalized, key, rawValue);
    });

    return normalized;
}

function normalizeHistoryData(data) {
    if (typeof data === 'string') {
        var trimmed = data.trim();

        if (trimmed === '') {
            return {};
        }

        try {
            return normalizeHistoryData(JSON.parse(trimmed));
        } catch (parseError) {
            return parseLegacyHistoryString(trimmed);
        }
    }

    var normalized = {};
    collectNormalizedValue(normalized, data);
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
    }

    this._device = device;
    this._amount = amount;

    if(this._device === null || this._amount === null) {
        throw new errors.BadRequestError('missing device or amount');
    }

    if (typeof this._device !== 'string' || this._device === '') {
        throw new errors.BadRequestError('device must be a non-empty string');
    }

    validation.ensureDeviceIdAllowed(this._device, 'Device');
    validation.validateNumericField(this._amount, 'Amount', { integer: true, min: 1 });
}

RequestLocationHistory.prototype.device = function() {
    return this._device;
};

RequestLocationHistory.prototype.amount = function() {
    return this._amount;
};

module.exports = RequestLocationHistory;
