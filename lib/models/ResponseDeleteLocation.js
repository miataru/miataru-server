function ResponseDeleteLocation(deviceId, deletedCount) {
    this._deviceId = deviceId;
    this._deletedCount = deletedCount;
}

ResponseDeleteLocation.prototype.data = function() {
    return {
        MiataruResponse: 'ACK',
        MiataruVerboseResponse: 'Location data deleted for device: ' + this._deviceId,
        MiataruDeletedCount: this._deletedCount
    };
};

module.exports = ResponseDeleteLocation;
