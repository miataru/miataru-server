var v1 = require('./v1');
var errors = require('../../errors');

module.exports.install = function(app) {

    ///////////////////////////////////////////
    ///// API Version 1 ///////////////////////
    ///////////////////////////////////////////
    app.post('/v1/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/v1/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/v1/GetLocationGeoJSON', v1.inputParser, v1.getLocationGeoJSON);
    app.get('/v1/GetLocationGeoJSON/:id?',  function(req, res, next){
        v1.getLocationGeoJSONGET(req.params.id, res, next);
    });
    app.post('/v1/GetLocationHistory', v1.inputParser, v1.getLocationHistory);
    app.post('/v1/GetVisitorHistory', v1.inputParser, v1.getVisitorHistory);

    ///////////////////////////////////////////
    ///// API current /////////////////////////
    ///////////////////////////////////////////
    app.post('/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/GetLocationGeoJSON', v1.inputParser, v1.getLocationGeoJSON);
    app.get('/GetLocationGeoJSON/:id?',  function(req, res, next){
        v1.getLocationGeoJSONGET(req.params.id, res, next);
    });
    app.post('/GetLocationHistory', v1.inputParser, v1.getLocationHistory);
    app.post('/GetVisitorHistory', v1.inputParser, v1.getVisitorHistory);

    ///////////////////////////////////////////
    ///// non-Post /////////////////////////
    ///////////////////////////////////////////
    app.all('/v1/UpdateLocation', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/v1/GetLocation', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/v1/GetLocationGeoJSON', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/v1/GetLocationHistory', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/UpdateLocation', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/GetLocation', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/GetLocationGeoJSON', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/GetLocationHistory', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
    app.all('/GetVisitorHistory', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
};
