var errors = require('../errors');

function RequestConfigGetLocation(data) {
    data = data || {};

    this._requestMiataruDeviceID = data.RequestMiataruDeviceID || null;

    if (this._requestMiataruDeviceID === null)
    {
      this._requestMiataruDeviceID = "";
    }
}

RequestConfigGetLocation.prototype.requestMiataruDeviceID = function() {
    return this._requestMiataruDeviceID;
};

RequestConfigGetLocation.prototype.requestMiataruVisitorObject = function() {

    this._VisitorObject = {};
    this._VisitorObject.DeviceID = this._requestMiataruDeviceID;
    this._VisitorObject.TimeStamp = Math.round(+new Date()/1000);

    return this._VisitorObject;
};

module.exports = RequestConfigGetLocation;
