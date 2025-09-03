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
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(done);
        });

        it('should accept location update with partial new fields', function(done) {
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: 'new-fields-device-2',
                    speed: '30.0'
                    // Only speed, not battery or altitude
                })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(done);
        });

        it('should accept location update with zero values for new fields', function(done) {
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: 'new-fields-device-3',
                    speed: 0,
                    batteryLevel: 0,
                    altitude: 0
                })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(done);
        });
    });

    describe('GetLocation with new fields', function() {
        var TEST_DEVICE = 'new-fields-get-device';

        before(function(done) {
            // Set up test data
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: TEST_DEVICE,
                    speed: '25.5',
                    batteryLevel: '85',
                    altitude: '120.5'
                })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(done);
        });

        it('should return location with all new fields', function(done) {
            var getData = calls.getLocationCall(TEST_DEVICE);

            request(app)
                .post('/v1/GetLocation')
                .send(getData)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation[0]).to.have.property('Device', TEST_DEVICE);
                    expect(res.body.MiataruLocation[0]).to.have.property('Speed', 25.5);
                    expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', 85);
                    expect(res.body.MiataruLocation[0]).to.have.property('Altitude', 120.5);
                })
                .end(done);
        });
    });

    describe('GetLocationHistory with new fields', function() {
        var HISTORY_DEVICE = 'new-fields-history-device';

        before(function(done) {
            // Set up multiple location updates
            var update1 = calls.locationUpdateCall({
                config: calls.config({history: true, retentionTime: 100}),
                locations: calls.location({
                    device: HISTORY_DEVICE,
                    speed: '20.0',
                    batteryLevel: '90',
                    altitude: '100.0'
                })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(update1)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    var update2 = calls.locationUpdateCall({
                        config: calls.config({history: true, retentionTime: 100}),
                        locations: calls.location({
                            device: HISTORY_DEVICE,
                            speed: '25.0',
                            batteryLevel: '85',
                            altitude: '110.0'
                        })
                    });

                    request(app)
                        .post('/v1/UpdateLocation')
                        .send(update2)
                        .expect(200)
                        .end(done);
                });
        });

        it('should return location history with new fields', function(done) {
            var historyData = calls.getLocationHistoryCall(HISTORY_DEVICE, 10);

            request(app)
                .post('/v1/GetLocationHistory')
                .send(historyData)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(2);
                    
                    // Check that both entries have new fields
                    res.body.MiataruLocation.forEach(function(location) {
                        expect(location).to.have.property('Speed');
                        expect(location).to.have.property('BatteryLevel');
                        expect(location).to.have.property('Altitude');
                    });
                })
                .end(done);
        });
    });

    describe('GetLocationGeoJSON with new fields', function() {
        var GEOJSON_DEVICE = 'new-fields-geojson-device';

        before(function(done) {
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: false, retentionTime: 100}),
                locations: calls.location({
                    device: GEOJSON_DEVICE,
                    speed: '30.0',
                    batteryLevel: '80',
                    altitude: '130.0'
                })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(done);
        });

        it('should return GeoJSON with new fields in properties', function(done) {
            var getData = calls.getLocationCall(GEOJSON_DEVICE);

            request(app)
                .post('/v1/GetLocationGeoJSON')
                .send(getData)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.have.property('type', 'FeatureCollection');
                    expect(res.body).to.have.property('features');
                    expect(res.body.features).to.be.an('array');
                    expect(res.body.features[0]).to.have.property('properties');
                    expect(res.body.features[0].properties).to.have.property('Speed', 30.0);
                    expect(res.body.features[0].properties).to.have.property('BatteryLevel', 80);
                    expect(res.body.features[0].properties).to.have.property('Altitude', 130.0);
                })
                .end(done);
        });
    });
});