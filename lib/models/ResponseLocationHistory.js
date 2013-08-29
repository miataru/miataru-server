function ResponseLocationHistory(size, maxNumber, list) {
    this._size = size;
    this._locationsList = list;
    this._maxNumber = maxNumber;
}

ResponseLocationHistory.prototype.data = function() {
    return {
        MiataruServerConfig: {
            MaximumNumberOfLocationUpdates: this._maxNumber,
            AvailableDeviceLocationUpdates: this._size
        },
        MiataruLocation: this._locationsList
    };
};

module.exports = ResponseLocationHistory;