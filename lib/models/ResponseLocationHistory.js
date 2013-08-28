function ResponseLocationHistory(size, list) {
    this._size = size;
    this._locationsList = list;
}

ResponseLocationHistory.prototype.data = function() {
    return {
        MiataruServerConfig: {
            MaximumNumberOfLocationUpdates: this._size
        },
        MiataruLocation: this._locationsList
    };
};

module.exports = ResponseLocationHistory;