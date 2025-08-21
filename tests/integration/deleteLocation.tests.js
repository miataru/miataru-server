var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('deleteLocation', function() {

    var DEVICE = 'device-to-delete';

    before(function(done) {
        var updateData = calls.locationUpdateCall({
            config: calls.config({history: true, retentionTime: 100}),
            locations: [calls.location({device: DEVICE, timeStamp: 1})]
        });

        var options = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: updateData
        };

        request(options, function(error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    it('should delete location and history and respond with ACK', function(done) {
        var options = {
            url: serverUrl + '/v1/DeleteLocation',
            method: 'POST',
            json: calls.deleteLocationCall(DEVICE)
        };

        request(options, function(error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(200);
            expect(body.MiataruResponse).to.equal('ACK');

            var getLocationOptions = {
                url: serverUrl + '/v1/GetLocation',
                method: 'POST',
                json: calls.getLocationCall(DEVICE)
            };

            request(getLocationOptions, function(err2, res2, body2) {
                expect(err2).to.be.null;
                expect(body2.MiataruLocation[0]).to.be.null;

                var getHistoryOptions = {
                    url: serverUrl + '/v1/GetLocationHistory',
                    method: 'POST',
                    json: calls.getLocationHistoryCall(DEVICE, 10)
                };

                request(getHistoryOptions, function(err3, res3, body3) {
                    expect(err3).to.be.null;
                    expect(body3.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(0);
                    expect(body3.MiataruLocation.length).to.equal(0);
                    done();
                });
            });
        });
    });
});
