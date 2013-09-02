function location(options) {
    options = options || {};

    return {
        "Device": options.device || "bar",
        "Timestamp": options.timeStamp || "1376735651302",
        "Longitude": options.longitude || "10.837502",
        "Latitude": options.latitude || "49.828925",
        "HorizontalAccuracy": options.accuracy || "50.00"
    };
}

function config(options) {
    options = options || {};

    return {
        "EnableLocationHistory": options.enableLocationHistory || "True",
        "LocationDataRetentionTime": options.locationDateRetentionTime || "15"
    }
}

function locationUpdate(options) {
    options = options || {};

    return {
        "MiataruConfig": options.config || config(),
        "MiataruLocation": [
            options.locations || location()
        ]
    }
}

function getLocation(deviceName) {
    return {
        "MiataruGetLocation":[
            {
                "Device": deviceName || "foo"
            }
        ]
    };
}

module.exports = {
    getLocationCall: getLocation,
    locationUpdateCall: locationUpdate,
    config: config,
    location: location
};