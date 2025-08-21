var v1 = require('./v1');
var errors = require('../../errors');
var db = require('../../db');
var kb = require('../../utils/keyBuilder');
var seq = require('seq');

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

  // REST endpoint for dashboard to list devices
  app.get('/api/devices', function(req, res, next) {
      var pattern = kb.build('*', 'last');
      db.keys(pattern, function(err, keys) {
          if (err) return next(new errors.InternalServerError(err));

          var devices = [];
          var chain = seq();

          keys.forEach(function(key) {
              chain.par(function() {
                  var done = this;
                  db.get(key, function(error, data) {
                      if (error) return done(error);
                      var id = key.split(':')[1];
                      var last;
                      try {
                          last = JSON.parse(data);
                      } catch (e) {
                          last = null;
                      }
                      devices.push({device: id, last: last});
                      done();
                  });
              });
          });

          chain.seq(function() {
              res.send({devices: devices});
          }).catch(function(error) {
              next(new errors.InternalServerError(error));
          });
      });
  });

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
      app.all('/api/devices', function(req, res, next) { next(new errors.MethodNotSupportedError(req.method, req.path));});
  };
