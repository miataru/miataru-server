var errors = require('../errors');

function RequestLocation(data) {
    data = data || {};

    this._device = data.Device || null;
    this._timestamp = data.Timestamp || null;
    this._longitude = data.Longitude || null;
    this._latitude = data.Latitude || null;
    this._horizontalAccuracy = data.HorizontalAccuracy || null;

    this._validate();
}

RequestLocation.prototype.device = function() {
    return this._device;
};

RequestLocation.prototype.timestamp = function() {
    return this._timestamp;
};

RequestLocation.prototype.longitude = function() {
    return this._longitude;
};

RequestLocation.prototype.latitude = function() {
    return this._latitude;
};

RequestLocation.prototype.horizontalAccuracy = function() {
    return this._horizontalAccuracy;
};

RequestLocation.prototype.data = function() {
    return {
        Device: this._device,
        Timestamp: this._timestamp,
        Longitude: this._longitude,
        Latitude: this._latitude,
        HorizontalAccuracy: this._horizontalAccuracy
    };
};

RequestLocation.prototype._validate = function() {
    var that = this;
    Object.keys(this).forEach(function(property) {
        if(that[property] === null || that[property] === false) {
            throw new errors.BadRequestError('Missing RequestProperty ' + property + ' in location');
        }
    });
};

module.exports = RequestLocation;