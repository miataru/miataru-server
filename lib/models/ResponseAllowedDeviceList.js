function ResponseAllowedDeviceList(deviceId, isAllowedDeviceListEnabled, allowedDevices) {
    this._deviceId = deviceId;
    this._isAllowedDeviceListEnabled = isAllowedDeviceListEnabled === true;
    this._allowedDevices = Array.isArray(allowedDevices) ? allowedDevices : [];
}

ResponseAllowedDeviceList.prototype.data = function() {
    return {
        MiataruAllowedDeviceList: {
            DeviceID: this._deviceId,
            IsAllowedDeviceListEnabled: this._isAllowedDeviceListEnabled,
            allowedDevices: this._allowedDevices
        }
    };
};

module.exports = ResponseAllowedDeviceList;
