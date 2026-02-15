var v1 = require('./v1');
var errors = require('../../errors');

module.exports.install = function(app) {

    ///////////////////////////////////////////
    ///// API Version 1 ///////////////////////
    ///////////////////////////////////////////
    app.post('/v1/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/v1/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/v1/GetLocationGeoJSON', v1.inputParser, v1.getLocationGeoJSON);
    app.get('/v1/GetLocationGeoJSON/:id?',  function(req, res){
        v1.getLocationGeoJSONGET(req.params.id, res,null);
    });
    app.post('/v1/GetLocationHistory', v1.inputParser, v1.getLocationHistory);
    app.post('/v1/GetVisitorHistory', v1.inputParser, v1.getVisitorHistory);
    app.post('/v1/DeleteLocation', v1.inputParser, v1.deleteLocation);
    app.post('/v1/setDeviceKey', v1.inputParser, v1.setDeviceKey);
    app.post('/v1/setAllowedDeviceList', v1.inputParser, v1.setAllowedDeviceList);
    app.post('/v1/setDeviceSlogan', v1.inputParser, v1.setDeviceSlogan);
    app.post('/v1/getDeviceSlogan', v1.inputParser, v1.getDeviceSlogan);

    ///////////////////////////////////////////
    ///// API current /////////////////////////
    ///////////////////////////////////////////
    app.post('/UpdateLocation', v1.inputParser, v1.updateLocation);
    app.post('/GetLocation', v1.inputParser, v1.getLocation);
    app.post('/GetLocationGeoJSON', v1.inputParser, v1.getLocationGeoJSON);
    app.get('/GetLocationGeoJSON/:id?',  function(req, res){
        v1.getLocationGeoJSONGET(req.params.id, res,null);
    });
    app.post('/GetLocationHistory', v1.inputParser, v1.getLocationHistory);
    app.post('/GetVisitorHistory', v1.inputParser, v1.getVisitorHistory);
    app.post('/DeleteLocation', v1.inputParser, v1.deleteLocation);
    app.post('/setDeviceKey', v1.inputParser, v1.setDeviceKey);
    app.post('/setAllowedDeviceList', v1.inputParser, v1.setAllowedDeviceList);
    app.post('/setDeviceSlogan', v1.inputParser, v1.setDeviceSlogan);
    app.post('/getDeviceSlogan', v1.inputParser, v1.getDeviceSlogan);

    ///////////////////////////////////////////
    ///// non-Post /////////////////////////
    ///////////////////////////////////////////
    function handleUnsupportedMethod(req, res, next) {
        if (req.method === 'OPTIONS') {
            return res.status(204).end();
        }

        next(new errors.MethodNotSupportedError(req.method, req.path));
    }

    app.all('/v1/UpdateLocation', handleUnsupportedMethod);
    app.all('/v1/GetLocation', handleUnsupportedMethod);
    app.all('/v1/GetLocationGeoJSON', handleUnsupportedMethod);
    app.all('/v1/GetLocationHistory', handleUnsupportedMethod);
    app.all('/v1/DeleteLocation', handleUnsupportedMethod);
    app.all('/v1/setDeviceKey', handleUnsupportedMethod);
    app.all('/v1/setAllowedDeviceList', handleUnsupportedMethod);
    app.all('/v1/GetVisitorHistory', handleUnsupportedMethod);
    app.all('/v1/setDeviceSlogan', handleUnsupportedMethod);
    app.all('/v1/getDeviceSlogan', handleUnsupportedMethod);
    app.all('/UpdateLocation', handleUnsupportedMethod);
    app.all('/GetLocation', handleUnsupportedMethod);
    app.all('/GetLocationGeoJSON', handleUnsupportedMethod);
    app.all('/GetLocationHistory', handleUnsupportedMethod);
    app.all('/DeleteLocation', handleUnsupportedMethod);
    app.all('/GetVisitorHistory', handleUnsupportedMethod);
    app.all('/setDeviceKey', handleUnsupportedMethod);
    app.all('/setAllowedDeviceList', handleUnsupportedMethod);
    app.all('/setDeviceSlogan', handleUnsupportedMethod);
    app.all('/getDeviceSlogan', handleUnsupportedMethod);
};
