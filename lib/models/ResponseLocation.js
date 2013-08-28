function ResponseLocation(list) {
    this._locationsList = list || [];
}

ResponseLocation.prototype.pushLocation = function(location) {
    this._locationsList.push(location);
};

ResponseLocation.prototype.data = function() {
    return {
        MiataruLocation: this._locationsList
    };
};

module.exports = ResponseLocation;