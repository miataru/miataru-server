var errors = require('../errors');

var MAX_DEVICE_KEY_LENGTH = 256;

function ensureDeviceIdAllowed(value, fieldName) {
    if (typeof value === 'string' && value.indexOf(':') !== -1) {
        throw new errors.BadRequestError((fieldName || 'DeviceID') + ' must not contain ":"');
    }

    return value;
}

function normalizeOptionalDeviceKey(value, fieldName) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value !== 'string') {
        throw new errors.BadRequestError((fieldName || 'DeviceKey') + ' must be a string');
    }

    if (value.length > MAX_DEVICE_KEY_LENGTH) {
        throw new errors.BadRequestError((fieldName || 'DeviceKey') + ' must not exceed 256 characters');
    }

    return value;
}

function normalizeRequiredDeviceKey(value, fieldName) {
    var normalizedFieldName = fieldName || 'DeviceKey';

    if (value === undefined || value === null || value === '') {
        throw new errors.BadRequestError('missing ' + normalizedFieldName);
    }

    return normalizeOptionalDeviceKey(value, normalizedFieldName);
}

function validateNumericField(value, fieldName, options) {
    options = options || {};

    if (value === undefined || value === null) {
        if (options.required === true) {
            throw new errors.BadRequestError(fieldName + ' is required');
        }

        return null;
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new errors.BadRequestError(fieldName + ' must be numeric');
    }

    if (typeof value === 'string' && value.trim() === '') {
        throw new errors.BadRequestError(fieldName + ' must be numeric');
    }

    var numeric = Number(value);

    if (!isFinite(numeric)) {
        throw new errors.BadRequestError(fieldName + ' must be numeric');
    }

    if (options.integer === true && Math.floor(numeric) !== numeric) {
        throw new errors.BadRequestError(fieldName + ' must be an integer');
    }

    if (typeof options.min === 'number' && numeric < options.min) {
        throw new errors.BadRequestError(fieldName + ' must be at least ' + options.min);
    }

    if (typeof options.max === 'number' && numeric > options.max) {
        throw new errors.BadRequestError(fieldName + ' must be at most ' + options.max);
    }

    return numeric;
}

module.exports = {
    MAX_DEVICE_KEY_LENGTH: MAX_DEVICE_KEY_LENGTH,
    ensureDeviceIdAllowed: ensureDeviceIdAllowed,
    normalizeOptionalDeviceKey: normalizeOptionalDeviceKey,
    normalizeRequiredDeviceKey: normalizeRequiredDeviceKey,
    validateNumericField: validateNumericField
};
