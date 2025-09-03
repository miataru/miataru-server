var errors = require('../errors');

function RequestLocation(data) {
    data = data || {};

    this._device = data.Device || false;
    this._timestamp = data.Timestamp || false;
    this._longitude = data.Longitude || false;
    this._latitude = data.Latitude || false;
    this._horizontalAccuracy = data.HorizontalAccuracy || false;
    this._speed = data.Speed;
    this._batteryLevel = data.BatteryLevel;
    this._altitude = data.Altitude;

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

RequestLocation.prototype.speed = function() {
    return this._speed;
};

RequestLocation.prototype.batteryLevel = function() {
    return this._batteryLevel;
};

RequestLocation.prototype.altitude = function() {
    return this._altitude;
};

RequestLocation.prototype.data = function() {
    var result = {
        Device: this._device,
        Timestamp: this._timestamp,
        Longitude: this._longitude,
        Latitude: this._latitude,
        HorizontalAccuracy: this._horizontalAccuracy
    };

    if(this._speed !== undefined && this._speed !== null) {
        result.Speed = this._speed;
    }

    if(this._batteryLevel !== undefined && this._batteryLevel !== null) {
        result.BatteryLevel = this._batteryLevel;
    }

    if(this._altitude !== undefined && this._altitude !== null) {
        result.Altitude = this._altitude;
    }

    return result;
};

RequestLocation.prototype._validate = function() {
    var that = this;
    Object.keys(this).forEach(function(property) {
        if(that[property] === null) {
            throw new errors.BadRequestError('Missing RequestProperty ' + property + ' in location');
        }
    });
};

module.exports = RequestLocation;
