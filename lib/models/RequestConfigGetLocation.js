var configuration = require('../configuration');
var errors = require('../errors');

function RequestConfigGetLocation(data) {
    data = data || {};

    this._requestMiataruDeviceID = data.RequestMiataruDeviceID;
    this._requestMiataruDeviceKey = data.RequestMiataruDeviceKey;

    // Accept legacy/lowercase aliases while keeping canonical API fields.
    if (this._requestMiataruDeviceID === undefined) {
        this._requestMiataruDeviceID = data.requestingDeviceID;
    }

    if (this._requestMiataruDeviceKey === undefined) {
        this._requestMiataruDeviceKey = data.requestingDeviceKey;
    }

    if (this._requestMiataruDeviceID === undefined || this._requestMiataruDeviceID === null) {
        this._requestMiataruDeviceID = null;
    }

    if (this._requestMiataruDeviceID === null)
    {
      this._requestMiataruDeviceID = "";
    }

    if (this._requestMiataruDeviceKey === undefined || this._requestMiataruDeviceKey === null) {
        this._requestMiataruDeviceKey = null;
    }
}

RequestConfigGetLocation.prototype.requestMiataruDeviceID = function() {
    return this._requestMiataruDeviceID;
};

RequestConfigGetLocation.prototype.requestMiataruDeviceKey = function() {
    return this._requestMiataruDeviceKey;
};

RequestConfigGetLocation.prototype.requestMiataruVisitorObject = function(targetDeviceID) {

    if (configuration.addEmptyVisitorDeviceIDtoVisitorHistory == false && this._requestMiataruDeviceID == "")
    {
        return null;
    }

    // Do not record visitor history if RequestMiataruDeviceID equals the target deviceID
    if (targetDeviceID && this._requestMiataruDeviceID === targetDeviceID)
    {
        return null;
    }

    this._VisitorObject = {};
    this._VisitorObject.DeviceID = this._requestMiataruDeviceID;
    this._VisitorObject.TimeStamp = Date.now();

    return this._VisitorObject;
};

module.exports = RequestConfigGetLocation;
