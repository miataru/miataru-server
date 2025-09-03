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
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');

                    // Step 2: New client reads location (should not have new fields)
                    var newClientGet = {
                        "MiataruGetLocation": [{
                            "Device": SHARED_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(newClientGet)
                        .expect(200)
                        .end(function(err, res) {
                            expect(err).to.be.null;
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', SHARED_DEVICE);
                            expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                            expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                            expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');
                            done();
                        });
                });
        });

        it('should allow new client to update location, old client to read without new fields', function(done) {
            var NEW_CLIENT_DEVICE = 'new-client-device-interop';

            // Step 1: New client updates location (with new fields)
            var newClientUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": NEW_CLIENT_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00",
                    "Speed": "30.0",
                    "BatteryLevel": "80",
                    "Altitude": "150.0"
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(newClientUpdate)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');

                    // Step 2: Old client reads location (should still work, but may see new fields)
                    var oldClientGet = {
                        "MiataruGetLocation": [{
                            "Device": NEW_CLIENT_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(oldClientGet)
                        .expect(200)
                        .end(function(err, res) {
                            expect(err).to.be.null;
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', NEW_CLIENT_DEVICE);
                            expect(res.body.MiataruLocation[0]).to.have.property('Timestamp', '1376735651302');
                            expect(res.body.MiataruLocation[0]).to.have.property('Longitude', '10.837502');
                            expect(res.body.MiataruLocation[0]).to.have.property('Latitude', '49.828925');
                            expect(res.body.MiataruLocation[0]).to.have.property('HorizontalAccuracy', '50.00');
                            
                            // Old client may see new fields, but should still work
                            expect(res.body.MiataruLocation[0]).to.have.property('Speed', '30.0');
                            expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', '80');
                            expect(res.body.MiataruLocation[0]).to.have.property('Altitude', '150.0');
                            done();
                        });
                });
        });
    });

    describe('Mixed client scenarios', function() {
        var MIXED_DEVICE = 'mixed-client-device';

        it('should handle mixed updates from different client types', function(done) {
            var updates = [
                // Old client update
                {
                    "MiataruConfig": {
                        "EnableLocationHistory": "True",
                        "LocationDataRetentionTime": "15"
                    },
                    "MiataruLocation": [{
                        "Device": MIXED_DEVICE,
                        "Timestamp": "1376735651301",
                        "Longitude": "10.837501",
                        "Latitude": "49.828924",
                        "HorizontalAccuracy": "50.00"
                    }]
                },
                // New client update with all fields
                {
                    "MiataruConfig": {
                        "EnableLocationHistory": "True",
                        "LocationDataRetentionTime": "15"
                    },
                    "MiataruLocation": [{
                        "Device": MIXED_DEVICE,
                        "Timestamp": "1376735651302",
                        "Longitude": "10.837502",
                        "Latitude": "49.828925",
                        "HorizontalAccuracy": "50.00",
                        "Speed": "25.0",
                        "BatteryLevel": "90",
                        "Altitude": "100.0"
                    }]
                },
                // New client update with partial fields
                {
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
                        "Speed": "30.0"
                        // BatteryLevel and Altitude missing
                    }]
                }
            ];

            var updateIndex = 0;
            function sendNextUpdate() {
                if (updateIndex >= updates.length) {
                    // All updates sent, now check history
                    checkHistory();
                    return;
                }

                request(app)
                    .post('/v1/UpdateLocation')
                    .send(updates[updateIndex])
                    .expect(200)
                    .end(function(err, res) {
                        expect(err).to.be.null;
                        expect(res.body.MiataruResponse).to.equal('ACK');
                        updateIndex++;
                        sendNextUpdate();
                    });
            }

            function checkHistory() {
                var getHistoryData = {
                    "MiataruGetLocationHistory": {
                        "Device": MIXED_DEVICE,
                        "Amount": "25"
                    }
                };

                request(app)
                    .post('/v1/GetLocationHistory')
                    .send(getHistoryData)
                    .expect(200)
                    .end(function(err, res) {
                        expect(err).to.be.null;
                        expect(res.body.MiataruLocation).to.be.an('array');
                        expect(res.body.MiataruLocation).to.have.length(3);

                        // History is stored in reverse order (newest first)
                        // First location (newest, partial fields)
                        expect(res.body.MiataruLocation[0]).to.have.property('Speed', '30.0');
                        expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                        expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');

                        // Second location (new client, all fields)
                        expect(res.body.MiataruLocation[1]).to.have.property('Speed', '25.0');
                        expect(res.body.MiataruLocation[1]).to.have.property('BatteryLevel', '90');
                        expect(res.body.MiataruLocation[1]).to.have.property('Altitude', '100.0');

                        // Third location (oldest, old client) - no new fields
                        expect(res.body.MiataruLocation[2]).to.not.have.property('Speed');
                        expect(res.body.MiataruLocation[2]).to.not.have.property('BatteryLevel');
                        expect(res.body.MiataruLocation[2]).to.not.have.property('Altitude');

                        done();
                    });
            }

            sendNextUpdate();
        });
    });

    describe('API version compatibility', function() {
        var VERSION_DEVICE = 'version-compat-device';

        it('should work with both v1 and legacy endpoints', function(done) {
            // Update via v1 endpoint
            var v1Update = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": VERSION_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00",
                    "Speed": "35.0",
                    "BatteryLevel": "75",
                    "Altitude": "200.0"
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(v1Update)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');

                    // Read via legacy endpoint
                    var legacyGet = {
                        "MiataruGetLocation": [{
                            "Device": VERSION_DEVICE
                        }]
                    };

                    request(app)
                        .post('/GetLocation') // Legacy endpoint
                        .send(legacyGet)
                        .expect(200)
                        .end(function(err, res) {
                            expect(err).to.be.null;
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', VERSION_DEVICE);
                            expect(res.body.MiataruLocation[0]).to.have.property('Speed', '35.0');
                            expect(res.body.MiataruLocation[0]).to.have.property('BatteryLevel', '75');
                            expect(res.body.MiataruLocation[0]).to.have.property('Altitude', '200.0');
                            done();
                        });
                });
        });
    });

    describe('Data persistence across client types', function() {
        var PERSISTENCE_DEVICE = 'persistence-device';

        it('should persist data correctly when switching between client types', function(done) {
            var sequence = [
                // Old client update
                {
                    type: 'old',
                    data: {
                        "MiataruConfig": {
                            "EnableLocationHistory": "True",
                            "LocationDataRetentionTime": "15"
                        },
                        "MiataruLocation": [{
                            "Device": PERSISTENCE_DEVICE,
                            "Timestamp": "1376735651301",
                            "Longitude": "10.837501",
                            "Latitude": "49.828924",
                            "HorizontalAccuracy": "50.00"
                        }]
                    }
                },
                // New client update
                {
                    type: 'new',
                    data: {
                        "MiataruConfig": {
                            "EnableLocationHistory": "True",
                            "LocationDataRetentionTime": "15"
                        },
                        "MiataruLocation": [{
                            "Device": PERSISTENCE_DEVICE,
                            "Timestamp": "1376735651302",
                            "Longitude": "10.837502",
                            "Latitude": "49.828925",
                            "HorizontalAccuracy": "50.00",
                            "Speed": "40.0",
                            "BatteryLevel": "85",
                            "Altitude": "250.0"
                        }]
                    }
                },
                // Old client update again
                {
                    type: 'old',
                    data: {
                        "MiataruConfig": {
                            "EnableLocationHistory": "True",
                            "LocationDataRetentionTime": "15"
                        },
                        "MiataruLocation": [{
                            "Device": PERSISTENCE_DEVICE,
                            "Timestamp": "1376735651303",
                            "Longitude": "10.837503",
                            "Latitude": "49.828926",
                            "HorizontalAccuracy": "50.00"
                        }]
                    }
                }
            ];

            var stepIndex = 0;
            function executeNextStep() {
                if (stepIndex >= sequence.length) {
                    // All steps completed, verify final state
                    verifyFinalState();
                    return;
                }

                var step = sequence[stepIndex];
                request(app)
                    .post('/v1/UpdateLocation')
                    .send(step.data)
                    .expect(200)
                    .end(function(err, res) {
                        expect(err).to.be.null;
                        expect(res.body.MiataruResponse).to.equal('ACK');
                        stepIndex++;
                        executeNextStep();
                    });
            }

            function verifyFinalState() {
                // Check current location
                var getLocationData = {
                    "MiataruGetLocation": [{
                        "Device": PERSISTENCE_DEVICE
                    }]
                };

                request(app)
                    .post('/v1/GetLocation')
                    .send(getLocationData)
                    .expect(200)
                    .end(function(err, res) {
                        expect(err).to.be.null;
                        expect(res.body.MiataruLocation[0]).to.have.property('Device', PERSISTENCE_DEVICE);
                        expect(res.body.MiataruLocation[0]).to.have.property('Timestamp', '1376735651303');
                        
                        // Last update was from old client, so no new fields
                        expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                        expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                        expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');

                        // Check history contains all updates with correct field presence
                        checkHistory();
                    });
            }

            function checkHistory() {
                var getHistoryData = {
                    "MiataruGetLocationHistory": {
                        "Device": PERSISTENCE_DEVICE,
                        "Amount": "25"
                    }
                };

                request(app)
                    .post('/v1/GetLocationHistory')
                    .send(getHistoryData)
                    .expect(200)
                    .end(function(err, res) {
                        expect(err).to.be.null;
                        expect(res.body.MiataruLocation).to.be.an('array');
                        expect(res.body.MiataruLocation).to.have.length(3);

                        // First location (old client)
                        expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                        expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                        expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');

                        // Second location (new client)
                        expect(res.body.MiataruLocation[1]).to.have.property('Speed', '40.0');
                        expect(res.body.MiataruLocation[1]).to.have.property('BatteryLevel', '85');
                        expect(res.body.MiataruLocation[1]).to.have.property('Altitude', '250.0');

                        // Third location (old client again)
                        expect(res.body.MiataruLocation[2]).to.not.have.property('Speed');
                        expect(res.body.MiataruLocation[2]).to.not.have.property('BatteryLevel');
                        expect(res.body.MiataruLocation[2]).to.not.have.property('Altitude');

                        done();
                    });
            }

            executeNextStep();
        });
    });
});