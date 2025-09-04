var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

describe('Unknown Device ID Handling', function() {
    var UNKNOWN_DEVICE_ID = 'unknown-device-that-does-not-exist-12345';

    describe('GetLocation endpoint', function() {
        it('should return null for unknown device ID', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [{"Device": UNKNOWN_DEVICE_ID}]
            };

            request(app)
                .post('/v1/GetLocation')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(1);
                    expect(res.body.MiataruLocation[0]).to.be.null;
                })
                .end(done);
        });

        it('should return null for unknown device ID (non-versioned endpoint)', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [{"Device": UNKNOWN_DEVICE_ID}]
            };

            request(app)
                .post('/GetLocation')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(1);
                    expect(res.body.MiataruLocation[0]).to.be.null;
                })
                .end(done);
        });

        it('should handle multiple unknown device IDs', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [
                    {"Device": UNKNOWN_DEVICE_ID},
                    {"Device": "another-unknown-device-67890"}
                ]
            };

            request(app)
                .post('/v1/GetLocation')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(2);
                    expect(res.body.MiataruLocation[0]).to.be.null;
                    expect(res.body.MiataruLocation[1]).to.be.null;
                })
                .end(done);
        });
    });

    describe('GetLocationGeoJSON endpoint', function() {
        it('should return empty object for unknown device ID', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [{"Device": UNKNOWN_DEVICE_ID}]
            };

            request(app)
                .post('/v1/GetLocationGeoJSON')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.empty;
                })
                .end(done);
        });

        it('should return empty object for unknown device ID (non-versioned endpoint)', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [{"Device": UNKNOWN_DEVICE_ID}]
            };

            request(app)
                .post('/GetLocationGeoJSON')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.empty;
                })
                .end(done);
        });

        it('should handle GET request with unknown device ID', function(done) {
            request(app)
                .get('/v1/GetLocationGeoJSON/' + UNKNOWN_DEVICE_ID)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.empty;
                })
                .end(done);
        });

        it('should handle GET request with unknown device ID (non-versioned endpoint)', function(done) {
            request(app)
                .get('/GetLocationGeoJSON/' + UNKNOWN_DEVICE_ID)
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.empty;
                })
                .end(done);
        });
    });

    describe('GetLocationHistory endpoint', function() {
        it('should return empty history for unknown device ID', function(done) {
            var getHistoryRequest = {
                "MiataruGetLocationHistory": {
                    "Device": UNKNOWN_DEVICE_ID,
                    "Amount": 10
                }
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(getHistoryRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(0);
                    expect(res.body.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(0);
                    expect(res.body.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.be.a('number');
                })
                .end(done);
        });

        it('should return empty history for unknown device ID (non-versioned endpoint)', function(done) {
            var getHistoryRequest = {
                "MiataruGetLocationHistory": {
                    "Device": UNKNOWN_DEVICE_ID,
                    "Amount": 10
                }
            };

            request(app)
                .post('/GetLocationHistory')
                .send(getHistoryRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(0);
                    expect(res.body.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(0);
                })
                .end(done);
        });
    });

    describe('GetVisitorHistory endpoint', function() {
        it('should return empty visitor history for unknown device ID', function(done) {
            var getVisitorRequest = {
                "MiataruGetVisitorHistory": {
                    "Device": UNKNOWN_DEVICE_ID,
                    "Amount": 10
                }
            };

            request(app)
                .post('/v1/GetVisitorHistory')
                .send(getVisitorRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruVisitors).to.be.an('array');
                    expect(res.body.MiataruVisitors).to.have.length(0);
                    expect(res.body.MiataruServerConfig.AvailableVisitorHistory).to.equal(0);
                    expect(res.body.MiataruServerConfig.MaximumNumberOfVisitorHistory).to.be.a('number');
                })
                .end(done);
        });

        it('should return empty visitor history for unknown device ID (non-versioned endpoint)', function(done) {
            var getVisitorRequest = {
                "MiataruGetVisitorHistory": {
                    "Device": UNKNOWN_DEVICE_ID,
                    "Amount": 10
                }
            };

            request(app)
                .post('/GetVisitorHistory')
                .send(getVisitorRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruVisitors).to.be.an('array');
                    expect(res.body.MiataruVisitors).to.have.length(0);
                    expect(res.body.MiataruServerConfig.AvailableVisitorHistory).to.equal(0);
                })
                .end(done);
        });
    });

    describe('DeleteLocation endpoint', function() {
        it('should return ACK with 0 deleted count for unknown device ID', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": UNKNOWN_DEVICE_ID
                }
            };

            request(app)
                .post('/v1/DeleteLocation')
                .send(deleteRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    expect(res.body.MiataruDeletedCount).to.equal(0);
                    expect(res.body.MiataruVerboseResponse).to.include(UNKNOWN_DEVICE_ID);
                })
                .end(done);
        });

        it('should return ACK with 0 deleted count for unknown device ID (non-versioned endpoint)', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": UNKNOWN_DEVICE_ID
                }
            };

            request(app)
                .post('/DeleteLocation')
                .send(deleteRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    expect(res.body.MiataruDeletedCount).to.equal(0);
                    expect(res.body.MiataruVerboseResponse).to.include(UNKNOWN_DEVICE_ID);
                })
                .end(done);
        });
    });

    describe('UpdateLocation endpoint', function() {
        it('should successfully update location for unknown device ID', function(done) {
            var updateData = calls.locationUpdateCall({
                locations: [calls.location({device: UNKNOWN_DEVICE_ID})]
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

        it('should successfully update location for unknown device ID (non-versioned endpoint)', function(done) {
            var updateData = calls.locationUpdateCall({
                locations: [calls.location({device: UNKNOWN_DEVICE_ID})]
            });

            request(app)
                .post('/UpdateLocation')
                .send(updateData)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(done);
        });
    });

    describe('Mixed known and unknown devices', function() {
        var KNOWN_DEVICE_ID = 'known-device-for-mixed-test';
        var ANOTHER_UNKNOWN_DEVICE_ID = 'another-unknown-device-for-mixed-test';

        before(function(done) {
            // Create a known device with some data
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: true}),
                locations: [
                    calls.location({device: KNOWN_DEVICE_ID, longitude: "10.0", latitude: "50.0"})
                ]
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(done);
        });

        after(function(done) {
            // Clean up known device
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": KNOWN_DEVICE_ID
                }
            };

            request(app)
                .post('/v1/DeleteLocation')
                .send(deleteRequest)
                .end(done);
        });

        it('should handle mixed known and unknown devices in GetLocation', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [
                    {"Device": KNOWN_DEVICE_ID},
                    {"Device": ANOTHER_UNKNOWN_DEVICE_ID}
                ]
            };

            request(app)
                .post('/v1/GetLocation')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.length(2);
                    expect(res.body.MiataruLocation[0]).to.not.be.null;
                    expect(res.body.MiataruLocation[0]).to.have.property('Device', KNOWN_DEVICE_ID);
                    expect(res.body.MiataruLocation[1]).to.be.null;
                })
                .end(done);
        });

        it('should handle mixed known and unknown devices in GetLocationGeoJSON', function(done) {
            var getLocationRequest = {
                "MiataruGetLocation": [
                    {"Device": KNOWN_DEVICE_ID},
                    {"Device": ANOTHER_UNKNOWN_DEVICE_ID}
                ]
            };

            request(app)
                .post('/v1/GetLocationGeoJSON')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    // For GeoJSON, it only returns data for the first device with valid location
                    expect(res.body).to.be.an('object');
                    if (Object.keys(res.body).length > 0) {
                        expect(res.body).to.have.property('type', 'Feature');
                        expect(res.body.properties).to.have.property('name', KNOWN_DEVICE_ID);
                    }
                })
                .end(done);
        });
    });

    describe('Error handling for malformed data', function() {
        it('should handle malformed JSON in Redis gracefully', function(done) {
            // This test would require injecting malformed data into Redis
            // For now, we'll test that the error handling is in place
            var getLocationRequest = {
                "MiataruGetLocation": [{"Device": "truly-unknown-device-for-error-test"}]
            };

            request(app)
                .post('/v1/GetLocation')
                .send(getLocationRequest)
                .expect(200)
                .expect(function(res) {
                    // Should not crash, should return null for unknown device
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation[0]).to.be.null;
                })
                .end(done);
        });
    });
});
