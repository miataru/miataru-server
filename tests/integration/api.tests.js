var seq = require('seq');
var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

function c(a) { console.log( require('util').inspect(a, null, 100) ); }

function completeChain(data, callback) {
//    c(data);
    seq()
            .seq('updateLocation', function() {
                var done = this;

                var options = {
                    url: serverUrl + '/UpdateLocation',
                    method: 'POST',
                    json: data.updateLocation
                };

                request(options, function (error, response, body) {
                    done(error, body);
                });
            })
            .seq('getLocation', function() {
                var done = this;

                var options = {
                    url: serverUrl + '/GetLocation',
                    method: 'POST',
                    json: data.getLocation
                };

                request(options, function (error, response, body) {
                    done(error, body);
                });
            })
            .seq('getLocationHistory', function() {
                var done = this;

                var options = {
                    url: serverUrl + '/GetLocationHistory',
                    method: 'POST',
                    json: data.getLocationHistory
                };

                request(options, function (error, response, body) {
                    done(error, body);
                });
            })
            .seq(function() {
                callback(null, {
                    updateLocation: this.vars.updateLocation,
                    getLocation: this.vars.getLocation,
                    getLocationHistory: this.vars.getLocationHistory
                })
            })
            .catch(callback);
}

describe('complete chain', function() {

    describe('no history, multiple locations', function() {
        var result;
        var DEVICE = 'foo1';

        before(function(done) {
            var data = {
                updateLocation: calls.locationUpdateCall({
                                    config: calls.config({history: false, retentionTime: 100}),
                                    locations: [
                                        calls.location({device: DEVICE, timeStamp: 1}),
                                        calls.location({device: DEVICE, timeStamp: 2}),
                                        calls.location({device: DEVICE, timeStamp: 3}),
                                        calls.location({device: DEVICE, timeStamp: 4}),
                                        calls.location({device: DEVICE, timeStamp: 5})
                                    ]
                                }),
                getLocation: calls.getLocationCall(DEVICE),
                getLocationHistory: calls.getLocationHistoryCall(DEVICE, 10)
            };

            completeChain(data, function(error, data) {
                result = data;
//c(data);
                done();
            });
        });

        it('should sucessfully call the api for the update', function() {
            expect(result.updateLocation.MiataruResponse).to.equal('ACK');
        });

        it('should ask the api for the last update (which is equals to the current location)', function() {
            expect(result.getLocation.MiataruLocation[0].Device).to.equal(DEVICE);
        });

        it('should only have stored the last update', function() {
            expect(result.getLocation.MiataruLocation[0].Timestamp).to.equal(5);
        });

        it('should return the correct number of maxStored items', function() {
            expect(result.getLocationHistory.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(3);
        });

        it('should return 0 elements', function() {
            expect(result.getLocationHistory.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(0);
        });

        it('should return 0 elements', function() {
            expect(result.getLocationHistory.MiataruLocation.length).to.equal(0);
        });

    });

});