var RequestConfig = require('../../../models/RequestConfig');
var RequestConfigGetLocation = require('../../../models/RequestConfigGetLocation');
var RequestLocation = require('../../../models/RequestLocation');
var RequestDevice = require('../../../models/RequestDevice');
var RequestLocationHistory = require('../../../models/RequestLocationHistory');
var RequestVisitorHistory = require('../../../models/RequestVisitorHistory');

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
        }
    }
    catch(error) {
        nextError = error;
    }

    next(nextError);
};

function parseUpdateLocation(req) {
    var locations = req.body['MiataruLocation'];

    if(!locations || !Array.isArray(locations)) {
        locations = [{}];
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
