var configuration = require('../configuration');
var errors = require('../errors');

var MAX_DEVICE_KEY_LENGTH = 256;

function RequestGetDeviceSlogan(data) {
    data = data || {};

    this._deviceId = data.DeviceID !== undefined ? data.DeviceID : null;
    this._requestDeviceID = data.RequestDeviceID !== undefined ? data.RequestDeviceID : null;
    this._requestDeviceKey = data.RequestDeviceKey !== undefined ? data.RequestDeviceKey : null;

    // Accept aliases for compatibility with existing naming.
    if (this._requestDeviceID === null && data.RequestMiataruDeviceID !== undefined) {
        this._requestDeviceID = data.RequestMiataruDeviceID;
    }
    if (this._requestDeviceID === null && data.requestingDeviceID !== undefined) {
        this._requestDeviceID = data.requestingDeviceID;
    }
    if (this._requestDeviceKey === null && data.RequestMiataruDeviceKey !== undefined) {
        this._requestDeviceKey = data.RequestMiataruDeviceKey;
    }
    if (this._requestDeviceKey === null && data.requestingDeviceKey !== undefined) {
        this._requestDeviceKey = data.requestingDeviceKey;
    }

    this._validate();
}

RequestGetDeviceSlogan.prototype.deviceId = function() {
    return this._deviceId;
};

RequestGetDeviceSlogan.prototype.requestDeviceID = function() {
    return this._requestDeviceID;
};

RequestGetDeviceSlogan.prototype.requestDeviceKey = function() {
    return this._requestDeviceKey;
};

RequestGetDeviceSlogan.prototype.requestVisitorObject = function(targetDeviceID) {
    if (configuration.addEmptyVisitorDeviceIDtoVisitorHistory === false && this._requestDeviceID === '') {
        return null;
    }

    if (targetDeviceID && this._requestDeviceID === targetDeviceID) {
        return null;
    }

    return {
        DeviceID: this._requestDeviceID,
        TimeStamp: Date.now()
    };
};

RequestGetDeviceSlogan.prototype._validate = function() {
    if (this._deviceId === null || this._deviceId === undefined || this._deviceId === '') {
        throw new errors.BadRequestError('missing DeviceID');
    }

    if (this._requestDeviceID === null || this._requestDeviceID === undefined || this._requestDeviceID === '') {
        throw new errors.BadRequestError('missing RequestDeviceID');
    }

    if (this._requestDeviceKey === null || this._requestDeviceKey === undefined || this._requestDeviceKey === '') {
        throw new errors.BadRequestError('missing RequestDeviceKey');
    }

    if (typeof this._requestDeviceKey !== 'string') {
        throw new errors.BadRequestError('RequestDeviceKey must be a string');
    }

    if (this._requestDeviceKey.length > MAX_DEVICE_KEY_LENGTH) {
        throw new errors.BadRequestError('RequestDeviceKey must not exceed 256 characters');
    }
};

module.exports = RequestGetDeviceSlogan;
