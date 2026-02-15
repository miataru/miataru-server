function ResponseDeviceSlogan(deviceId, slogan) {
    this._deviceId = deviceId;
    this._slogan = slogan;
}

ResponseDeviceSlogan.prototype.data = function() {
    return {
        MiataruDeviceSlogan: {
            DeviceID: this._deviceId,
            Slogan: this._slogan
        }
    };
};

module.exports = ResponseDeviceSlogan;
