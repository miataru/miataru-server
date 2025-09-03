var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

describe('Interoperability Tests', function() {

    describe('Old and new client interaction', function() {
        var SHARED_DEVICE = 'shared-device-interop';

        it('should allow old client to update location, new client to read with new fields', function(done) {
            // Step 1: Old client updates location (no new fields)
            var oldClientUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": SHARED_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00"
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(oldClientUpdate)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(function(err) {
                    if (err) return done(err);

                    // Step 2: New client reads location (should get default values for new fields)
                    var newClientGet = {
                        "MiataruGetLocation": [{
                            "Device": SHARED_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(newClientGet)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruLocation).to.be.an('array');
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', SHARED_DEVICE);
                            // New fields should have default values
                            expect(res.body.MiataruLocation[0]).to.have.property('Speed', -1);
                            expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', -1);
                            expect(res.body.MiataruLocation[0]).to.have.property('Altitude', -1);
                        })
                        .end(done);
                });
        });

        it('should allow new client to update location, old client to read without new fields', function(done) {
            var NEW_DEVICE = 'new-device-interop';
            
            // Step 1: New client updates location (with new fields)
            var newClientUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": NEW_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00",
                    "Speed": 25.5,
                    "BatteryLevel": 85,
                    "Altitude": 120.5
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(newClientUpdate)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(function(err) {
                    if (err) return done(err);

                    // Step 2: Old client reads location (should not see new fields)
                    var oldClientGet = {
                        "MiataruGetLocation": [{
                            "Device": NEW_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(oldClientGet)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruLocation).to.be.an('array');
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', NEW_DEVICE);
                            // Old client should not see new fields
                            expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                            expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                            expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');
                        })
                        .end(done);
                });
        });
    });

    describe('Mixed client scenarios', function() {
        var MIXED_DEVICE = 'mixed-device-interop';

        it('should handle mixed updates from different client types', function(done) {
            // Old client update
            var oldUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": MIXED_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00"
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(oldUpdate)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // New client update with new fields
                    var newUpdate = {
                        "MiataruConfig": {
                            "EnableLocationHistory": "True",
                            "LocationDataRetentionTime": "15"
                        },
                        "MiataruLocation": [{
                            "Device": MIXED_DEVICE,
                            "Timestamp": "1376735651303",
                            "Longitude": "10.837503",
                            "Latitude": "49.828926",
                            "HorizontalAccuracy": "50.00",
                            "Speed": 30.0,
                            "BatteryLevel": 90,
                            "Altitude": 150.0
                        }]
                    };

                    request(app)
                        .post('/v1/UpdateLocation')
                        .send(newUpdate)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruResponse).to.equal('ACK');
                        })
                        .end(function(err) {
                            if (err) return done(err);

                            // Check history contains both updates
                            var historyRequest = {
                                "MiataruGetLocationHistory": {
                                    "Device": MIXED_DEVICE,
                                    "Amount": "10"
                                }
                            };

                            request(app)
                                .post('/v1/GetLocationHistory')
                                .send(historyRequest)
                                .expect(200)
                                .expect(function(res) {
                                    expect(res.body.MiataruLocation).to.be.an('array');
                                    expect(res.body.MiataruLocation).to.have.length(2);
                                    
                                    // First entry (newer) should have new fields
                                    expect(res.body.MiataruLocation[0]).to.have.property('Speed', 30.0);
                                    expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', 90);
                                    expect(res.body.MiataruLocation[0]).to.have.property('Altitude', 150.0);
                                    
                                    // Second entry (older) should have default values for new fields
                                    expect(res.body.MiataruLocation[1]).to.have.property('Speed', -1);
                                    expect(res.body.MiataruLocation[1]).to.have.property('BatteryLevel', -1);
                                    expect(res.body.MiataruLocation[1]).to.have.property('Altitude', -1);
                                })
                                .end(done);
                        });
                });
        });
    });
});