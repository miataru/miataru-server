var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

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

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
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

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
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

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    done();
                });
        });
    });

    describe('GetLocation with new fields', function() {
        it('should return location with new fields', function(done) {
            var DEVICE_WITH_NEW_FIELDS = 'get-location-new-fields-device-' + Date.now();
            
            // Use the same pattern as the working complete chain tests
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({
                            device: DEVICE_WITH_NEW_FIELDS,
                            timeStamp: 1,
                            speed: '30.5',
                            batteryLevel: '75',
                            altitude: '200.0'
                        })
                    ]
                }),
                getLocation: calls.getLocationCall(DEVICE_WITH_NEW_FIELDS)
            };

            // Update location first
            request(app)
                .post('/v1/UpdateLocation')
                .send(data.updateLocation)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    
                    // Then get location
                    request(app)
                        .post('/v1/GetLocation')
                        .send(data.getLocation)
                        .expect(200)
                        .end(function(err, res) {
                            expect(err).to.be.null;
                            expect(res.body.MiataruLocation).to.be.an('array');
                            expect(res.body.MiataruLocation).to.have.length(1);
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', DEVICE_WITH_NEW_FIELDS);
                            expect(res.body.MiataruLocation[0]).to.have.property('Speed', '30.5');
                            expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', '75');
                            expect(res.body.MiataruLocation[0]).to.have.property('Altitude', '200.0');
                            done();
                        });
                });
        });
    });

    describe('GetLocationGeoJSON with new fields', function() {
        it('should return GeoJSON with new fields in properties', function(done) {
            var DEVICE_GEOJSON_NEW_FIELDS = 'geojson-new-fields-device-' + Date.now();
            
            // Use the same pattern as the working complete chain tests
            var data = {
                updateLocation: calls.locationUpdateCall({
                    config: calls.config({history: true, retentionTime: 100}),
                    locations: [
                        calls.location({
                            device: DEVICE_GEOJSON_NEW_FIELDS,
                            timeStamp: 1,
                            speed: '40.0',
                            batteryLevel: '90',
                            altitude: '150.5'
                        })
                    ]
                }),
                getLocation: calls.getLocationCall(DEVICE_GEOJSON_NEW_FIELDS)
            };

            // Update location first
            request(app)
                .post('/v1/UpdateLocation')
                .send(data.updateLocation)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    
                    // Then get GeoJSON
                    request(app)
                        .post('/v1/GetLocationGeoJSON')
                        .send(data.getLocation)
                        .expect(200)
                        .end(function(err, res) {
                            expect(err).to.be.null;
                            expect(res.body).to.have.property('type', 'Feature');
                            expect(res.body).to.have.property('geometry');
                            expect(res.body).to.have.property('properties');
                            expect(res.body.properties).to.have.property('name', DEVICE_GEOJSON_NEW_FIELDS);
                            expect(res.body.properties).to.have.property('speed', '40.0');
                            expect(res.body.properties).to.have.property('batteryLevel', '90');
                            expect(res.body.properties).to.have.property('altitude', '150.5');
                            done();
                        });
                });
        });
    });

    describe('GetLocationHistory with new fields', function() {
        var DEVICE_HISTORY_NEW_FIELDS = 'history-new-fields-device-' + Date.now();

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

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    done();
                });
        });

        it('should return location history with new fields', function(done) {
            var getHistoryData = calls.getLocationHistoryCall(DEVICE_HISTORY_NEW_FIELDS, 10);

            request(app)
                .post('/v1/GetLocationHistory')
                .send(getHistoryData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(3);
                    
                    // History is stored in reverse order (newest first)
                    // Check newest location (index 0)
                    expect(res.body.MiataruLocation[0]).to.have.property('Speed', '30.0');
                    expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', '90');
                    expect(res.body.MiataruLocation[0]).to.have.property('Altitude', '110.0');
                    
                    // Check oldest location (index 2)
                    expect(res.body.MiataruLocation[2]).to.have.property('Speed', '20.0');
                    expect(res.body.MiataruLocation[2]).to.have.property('BatteryLevel', '100');
                    expect(res.body.MiataruLocation[2]).to.have.property('Altitude', '100.0');
                    done();
                });
        });
    });

    describe('Mixed field scenarios', function() {
        var DEVICE_MIXED_FIELDS = 'mixed-fields-device-' + Date.now();

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

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    done();
                });
        });

        it('should handle mixed field scenarios in history', function(done) {
            var getHistoryData = calls.getLocationHistoryCall(DEVICE_MIXED_FIELDS, 10);

            request(app)
                .post('/v1/GetLocationHistory')
                .send(getHistoryData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(4);
                    
                    // First location (old format) - should not have new fields
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');
                    
                    // Second location (new format) - should have all fields (index 1, newest)
                    expect(res.body.MiataruLocation[1]).to.have.property('Speed', '40.0');
                    expect(res.body.MiataruLocation[1]).to.not.have.property('BatteryLevel');
                    expect(res.body.MiataruLocation[1]).to.not.have.property('Altitude');
                    
                    // Third location (mixed format) - should have only Speed (index 2, oldest)
                    expect(res.body.MiataruLocation[2]).to.have.property('Speed', '35.0');
                    expect(res.body.MiataruLocation[2]).to.have.property('BatteryLevel', '80');
                    expect(res.body.MiataruLocation[2]).to.have.property('Altitude', '180.0');
                    
                    // Fourth location (-1 values) - should not have new fields
                    expect(res.body.MiataruLocation[3]).to.not.have.property('Speed');
                    expect(res.body.MiataruLocation[3]).to.not.have.property('BatteryLevel');
                    expect(res.body.MiataruLocation[3]).to.not.have.property('Altitude');
                    
                    done();
                });
        });

        it('should return current location with correct fields', function(done) {
            var getLocationData = calls.getLocationCall(DEVICE_MIXED_FIELDS);

            request(app)
                .post('/v1/GetLocation')
                .send(getLocationData)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation[0]).to.have.property('Device', DEVICE_MIXED_FIELDS);
                    expect(res.body.MiataruLocation[0]).to.have.property('Timestamp', 4);
                    // Last location had -1 values, so new fields should not be present
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');
                    done();
                });
        });
    });
});