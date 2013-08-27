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
    req.MIATARU.locations = (req.body['MiataruLocation'] || [{}]).map(function(location) {
        return new RequestLocation(location);
    });
}

function parseGetLocations(req) {
    req.MIATARU.devices = (req.body['MiataruGetLocation'] || [{}]).map(function(device) {
        console.log( device );
        return new RequestDevice(device);
    });
}