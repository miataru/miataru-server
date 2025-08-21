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

    it('should wait for redis ops when history is disabled', function(done) {
        var device = 'nohist';

        var withHistory = {
            MiataruConfig: calls.config({history: true}),
            MiataruLocation: [calls.location({device: device, longitude: '10', latitude: '20', timeStamp: '100'})]
        };

        request({url: serverUrl + '/v1/UpdateLocation', method: 'POST', json: withHistory}, function(err) {
            expect(err).to.be.null;

            var withoutHistory = {
                MiataruConfig: calls.config({history: false}),
                MiataruLocation: [calls.location({device: device, longitude: '30', latitude: '40', timeStamp: '200'})]
            };

            request({url: serverUrl + '/v1/UpdateLocation', method: 'POST', json: withoutHistory}, function(err2) {
                expect(err2).to.be.null;

                var getLocOpts = {
                    url: serverUrl + '/v1/GetLocation',
                    method: 'POST',
                    json: {MiataruGetLocation: [{Device: device}]}
                };

                var getHistOpts = {
                    url: serverUrl + '/v1/GetLocationHistory',
                    method: 'POST',
                    json: {MiataruGetLocationHistory: {Device: device, Amount: '25'}}
                };

                request(getLocOpts, function(err3, res3, body3) {
                    expect(err3).to.be.null;
                    expect(body3.MiataruLocation[0].Longitude).to.equal('30');

                    request(getHistOpts, function(err4, res4, body4) {
                        expect(err4).to.be.null;
                        expect(body4.MiataruLocation).to.be.an('array').that.is.empty;
                        done();
                    });
                });
            });
        });
    });

});
