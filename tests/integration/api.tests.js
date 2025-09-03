/*
planned tests:

? update location \w no history \w multiple locations
   -> GetLocation shows last entry
   -> GetLocationHistory shows nothing

? update location \w history \w multiple locations
    -> GetLocation shows last of history
    -> GetLocationHistory shows complete history, shows number of entries

? update location \w history \w multiple locations (more than the config allows for)
    -> GetLocation shows last of history
    -> GetLocationHistory shows history (related to the config value), shows number of entries

? update location \w history \w multiple locations (more than the config allows for)
    -> GetLocation show last of history
    -> GetLocationHistory shows history (with constraints in the request), shows number of entries

 getLocation: no data
 getLocationHistory: no data

 UpdateLocation retentionTno ime
*/

var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

function c(a) { console.log( require('util').inspect(a, null, 100) ); }

function completeChain(data, version, callback) {
    version = version ? '/' + version : '';
    var results = {};

    // Update location
    request(app)
        .post(version + '/UpdateLocation')
        .send(data.updateLocation)
        .expect(200)
        .end(function(err, res) {
            if (err) return callback(err);
            results.updateLocation = res.body;

            // Get location
            request(app)
                .post(version + '/GetLocation')
                .send(data.getLocation)
                .expect(200)
                .end(function(err, res) {
                    if (err) return callback(err);
                    results.getLocation = res.body;

                    // Get location history
                    request(app)
                        .post(version + '/GetLocationHistory')
                        .send(data.getLocationHistory)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) return callback(err);
                            results.getLocationHistory = res.body;
                            callback(null, results);
                        });
                });
        });
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

            completeChain(data, 'v1', function(error, data) {
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
            expect(result.getLocationHistory.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(5);
        });

        it('should return 0 elements', function() {
            expect(result.getLocationHistory.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(0);
        });

        it('should return 0 elements', function() {
            expect(result.getLocationHistory.MiataruLocation.length).to.equal(0);
        });
    });

    describe('with history, multiple locations', function() {
        var result;
        var DEVICE = 'foo2';

        before(function(done) {
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({device: DEVICE, timeStamp: 1}),
                        calls.location({device: DEVICE, timeStamp: 2}),
                        calls.location({device: DEVICE, timeStamp: 3})
                    ]
                }),
                getLocation: calls.getLocationCall(DEVICE),
                getLocationHistory: calls.getLocationHistoryCall(DEVICE, 10)
            };

            completeChain(data, 'v1', function(error, data) {
                result = data;

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
            expect(result.getLocation.MiataruLocation[0].Timestamp).to.equal(3);
        });

        it('should return the correct number of maxStored items', function() {
            expect(result.getLocationHistory.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(5);
        });

        it('should return the number of history elements', function() {
            expect(result.getLocationHistory.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(3);
        });

        it('should return all history elements', function() {
            expect(result.getLocationHistory.MiataruLocation.length).to.equal(3);
        });

    });

    describe('with history, multiple locations (more then config allows)', function() {
        var result;
        var DEVICE = 'foo3';

        before(function(done) {
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({device: DEVICE, timeStamp: 1}),
                        calls.location({device: DEVICE, timeStamp: 2}),
                        calls.location({device: DEVICE, timeStamp: 3}),
                        calls.location({device: DEVICE, timeStamp: 4}),
                        calls.location({device: DEVICE, timeStamp: 5}),
                        calls.location({device: DEVICE, timeStamp: 6})
                    ]
                }),
                getLocation: calls.getLocationCall(DEVICE),
                getLocationHistory: calls.getLocationHistoryCall(DEVICE, 10)
            };

            completeChain(data, 'v1', function(error, data) {
                result = data;

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
            expect(result.getLocation.MiataruLocation[0].Timestamp).to.equal(6);
        });

        it('should return the correct number of maxStored items', function() {
            expect(result.getLocationHistory.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(5);
        });

        it('should return the number of history elements (trimmed by the number of max elements)', function() {
            expect(result.getLocationHistory.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(5);
        });

        it('should return all history elements', function() {
            expect(result.getLocationHistory.MiataruLocation.length).to.equal(5);
        });

    });

    describe('with history, multiple locations (more then config allows), history length check', function() {
        var result;
        var DEVICE = 'foo4';

        before(function(done) {
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({device: DEVICE, timeStamp: 1}),
                        calls.location({device: DEVICE, timeStamp: 2}),
                        calls.location({device: DEVICE, timeStamp: 3}),
                        calls.location({device: DEVICE, timeStamp: 4})
                    ]
                }),
                getLocation: calls.getLocationCall(DEVICE),
                getLocationHistory: calls.getLocationHistoryCall(DEVICE, 2)
            };

            completeChain(data, 'v1', function(error, data) {
                result = data;

                done();
            });
        });

        it('should sucessfully call the api for the update', function() {
            expect(result.updateLocation.MiataruResponse).to.equal('ACK');
        });

        it('should ask the api for the last update (which is equals to the current location)', function() {
            expect(result.getLocation.MiataruLocation[0].Device).to.equal(DEVICE);
        });

        it('should have stored the last update', function() {
            expect(result.getLocation.MiataruLocation[0].Timestamp).to.equal(4);
        });

        it('should return the correct number of maxStored items', function() {
            expect(result.getLocationHistory.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(5);
        });

        it('should return the number of history elements (trimmed by the number of max elements)', function() {
            expect(result.getLocationHistory.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(4);
        });

        it('should return the number of demanded history elements (which is less than the actual history)', function() {
            expect(result.getLocationHistory.MiataruLocation.length).to.equal(2);
        });

    });

    describe('with history, multiple locations (more then config allows), history length check, with a version', function() {
        var result;
        var DEVICE = 'foo14';

        before(function(done) {
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({device: DEVICE, timeStamp: 1}),
                        calls.location({device: DEVICE, timeStamp: 2}),
                        calls.location({device: DEVICE, timeStamp: 3}),
                        calls.location({device: DEVICE, timeStamp: 4})
                    ]
                }),
                getLocation: calls.getLocationCall(DEVICE),
                getLocationHistory: calls.getLocationHistoryCall(DEVICE, 2)
            };

            completeChain(data, 'v1', function(error, data) {
                result = data;

                done();
            });
        });

        it('should sucessfully call the api for the update', function() {
            expect(result.updateLocation.MiataruResponse).to.equal('ACK');
        });

        it('should ask the api for the last update (which is equals to the current location)', function() {
            expect(result.getLocation.MiataruLocation[0].Device).to.equal(DEVICE);
        });

        it('should have stored the last update', function() {
            expect(result.getLocation.MiataruLocation[0].Timestamp).to.equal(4);
        });

        it('should return the correct number of maxStored items', function() {
            expect(result.getLocationHistory.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(5);
        });

        it('should return the number of history elements (trimmed by the number of max elements)', function() {
            expect(result.getLocationHistory.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(4);
        });

        it('should return the number of demanded history elements (which is less than the actual history)', function() {
            expect(result.getLocationHistory.MiataruLocation.length).to.equal(2);
        });

    });
});