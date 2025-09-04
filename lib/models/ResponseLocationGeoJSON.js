function ResponseLocationGeoJSON(list) {
    this._locationsList = list || [];
}

ResponseLocationGeoJSON.prototype.pushLocation = function(location) {
    this._locationsList.push(location);
};

ResponseLocationGeoJSON.prototype.data = function() {
    if (this._locationsList[0] && this._locationsList[0].Latitude && this._locationsList[0].Longitude)
    {
        return {
            geometry: {
                type: "Point",
                coordinates: [parseFloat(this._locationsList[0].Longitude),parseFloat(this._locationsList[0].Latitude)]
            },
            type: "Feature",
            properties: {
                name: this._locationsList[0].Device,
                timestamp: this._locationsList[0].Timestamp,
                horizontalAccuracy: this._locationsList[0].HorizontalAccuracy,
                speed: this._locationsList[0].Speed,
                batteryLevel: this._locationsList[0].BatteryLevel,
                altitude: this._locationsList[0].Altitude
            }
        }
    };
    
    return {};
};

module.exports = ResponseLocationGeoJSON;
