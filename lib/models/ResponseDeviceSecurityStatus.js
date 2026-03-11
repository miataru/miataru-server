function ResponseDeviceSecurityStatus(deviceId, hasDeviceKey, isAllowedDeviceListEnabled) {
    this._deviceId = deviceId;
    this._hasDeviceKey = hasDeviceKey === true;
    this._isAllowedDeviceListEnabled = isAllowedDeviceListEnabled === true;
}

ResponseDeviceSecurityStatus.prototype.data = function() {
    return {
        MiataruDeviceSecurityStatus: {
            DeviceID: this._deviceId,
            HasDeviceKey: this._hasDeviceKey,
            IsAllowedDeviceListEnabled: this._isAllowedDeviceListEnabled
        }
    };
};

module.exports = ResponseDeviceSecurityStatus;
