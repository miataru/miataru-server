var RequestConfig = require('../../models/RequestConfig');
var RequestLocation = require('../../models/RequestLocation');
var RequestDevice = require('../../models/RequestDevice');

module.exports = function(req, res, next) {
    req.MIATARU = req.MIATARU || {};

    var nextError;

    try {
        switch(req.path) {
            case '/UpdateLocation':
                parseUpdateLocation(req);
                break;
            case '/GetLocation':
                parseGetLocations(req);
                break;
            case '/GetLocationHistory':
                //TODO
                break;
        }
    }
    catch(error) {
        nextError = error;
    }

    next(nextError);
};

function parseUpdateLocation(req) {
    req.MIATARU.config = new RequestConfig(req.body['MiataruConfig'] || {});
    req.MIATARU.locations = (req.body['MiataruLocation'] || [{}]).forEach(function(location) {
        return new RequestLocation(location);
    });
}

function parseGetLocation(req) {
    req.MIATARU.devices = (req.body['MiataruGetLocation'] || [{}]).forEach(function(device) {
        return new RequestDevice(device);
    });
}