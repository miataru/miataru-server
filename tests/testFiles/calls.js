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
        "EnableLocationHistory": options.history !== undefined ? options.history+'' : "True",
        "LocationDataRetentionTime": options.retentionTime || "15"
    }
}

function locationUpdate(options) {
    options = options || {};

    return {
        "MiataruConfig": options.config || config(),
        "MiataruLocation": options.locations || location()
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

function getLocationHistory(device, amount) {
    return {
        "MiataruGetLocationHistory": {
            "Device": device || "7b8e6e0ee5296db345162dc2ef652c1350761823",
            "Amount": amount || "25"
        }
    }
}

module.exports = {
    getLocationHistoryCall: getLocationHistory,
    getLocationCall: getLocation,
    locationUpdateCall: locationUpdate,
    config: config,
    location: location
};