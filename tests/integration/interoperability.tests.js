var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

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

            var updateOptions = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: oldClientUpdate
            };

            request(updateOptions, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');

                // Step 2: New client reads location (should not have new fields)
                var newClientGet = {
                    "MiataruGetLocation": [{
                        "Device": SHARED_DEVICE
                    }]
                };

                var getOptions = {
                    url: serverUrl + '/v1/GetLocation',
                    method: 'POST',
                    json: newClientGet
                };

                request(getOptions, function (error, response, body) {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(200);
                    expect(body.MiataruLocation[0]).to.have.property('Device', SHARED_DEVICE);
                    expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(body.MiataruLocation[0]).to.not.have.property('Altitude');
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

            var updateOptions = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: newClientUpdate
            };

            request(updateOptions, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');

                // Step 2: Old client reads location (should still work, but may see new fields)
                var oldClientGet = {
                    "MiataruGetLocation": [{
                        "Device": NEW_CLIENT_DEVICE
                    }]
                };

                var getOptions = {
                    url: serverUrl + '/v1/GetLocation',
                    method: 'POST',
                    json: oldClientGet
                };

                request(getOptions, function (error, response, body) {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(200);
                    expect(body.MiataruLocation[0]).to.have.property('Device', NEW_CLIENT_DEVICE);
                    expect(body.MiataruLocation[0]).to.have.property('Timestamp', '1376735651302');
                    expect(body.MiataruLocation[0]).to.have.property('Longitude', '10.837502');
                    expect(body.MiataruLocation[0]).to.have.property('Latitude', '49.828925');
                    expect(body.MiataruLocation[0]).to.have.property('HorizontalAccuracy', '50.00');
                    
                    // Old client may see new fields, but should still work
                    expect(body.MiataruLocation[0]).to.have.property('Speed', '30.0');
                    expect(body.MiataruLocation[0]).to.have.property('BatteryLevel', '80');
                    expect(body.MiataruLocation[0]).to.have.property('Altitude', '150.0');
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

                var options = {
                    url: serverUrl + '/v1/UpdateLocation',
                    method: 'POST',
                    json: updates[updateIndex]
                };

                request(options, function (error, response, body) {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(200);
                    expect(body.MiataruResponse).to.equal('ACK');
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

                    // First location (old client) - no new fields
                    expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(body.MiataruLocation[0]).to.not.have.property('Altitude');

                    // Second location (new client, all fields)
                    expect(body.MiataruLocation[1]).to.have.property('Speed', '25.0');
                    expect(body.MiataruLocation[1]).to.have.property('BatteryLevel', '90');
                    expect(body.MiataruLocation[1]).to.have.property('Altitude', '100.0');

                    // Third location (new client, partial fields)
                    expect(body.MiataruLocation[2]).to.have.property('Speed', '30.0');
                    expect(body.MiataruLocation[2]).to.not.have.property('BatteryLevel');
                    expect(body.MiataruLocation[2]).to.not.have.property('Altitude');

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

            var v1Options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: v1Update
            };

            request(v1Options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');

                // Read via legacy endpoint
                var legacyGet = {
                    "MiataruGetLocation": [{
                        "Device": VERSION_DEVICE
                    }]
                };

                var legacyOptions = {
                    url: serverUrl + '/GetLocation', // Legacy endpoint
                    method: 'POST',
                    json: legacyGet
                };

                request(legacyOptions, function (error, response, body) {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(200);
                    expect(body.MiataruLocation[0]).to.have.property('Device', VERSION_DEVICE);
                    expect(body.MiataruLocation[0]).to.have.property('Speed', '35.0');
                    expect(body.MiataruLocation[0]).to.have.property('BatteryLevel', '75');
                    expect(body.MiataruLocation[0]).to.have.property('Altitude', '200.0');
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
                var options = {
                    url: serverUrl + '/v1/UpdateLocation',
                    method: 'POST',
                    json: step.data
                };

                request(options, function (error, response, body) {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(200);
                    expect(body.MiataruResponse).to.equal('ACK');
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

                var options = {
                    url: serverUrl + '/v1/GetLocation',
                    method: 'POST',
                    json: getLocationData
                };

                request(options, function (error, response, body) {
                    expect(error).to.be.null;
                    expect(response.statusCode).to.equal(200);
                    expect(body.MiataruLocation[0]).to.have.property('Device', PERSISTENCE_DEVICE);
                    expect(body.MiataruLocation[0]).to.have.property('Timestamp', '1376735651303');
                    
                    // Last update was from old client, so no new fields
                    expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(body.MiataruLocation[0]).to.not.have.property('Altitude');

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

                    // First location (old client)
                    expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(body.MiataruLocation[0]).to.not.have.property('Altitude');

                    // Second location (new client)
                    expect(body.MiataruLocation[1]).to.have.property('Speed', '40.0');
                    expect(body.MiataruLocation[1]).to.have.property('BatteryLevel', '85');
                    expect(body.MiataruLocation[1]).to.have.property('Altitude', '250.0');

                    // Third location (old client again)
                    expect(body.MiataruLocation[2]).to.not.have.property('Speed');
                    expect(body.MiataruLocation[2]).to.not.have.property('BatteryLevel');
                    expect(body.MiataruLocation[2]).to.not.have.property('Altitude');

                    done();
                });
            }

            executeNextStep();
        });
    });
});
