var configuration = require('../configuration');
var errors = require('../errors');

function RequestConfigGetLocation(data) {
    data = data || {};

    this._requestMiataruDeviceID = data.RequestMiataruDeviceID || null;
    this._speed = data.Speed !== undefined ? parseFloat(data.Speed) : undefined;
    this._batteryLevel = data.BatteryLevel !== undefined ? parseFloat(data.BatteryLevel) : undefined;
    this._altitude = data.Altitude !== undefined ? parseFloat(data.Altitude) : undefined;

    if (this._requestMiataruDeviceID === null)
    {
      this._requestMiataruDeviceID = "";
    }
}

RequestConfigGetLocation.prototype.requestMiataruDeviceID = function() {
    return this._requestMiataruDeviceID;
};

RequestConfigGetLocation.prototype.requestMiataruVisitorObject = function() {

    if (configuration.addEmptyVisitorDeviceIDtoVisitorHistory == false && this._requestMiataruDeviceID == "")
    {
        return null;
    }

    this._VisitorObject = {};
    this._VisitorObject.DeviceID = this._requestMiataruDeviceID;
    this._VisitorObject.TimeStamp = Date.now();

    if(this._speed !== undefined && this._speed !== null) {
        this._VisitorObject.Speed = this._speed;
    }

    if(this._batteryLevel !== undefined && this._batteryLevel !== null) {
        this._VisitorObject.BatteryLevel = this._batteryLevel;
    }

    if(this._altitude !== undefined && this._altitude !== null) {
        this._VisitorObject.Altitude = this._altitude;
    }

    return this._VisitorObject;
};

module.exports = RequestConfigGetLocation;
