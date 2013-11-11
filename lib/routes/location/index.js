var v1 = require('./v1');
var errors = require('../../errors');

module.exports.install = function(app) {

    ///////////////////////////////////////////
    ///// API Version 1 ///////////////////////
    ///////////////////////////////////////////
    app.post('/v1/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/v1/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/v1/GetLocationHistory', v1.inputParser, v1.getLocationHistory);

    app.all('/v1/UpdateLocation', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/v1/GetLocation', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/v1/GetLocationHistory', function(req, res, next) { console.log( 'df' ); next(new errors.MethodNotSupportedError(req.method, req.path));});
};
