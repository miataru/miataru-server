function ResponseVisitorHistory(size, maxNumber, list) {
    this._size = size;
    this._visitorsList = list;
    this._maxNumber = maxNumber;
}

ResponseVisitorHistory.prototype.data = function() {
    return {
        MiataruServerConfig: {
            MaximumNumberOfVisitorHistory: this._maxNumber,
            AvailableVisitorHistory: this._size
        },
        MiataruVisitors: this._visitorsList
    };
};

module.exports = ResponseVisitorHistory;
