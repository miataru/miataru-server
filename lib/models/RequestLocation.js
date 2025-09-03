var errors = require('../errors');

function RequestLocation(data) {
    data = data || {};

    this._device = data.Device || false;
    this._timestamp = data.Timestamp || false;
    this._longitude = data.Longitude || false;
    this._latitude = data.Latitude || false;
    this._horizontalAccuracy = data.HorizontalAccuracy || false;
    this._speed = data.Speed !== undefined ? data.Speed : -1;
    this._batteryLevel = data.BatteryLevel !== undefined ? data.BatteryLevel : -1;
    this._altitude = data.Altitude !== undefined ? data.Altitude : -1;

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
    var data = {
        Device: this._device,
        Timestamp: this._timestamp,
        Longitude: this._longitude,
        Latitude: this._latitude,
        HorizontalAccuracy: this._horizontalAccuracy
    };
    
    // Only include new fields if they have valid values (not -1)
    if (this._speed !== -1) {
        data.Speed = this._speed;
    }
    if (this._batteryLevel !== -1) {
        data.BatteryLevel = this._batteryLevel;
    }
    if (this._altitude !== -1) {
        data.Altitude = this._altitude;
    }
    
    return data;
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