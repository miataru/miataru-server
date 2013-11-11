var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('updateLocation', function() {

    it('should answer with ACK to simple update location request', function(done) {
        var updateData = calls.locationUpdateCall();

        var options = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: updateData
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;

            expect(response.statusCode).to.equal(200);
            expect(body.MiataruResponse).to.equal('ACK');
            expect(body.MiataruVerboseResponse).to.match(/><\)\)\).>/);

            done();
        });
    });

    it('should answer with error on empty locationUpdate request', function(done) {
        var options = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: {}
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(400);

            done();
        });
    });

    it('should answer with error on crippled locationUpdate request', function(done) {
        var options = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: {
                MiataruLocation: 'foo'
            }
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(400);

            done();
        });
    });

    it('should answer with a method not supported error (405)', function(done) {
        var options = {
            followRedirect: false,
            url: serverUrl + '/v1/UpdateLocation',
            method: 'GET'
        };

        request.get(options,function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(405);
            done();
        });
    });

    it('should answer with a not found error (404)', function(done) {
        var options = {
            followRedirect: false,
            url: serverUrl + '/foobar',
            method: 'GET'
        };

        request(options,function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(404);
            done();
        });
    });

});
