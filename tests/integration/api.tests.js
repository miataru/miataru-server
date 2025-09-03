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

var seq = require('seq');
var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

function c(a) { console.log( require('util').inspect(a, null, 100) ); }

function completeChain(data, version, callback) {
    version = version ? '/' + version : '';

    seq()
            .seq('updateLocation', function() {
                var done = this;

                var options = {
                    url: serverUrl + version + '/UpdateLocation',
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
                    url: serverUrl + version + '/GetLocation',
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
                    url: serverUrl + version + '/GetLocationHistory',
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

    describe('with additional fields', function() {
        var result;
        var DEVICE = 'foo-extra';

        before(function(done) {
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({device: DEVICE, timeStamp: 1, speed: 12.3, batteryLevel: 45.6, altitude: 789.0})
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

        it('should include speed in responses', function() {
            expect(result.getLocation.MiataruLocation[0].Speed).to.equal(12.3);
            expect(result.getLocationHistory.MiataruLocation[0].Speed).to.equal(12.3);
        });

        it('should include battery level in responses', function() {
            expect(result.getLocation.MiataruLocation[0].BatteryLevel).to.equal(45.6);
            expect(result.getLocationHistory.MiataruLocation[0].BatteryLevel).to.equal(45.6);
        });

        it('should include altitude in responses', function() {
            expect(result.getLocation.MiataruLocation[0].Altitude).to.equal(789.0);
            expect(result.getLocationHistory.MiataruLocation[0].Altitude).to.equal(789.0);
        });
    });
});

describe('GetLocationGeoJSON with additional fields', function() {
    var resultPost;
    var resultGet;
    var DEVICE = 'foo-geojson';

    before(function(done) {
        var updateData = calls.locationUpdateCall({
            config: calls.config({history: false, retentionTime: 100}),
            locations: [
                calls.location({device: DEVICE, timeStamp: 1, speed: 12.3, batteryLevel: 45.6, altitude: 789.0})
            ]
        });

        var updateOptions = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: updateData
        };

        request(updateOptions, function(error) {
            if (error) return done(error);

            var postOptions = {
                url: serverUrl + '/v1/GetLocationGeoJSON',
                method: 'POST',
                json: calls.getLocationCall(DEVICE)
            };

            request(postOptions, function(error2, response2, body2) {
                if (error2) return done(error2);
                resultPost = body2;

                var getOptions = {
                    url: serverUrl + '/v1/GetLocationGeoJSON/' + DEVICE,
                    method: 'GET',
                    json: true
                };

                request(getOptions, function(error3, response3, body3) {
                    if (error3) return done(error3);
                    resultGet = body3;
                    done();
                });
            });
        });
    });

    it('should include speed in responses', function() {
        expect(resultPost.properties.Speed).to.equal(12.3);
        expect(resultGet.properties.Speed).to.equal(12.3);
    });

    it('should include battery level in responses', function() {
        expect(resultPost.properties.BatteryLevel).to.equal(45.6);
        expect(resultGet.properties.BatteryLevel).to.equal(45.6);
    });

    it('should include altitude in responses', function() {
        expect(resultPost.properties.Altitude).to.equal(789.0);
        expect(resultGet.properties.Altitude).to.equal(789.0);
    });
});

describe('visitor history with additional fields', function() {
    var result;
    var DEVICE = 'foo-visited';
    var VISITOR_DEVICE = 'foo-visitor';

    before(function(done) {
        var updateOptions = {
            url: serverUrl + '/v1/UpdateLocation',
            method: 'POST',
            json: calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: [calls.location({device: DEVICE, timeStamp: 1})]
            })
        };

        request(updateOptions, function(err) {
            if (err) return done(err);

            var getOptions = {
                url: serverUrl + '/v1/GetLocation',
                method: 'POST',
                json: calls.getLocationCall(DEVICE, {
                    RequestMiataruDeviceID: VISITOR_DEVICE,
                    Speed: 12.3,
                    BatteryLevel: 45.6,
                    Altitude: 789.0
                })
            };

            request(getOptions, function(err2) {
                if (err2) return done(err2);

                var historyOptions = {
                    url: serverUrl + '/v1/GetVisitorHistory',
                    method: 'POST',
                    json: calls.getVisitorHistoryCall(DEVICE, 10)
                };

                request(historyOptions, function(err3, response3, body3) {
                    if (err3) return done(err3);
                    result = body3;
                    done();
                });
            });
        });
    });

    it('should include visitor speed in history', function() {
        expect(result.MiataruVisitors[0].Speed).to.equal(12.3);
    });

    it('should include visitor battery level in history', function() {
        expect(result.MiataruVisitors[0].BatteryLevel).to.equal(45.6);
    });

    it('should include visitor altitude in history', function() {
        expect(result.MiataruVisitors[0].Altitude).to.equal(789.0);
    });

    it('should record visitor device id', function() {
        expect(result.MiataruVisitors[0].DeviceID).to.equal(VISITOR_DEVICE);
    });
});
