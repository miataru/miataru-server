var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('getLocationHistory range queries', function() {

    it('should return locations within the given start and end timestamps', function(done) {
        var DEVICE = 'rangeDevice1';

        var updateData = calls.locationUpdateCall({
            config: calls.config({history: true, retentionTime: 100}),
            locations: [
                calls.location({device: DEVICE, timeStamp: 1}),
                calls.location({device: DEVICE, timeStamp: 2}),
                calls.location({device: DEVICE, timeStamp: 3}),
                calls.location({device: DEVICE, timeStamp: 4}),
                calls.location({device: DEVICE, timeStamp: 5})
            ]
        });

        var updateOptions = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: updateData
        };

        request(updateOptions, function(error) {
            expect(error).to.be.null;

            var getOptions = {
                url: serverUrl + '/v1/GetLocationHistory',
                method: 'POST',
                json: calls.getLocationHistoryCall(DEVICE, 10, 2, 4)
            };

            request(getOptions, function(err, response, body) {
                expect(err).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation.length).to.equal(3);
                var timestamps = body.MiataruLocation.map(function(loc) { return loc.Timestamp; });
                expect(timestamps).to.deep.equal([4,3,2]);
                done();
            });
        });
    });

    it('should respect only StartTimestamp when EndTimestamp is omitted', function(done) {
        var DEVICE = 'rangeDevice2';

        var updateData = calls.locationUpdateCall({
            config: calls.config({history: true, retentionTime: 100}),
            locations: [
                calls.location({device: DEVICE, timeStamp: 1}),
                calls.location({device: DEVICE, timeStamp: 2}),
                calls.location({device: DEVICE, timeStamp: 3}),
                calls.location({device: DEVICE, timeStamp: 4}),
                calls.location({device: DEVICE, timeStamp: 5})
            ]
        });

        var updateOptions = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: updateData
        };

        request(updateOptions, function(error) {
            expect(error).to.be.null;

            var getOptions = {
                url: serverUrl + '/v1/GetLocationHistory',
                method: 'POST',
                json: calls.getLocationHistoryCall(DEVICE, 10, 3)
            };

            request(getOptions, function(err, response, body) {
                expect(err).to.be.null;
                expect(response.statusCode).to.equal(200);
                var timestamps = body.MiataruLocation.map(function(loc) { return loc.Timestamp; });
                expect(timestamps).to.deep.equal([5,4,3]);
                done();
            });
        });
    });
});
