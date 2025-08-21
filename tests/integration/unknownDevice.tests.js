var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('unknown device id', function() {
    it('should return empty location array for GetLocation', function(done) {
        var options = {
            url: serverUrl + '/v1/GetLocation',
            method: 'POST',
            json: calls.getLocationCall('unknown-device')
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(200);
            expect(body.MiataruLocation).to.be.an('array').that.is.empty;
            done();
        });
    });

    it('should return empty object for GetLocationGeoJSON', function(done) {
        var options = {
            url: serverUrl + '/v1/GetLocationGeoJSON',
            method: 'POST',
            json: calls.getLocationCall('unknown-device')
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(200);
            expect(body).to.be.an('object').that.is.empty;
            done();
        });
    });

    it('should return empty object for GetLocationGeoJSONGET', function(done) {
        var options = {
            url: serverUrl + '/v1/GetLocationGeoJSON/unknown-device',
            method: 'GET',
            json: true
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(200);
            expect(body).to.be.an('object').that.is.empty;
            done();
        });
    });
});
