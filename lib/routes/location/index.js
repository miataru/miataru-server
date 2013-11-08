var v1 = require('./v1');

module.exports.install = function(app) {

    ///////////////////////////////////////////
    ///// API Version 1 ///////////////////////
    ///////////////////////////////////////////
    app.post('/v1/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/v1/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/v1/GetLocationHistory', v1.inputParser, v1.getLocationHistory);

    //Backwards Compatability
    app.post('/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/GetLocationHistory', v1.inputParser, v1.getLocationHistory)

    //Documentation forwarding
    app.get('/v1/UpdateLocation', function(req, res, next){ res.redirect(301,'http://miataru.com/#tabr4')});
    app.get('/UpdateLocation', function(req, res, next){ res.redirect(301,'http://miataru.com/#tabr4')});
    app.get('/v1/GetLocation', function(req, res, next){ res.redirect(301,'http://miataru.com/#tabr4')});
    app.get('/GetLocation', function(req, res, next){ res.redirect(301,'http://miataru.com/#tabr4')});
    app.get('/v1/GetLocationHistory', function(req, res, next){ res.redirect(301,'http://miataru.com/#tabr4')});
    app.get('/GetLocationHistory', function(req, res, next){ res.redirect(301,'http://miataru.com/#tabr4')});
};
