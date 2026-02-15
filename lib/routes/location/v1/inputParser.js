var RequestConfig = require('../../../models/RequestConfig');
var RequestConfigGetLocation = require('../../../models/RequestConfigGetLocation');
var RequestLocation = require('../../../models/RequestLocation');
var RequestDevice = require('../../../models/RequestDevice');
var RequestLocationHistory = require('../../../models/RequestLocationHistory');
var RequestVisitorHistory = require('../../../models/RequestVisitorHistory');
var RequestSetDeviceKey = require('../../../models/RequestSetDeviceKey');
var RequestSetAllowedDeviceList = require('../../../models/RequestSetAllowedDeviceList');
var RequestSetDeviceSlogan = require('../../../models/RequestSetDeviceSlogan');
var RequestGetDeviceSlogan = require('../../../models/RequestGetDeviceSlogan');

module.exports = function(req, res, next) {
    req.MIATARU = req.MIATARU || {};

    var nextError;

    try {
        switch(req.path) {
            case '/UpdateLocation':
            case '/v1/UpdateLocation':
                parseUpdateLocation(req);
                break;
            case '/GetLocation':
            case '/v1/GetLocation':
                parseGetLocations(req);
                break;
            case '/GetLocationGeoJSON':
            case '/v1/GetLocationGeoJSON':
                parseGetLocationsGeoJSON(req);
                break;
            case '/GetLocationHistory':
            case '/v1/GetLocationHistory':
                parseGetLocationHistory(req);
                break;
            case '/v1/GetVisitorHistory':
            case '/GetVisitorHistory':
                parseGetVisitorHistory(req);
                break;
            case '/DeleteLocation':
            case '/v1/DeleteLocation':
                parseDeleteLocation(req);
                break;
            case '/setDeviceKey':
            case '/v1/setDeviceKey':
                parseSetDeviceKey(req);
                break;
            case '/setAllowedDeviceList':
            case '/v1/setAllowedDeviceList':
                parseSetAllowedDeviceList(req);
                break;
            case '/setDeviceSlogan':
            case '/v1/setDeviceSlogan':
                parseSetDeviceSlogan(req);
                break;
            case '/getDeviceSlogan':
            case '/v1/getDeviceSlogan':
                parseGetDeviceSlogan(req);
                break;
        }
    }
    catch(error) {
        nextError = error;
    }

    next(nextError);
};

function parseUpdateLocation(req) {
    var locations = req.body['MiataruLocation'];

    if(!locations) {
        locations = [{}];
    } else if (!Array.isArray(locations)) {
        // Backward compatibility: wrap single object in array
        locations = [locations];
    }

    req.MIATARU.config = new RequestConfig(req.body['MiataruConfig'] || {});
    req.MIATARU.locations = locations.map(function(location) {
        return new RequestLocation(location);
    });
}

function parseGetLocations(req) {
    var locations = req.body['MiataruGetLocation'];

    if(!locations || !Array.isArray(locations)) {
        locations = [{}];
    }

    req.MIATARU.config = new RequestConfigGetLocation(req.body['MiataruConfig'] || {});
    req.MIATARU.devices = locations.map(function(device) {
        return new RequestDevice(device);
    });
}

function parseGetLocationsGeoJSON(req) {
    var locations = req.body['MiataruGetLocation'];

    if(!locations || !Array.isArray(locations)) {
        locations = [{}];
    }

    req.MIATARU.devices = locations.map(function(device) {
        return new RequestDevice(device);
    });
}

function parseGetLocationHistory(req) {
    req.MIATARU.config = new RequestConfigGetLocation(req.body['MiataruConfig'] || {});
    req.MIATARU.request = new RequestLocationHistory(req.body['MiataruGetLocationHistory'] || {});
}

function parseGetVisitorHistory(req) {
    req.MIATARU.request = new RequestVisitorHistory(req.body['MiataruGetVisitorHistory'] || {});
}

function parseDeleteLocation(req) {
    req.MIATARU.request = new RequestDevice(req.body['MiataruDeleteLocation'] || {});
}

function parseSetDeviceKey(req) {
    req.MIATARU.request = new RequestSetDeviceKey(req.body['MiataruSetDeviceKey'] || {});
}

function parseSetAllowedDeviceList(req) {
    req.MIATARU.request = new RequestSetAllowedDeviceList(req.body['MiataruSetAllowedDeviceList'] || {});
}

function parseSetDeviceSlogan(req) {
    req.MIATARU.request = new RequestSetDeviceSlogan(req.body['MiataruSetDeviceSlogan'] || {});
}

function parseGetDeviceSlogan(req) {
    req.MIATARU.request = new RequestGetDeviceSlogan(req.body['MiataruGetDeviceSlogan'] || {});
}
