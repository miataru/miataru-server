var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('New Fields Integration Tests', function() {

    describe('UpdateLocation with new fields', function() {
        it('should accept location update with all new fields', function(done) {
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: 'new-fields-device-1',
                    speed: '25.5',
                    batteryLevel: '85',
                    altitude: '120.5'
                })
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });

        it('should accept location update with partial new fields', function(done) {
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: 'new-fields-device-2',
                    speed: '15.2'
                    // BatteryLevel and Altitude missing
                })
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });

        it('should accept location update with -1 values for new fields', function(done) {
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: 'new-fields-device-3',
                    speed: -1,
                    batteryLevel: -1,
                    altitude: -1
                })
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });
    });

    describe('GetLocation with new fields', function() {
        var DEVICE_WITH_NEW_FIELDS = 'get-location-new-fields-device';

        before(function(done) {
            // First update location with new fields
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: DEVICE_WITH_NEW_FIELDS,
                    speed: '30.5',
                    batteryLevel: '75',
                    altitude: '200.0'
                })
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                done();
            });
        });

        it('should return location with new fields', function(done) {
            var getLocationData = calls.getLocationCall(DEVICE_WITH_NEW_FIELDS);

            var options = {
                url: serverUrl + '/v1/GetLocation',
                method: 'POST',
                json: getLocationData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation[0]).to.have.property('Device', DEVICE_WITH_NEW_FIELDS);
                expect(body.MiataruLocation[0]).to.have.property('Speed', '30.5');
                expect(body.MiataruLocation[0]).to.have.property('BatteryLevel', '75');
                expect(body.MiataruLocation[0]).to.have.property('Altitude', '200.0');
                done();
            });
        });
    });

    describe('GetLocationGeoJSON with new fields', function() {
        var DEVICE_GEOJSON_NEW_FIELDS = 'geojson-new-fields-device';

        before(function(done) {
            // First update location with new fields
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: DEVICE_GEOJSON_NEW_FIELDS,
                    speed: '40.0',
                    batteryLevel: '90',
                    altitude: '150.5'
                })
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                done();
            });
        });

        it('should return GeoJSON with new fields in properties', function(done) {
            var getLocationData = calls.getLocationCall(DEVICE_GEOJSON_NEW_FIELDS);

            var options = {
                url: serverUrl + '/v1/GetLocationGeoJSON',
                method: 'POST',
                json: getLocationData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body).to.have.property('type', 'Feature');
                expect(body).to.have.property('geometry');
                expect(body).to.have.property('properties');
                expect(body.properties).to.have.property('name', DEVICE_GEOJSON_NEW_FIELDS);
                expect(body.properties).to.have.property('speed', '40.0');
                expect(body.properties).to.have.property('batteryLevel', '90');
                expect(body.properties).to.have.property('altitude', '150.5');
                done();
            });
        });
    });

    describe('GetLocationHistory with new fields', function() {
        var DEVICE_HISTORY_NEW_FIELDS = 'history-new-fields-device';

        before(function(done) {
            // Update multiple locations with new fields
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: true, retentionTime: 100}),
                locations: [
                    calls.location({
                        device: DEVICE_HISTORY_NEW_FIELDS,
                        timeStamp: 1,
                        speed: '20.0',
                        batteryLevel: '100',
                        altitude: '100.0'
                    }),
                    calls.location({
                        device: DEVICE_HISTORY_NEW_FIELDS,
                        timeStamp: 2,
                        speed: '25.0',
                        batteryLevel: '95',
                        altitude: '105.0'
                    }),
                    calls.location({
                        device: DEVICE_HISTORY_NEW_FIELDS,
                        timeStamp: 3,
                        speed: '30.0',
                        batteryLevel: '90',
                        altitude: '110.0'
                    })
                ]
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                done();
            });
        });

        it('should return location history with new fields', function(done) {
            var getHistoryData = calls.getLocationHistoryCall(DEVICE_HISTORY_NEW_FIELDS, 10);

            var options = {
                url: serverUrl + '/v1/GetLocationHistory',
                method: 'POST',
                json: getHistoryData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation).to.have.length(3);
                
                // Check first location
                expect(body.MiataruLocation[0]).to.have.property('Speed', '20.0');
                expect(body.MiataruLocation[0]).to.have.property('BatteryLevel', '100');
                expect(body.MiataruLocation[0]).to.have.property('Altitude', '100.0');
                
                // Check last location
                expect(body.MiataruLocation[2]).to.have.property('Speed', '30.0');
                expect(body.MiataruLocation[2]).to.have.property('BatteryLevel', '90');
                expect(body.MiataruLocation[2]).to.have.property('Altitude', '110.0');
                done();
            });
        });
    });

    describe('Mixed field scenarios', function() {
        var DEVICE_MIXED_FIELDS = 'mixed-fields-device';

        before(function(done) {
            // Update with mixed field scenarios
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: true, retentionTime: 100}),
                locations: [
                    // Old format (no new fields)
                    calls.location({
                        device: DEVICE_MIXED_FIELDS,
                        timeStamp: 1
                    }),
                    // New format with all fields
                    calls.location({
                        device: DEVICE_MIXED_FIELDS,
                        timeStamp: 2,
                        speed: '35.0',
                        batteryLevel: '80',
                        altitude: '180.0'
                    }),
                    // Mixed format (some fields)
                    calls.location({
                        device: DEVICE_MIXED_FIELDS,
                        timeStamp: 3,
                        speed: '40.0'
                        // BatteryLevel and Altitude missing
                    }),
                    // Fields with -1 values
                    calls.location({
                        device: DEVICE_MIXED_FIELDS,
                        timeStamp: 4,
                        speed: -1,
                        batteryLevel: -1,
                        altitude: -1
                    })
                ]
            });

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: updateData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                done();
            });
        });

        it('should handle mixed field scenarios in history', function(done) {
            var getHistoryData = calls.getLocationHistoryCall(DEVICE_MIXED_FIELDS, 10);

            var options = {
                url: serverUrl + '/v1/GetLocationHistory',
                method: 'POST',
                json: getHistoryData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation).to.have.length(4);
                
                // First location (old format) - should not have new fields
                expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                expect(body.MiataruLocation[0]).to.not.have.property('Altitude');
                
                // Second location (new format) - should have all fields
                expect(body.MiataruLocation[1]).to.have.property('Speed', '35.0');
                expect(body.MiataruLocation[1]).to.have.property('BatteryLevel', '80');
                expect(body.MiataruLocation[1]).to.have.property('Altitude', '180.0');
                
                // Third location (mixed format) - should have only Speed
                expect(body.MiataruLocation[2]).to.have.property('Speed', '40.0');
                expect(body.MiataruLocation[2]).to.not.have.property('BatteryLevel');
                expect(body.MiataruLocation[2]).to.not.have.property('Altitude');
                
                // Fourth location (-1 values) - should not have new fields
                expect(body.MiataruLocation[3]).to.not.have.property('Speed');
                expect(body.MiataruLocation[3]).to.not.have.property('BatteryLevel');
                expect(body.MiataruLocation[3]).to.not.have.property('Altitude');
                
                done();
            });
        });

        it('should return current location with correct fields', function(done) {
            var getLocationData = calls.getLocationCall(DEVICE_MIXED_FIELDS);

            var options = {
                url: serverUrl + '/v1/GetLocation',
                method: 'POST',
                json: getLocationData
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation[0]).to.have.property('Device', DEVICE_MIXED_FIELDS);
                expect(body.MiataruLocation[0]).to.have.property('Timestamp', 4);
                // Last location had -1 values, so new fields should not be present
                expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                expect(body.MiataruLocation[0]).to.not.have.property('Altitude');
                done();
            });
        });
    });
});
