var NoHistoryOneMinuteRetention = {
    "MiataruConfig":{
        "EnableLocationHistory":"False",
        "LocationDataRetentionTime":"1"
    },
    "MiataruLocation":[
        {
            "Device":"foo",
            "Timestamp":"1376735651302",
            "Longitude":"10.837502",
            "Latitude":"49.828925",
            "HorizontalAccuracy":"50.00"
        }
    ]
};

var History15MinuteRetention = {
    "MiataruConfig":{
        "EnableLocationHistory":"True",
        "LocationDataRetentionTime":"15"
    },
    "MiataruLocation":[
        {
            "Device":"bar",
            "Timestamp":"1376735651302",
            "Longitude":"10.837502",
            "Latitude":"49.828925",
            "HorizontalAccuracy":"50.00"
        }
    ]
};

var GetLocation = {
    "MiataruGetLocation":[
        {
            "Device":"bax"
        }
    ]
};

module.exports = {
    NoHistoryOneMinuteRetention: NoHistoryOneMinuteRetention,
    History15MinuteRetention: History15MinuteRetention,
    GetLocation: GetLocation
};