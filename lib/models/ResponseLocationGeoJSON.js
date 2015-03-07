function ResponseLocationGeoJSON(list) {
    this._locationsList = list || [];
}

ResponseLocationGeoJSON.prototype.pushLocation = function(location) {
    this._locationsList.push(location);
};

ResponseLocationGeoJSON.prototype.data = function() {
    return {
        geometry: {
            type: "Point",
            coordinates: [parseFloat(this._locationsList[0].Latitude),parseFloat(this._locationsList[0].Longitude)]
        },
        type: "Feature",
        properties: {
            name: this._locationsList[0].Device
        }
    };
};

module.exports = ResponseLocationGeoJSON;
