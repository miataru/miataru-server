function ResponseLocationGeoJSON(list) {
    this._locationsList = list || [];
}

ResponseLocationGeoJSON.prototype.pushLocation = function(location) {
    this._locationsList.push(location);
};

ResponseLocationGeoJSON.prototype.data = function() {
    if (this._locationsList[0] && this._locationsList[0].Latitude && this._locationsList[0].Longitude)
    {
        var loc = this._locationsList[0];
        var properties = {
            name: loc.Device
        };

        if(loc.Speed !== undefined && loc.Speed !== null) {
            properties.Speed = loc.Speed;
        }

        if(loc.BatteryLevel !== undefined && loc.BatteryLevel !== null) {
            properties.BatteryLevel = loc.BatteryLevel;
        }

        if(loc.Altitude !== undefined && loc.Altitude !== null) {
            properties.Altitude = loc.Altitude;
        }

        return {
            geometry: {
                type: "Point",
                coordinates: [parseFloat(loc.Longitude), parseFloat(loc.Latitude)]
            },
            type: "Feature",
            properties: properties
        }
    };

    return {};
};

module.exports = ResponseLocationGeoJSON;
