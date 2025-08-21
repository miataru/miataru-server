var expect = require('chai').expect;
var request = require('request');
var express = require('express');
var locationRoutes = require('../../lib/routes/location');
var db = require('../../lib/db');

// Helper to create server with patched db.get throwing error

describe('GetLocationGeoJSONGET error handling', function() {
    var server;
    var port;
    var originalGet;

    before(function(done) {
        var app = express();
        app.use(express.bodyParser());
        locationRoutes.install(app);

        // install error handler similar to server.js
        app.use(function(error, req, res, next) {
            res.send(error.statusCode || 500, {error: error.message});
        });

        originalGet = db.get;
        db.get = function(key, callback) {
            callback(new Error('fail'));
        };

        server = app.listen(0, function() {
            port = server.address().port;
            done();
        });
    });

    after(function(done) {
        db.get = originalGet;
        server.close(done);
    });

    it('should trigger error handler for versioned route', function(done) {
        request('http://localhost:' + port + '/v1/GetLocationGeoJSON/foo', function(err, res, body) {
            expect(res.statusCode).to.equal(500);
            expect(JSON.parse(body).error).to.equal('fail');
            done();
        });
    });

    it('should trigger error handler for unversioned route', function(done) {
        request('http://localhost:' + port + '/GetLocationGeoJSON/foo', function(err, res, body) {
            expect(res.statusCode).to.equal(500);
            expect(JSON.parse(body).error).to.equal('fail');
            done();
        });
    });
});

