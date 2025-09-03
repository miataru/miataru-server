var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

describe('DeleteLocation', function() {
    var TEST_DEVICE = 'test-delete-device';

    beforeEach(function(done) {
        // Clean up any existing data for test device
        var deleteRequest = {
            "MiataruDeleteLocation": {
                "Device": TEST_DEVICE
            }
        };

        request(app)
            .post('/v1/DeleteLocation')
            .send(deleteRequest)
            .end(function() {
                done();
            });
    });

    describe('Basic DeleteLocation functionality', function() {
        it('should return ACK when deleting location data for existing device', function(done) {
            // First, add some location data
            var updateData = calls.locationUpdateCall({
                locations: [calls.location({device: TEST_DEVICE})]
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // Now delete the location data
                    var deleteRequest = {
                        "MiataruDeleteLocation": {
                            "Device": TEST_DEVICE
                        }
                    };

                    request(app)
                        .post('/v1/DeleteLocation')
                        .send(deleteRequest)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruResponse).to.equal('ACK');
                            expect(res.body.MiataruVerboseResponse).to.include(TEST_DEVICE);
                            expect(res.body.MiataruDeletedCount).to.be.a('number');
                            expect(res.body.MiataruDeletedCount).to.be.at.least(1);
                        })
                        .end(done);
                });
        });

        it('should return ACK even when deleting non-existent device data', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": 'non-existent-device'
                }
            };

            request(app)
                .post('/v1/DeleteLocation')
                .send(deleteRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    expect(res.body.MiataruVerboseResponse).to.include('non-existent-device');
                    expect(res.body.MiataruDeletedCount).to.equal(0);
                })
                .end(done);
        });

        it('should delete all location data types (current, history, visitor)', function(done) {
            // Add location data with history enabled
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: true}),
                locations: [
                    calls.location({device: TEST_DEVICE, longitude: "10.0", latitude: "50.0"}),
                    calls.location({device: TEST_DEVICE, longitude: "11.0", latitude: "51.0"})
                ]
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // Verify data exists
                    var getLocationRequest = {
                        "MiataruGetLocation": [{"Device": TEST_DEVICE}]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) return done(err);
                            expect(res.body.MiataruLocation).to.be.an('array');
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', TEST_DEVICE);

                            // Now delete all data
                            var deleteRequest = {
                                "MiataruDeleteLocation": {
                                    "Device": TEST_DEVICE
                                }
                            };

                            request(app)
                                .post('/v1/DeleteLocation')
                                .send(deleteRequest)
                                .expect(200)
                                .end(function(err) {
                                    if (err) return done(err);

                                    // Verify data is deleted
                                    request(app)
                                        .post('/v1/GetLocation')
                                        .send(getLocationRequest)
                                        .expect(200)
                                        .expect(function(res) {
                                            expect(res.body.MiataruLocation).to.be.an('array');
                                            expect(res.body.MiataruLocation[0]).to.be.null;
                                        })
                                        .end(done);
                                });
                        });
                });
        });
    });

    describe('API endpoint compatibility', function() {
        it('should work with v1 API endpoint', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": TEST_DEVICE
                }
            };

            request(app)
                .post('/v1/DeleteLocation')
                .send(deleteRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(done);
        });

        it('should work with default API endpoint (no v1 prefix)', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": TEST_DEVICE
                }
            };

            request(app)
                .post('/DeleteLocation')
                .send(deleteRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(done);
        });

        it('should reject non-POST methods', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {
                    "Device": TEST_DEVICE
                }
            };

            request(app)
                .get('/v1/DeleteLocation')
                .send(deleteRequest)
                .expect(405)
                .end(done);
        });
    });

    describe('Error handling', function() {
        it('should handle missing device parameter', function(done) {
            var deleteRequest = {
                "MiataruDeleteLocation": {}
            };

            request(app)
                .post('/v1/DeleteLocation')
                .send(deleteRequest)
                .expect(400)
                .end(done);
        });

        it('should handle missing MiataruDeleteLocation object', function(done) {
            var deleteRequest = {};

            request(app)
                .post('/v1/DeleteLocation')
                .send(deleteRequest)
                .expect(400)
                .end(done);
        });

        it('should handle empty request body', function(done) {
            request(app)
                .post('/v1/DeleteLocation')
                .send()
                .expect(400)
                .end(done);
        });
    });

    describe('Complete workflow test', function() {
        it('should handle complete location lifecycle: create -> verify -> delete -> verify', function(done) {
            var deviceId = 'workflow-test-device';

            // Step 1: Create location data
            var updateData = calls.locationUpdateCall({
                config: calls.config({history: true}),
                locations: [
                    calls.location({device: deviceId, longitude: "10.0", latitude: "50.0"}),
                    calls.location({device: deviceId, longitude: "11.0", latitude: "51.0"})
                ]
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // Step 2: Verify location data exists
                    var getLocationRequest = {
                        "MiataruGetLocation": [{"Device": deviceId}]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) return done(err);
                            expect(res.body.MiataruLocation[0]).to.have.property('Device', deviceId);

                            // Step 3: Delete location data
                            var deleteRequest = {
                                "MiataruDeleteLocation": {
                                    "Device": deviceId
                                }
                            };

                            request(app)
                                .post('/v1/DeleteLocation')
                                .send(deleteRequest)
                                .expect(200)
                                .expect(function(res) {
                                    expect(res.body.MiataruResponse).to.equal('ACK');
                                    expect(res.body.MiataruDeletedCount).to.be.at.least(1);
                                })
                                .end(function(err) {
                                    if (err) return done(err);

                                    // Step 4: Verify data is deleted
                                    request(app)
                                        .post('/v1/GetLocation')
                                        .send(getLocationRequest)
                                        .expect(200)
                                        .expect(function(res) {
                                            expect(res.body.MiataruLocation[0]).to.be.null;
                                        })
                                        .end(done);
                                });
                        });
                });
        });
    });
});
