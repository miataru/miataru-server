var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var configuration = require('../../lib/configuration');

var TEST_DEVICE = 'VISITOR-TEST-DEVICE-12345';
var VISITOR_DEVICE_1 = 'VISITOR-DEVICE-1';
var VISITOR_DEVICE_2 = 'VISITOR-DEVICE-2';
var VISIT_KEY = kb.build(TEST_DEVICE, 'visit');
var LAST_KEY = kb.build(TEST_DEVICE, 'last');

describe('Visitor History Filtering', function() {
    var originalConfigValue;

    beforeEach(function(done) {
        // Save and set configuration to ON mode (detailed history) for these tests
        // since they test the behavior of recording every access
        originalConfigValue = configuration.recordDetailedVisitorHistory;
        configuration.recordDetailedVisitorHistory = true;
        
        // Clean up visitor history and last location for test device
        db.del(VISIT_KEY, function(err1) {
            db.del(LAST_KEY, function(err2) {
                done(err1 || err2);
            });
        });
    });

    afterEach(function(done) {
        // Restore original configuration
        configuration.recordDetailedVisitorHistory = originalConfigValue;
        
        // Clean up after each test
        db.del(VISIT_KEY, function(err1) {
            db.del(LAST_KEY, function(err2) {
                done(err1 || err2);
            });
        });
    });

    describe('GetLocation with RequestMiataruDeviceID', function() {
        it('should NOT store visitor history when RequestMiataruDeviceID equals target deviceID', function(done) {
            // First, create a location for the test device
            var locationData = {
                "MiataruConfig": {
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": TEST_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00"
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(locationData)
                .end(function(err, res) {
                    if (err) return done(err);
                    if (res.status !== 200) {
                        return done(new Error('UpdateLocation failed with status ' + res.status + ': ' + JSON.stringify(res.body)));
                    }

                    // Now request location with RequestMiataruDeviceID equal to target deviceID
                    var getLocationRequest = {
                        "MiataruConfig": {
                            "RequestMiataruDeviceID": TEST_DEVICE
                        },
                        "MiataruGetLocation": [{
                            "Device": TEST_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest)
                        .end(function(err2, res) {
                            if (err2) return done(err2);
                            
                            if (res.status !== 200) {
                                console.log('Error response status:', res.status);
                                console.log('Error response body:', res.body);
                                return done(new Error('Expected 200, got ' + res.status + ': ' + JSON.stringify(res.body)));
                            }

                            // Check that no visitor history was stored
                            db.llen(VISIT_KEY, function(err3, length) {
                                if (err3) return done(err3);
                                expect(length).to.equal(0);
                                done();
                            });
                        });
                });
        });

        it('should store visitor history when RequestMiataruDeviceID differs from target deviceID', function(done) {
            // First, create a location for the test device
            var locationData = {
                "MiataruConfig": {
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": TEST_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00"
                }]
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(locationData)
                .end(function(err, res) {
                    if (err) return done(err);
                    if (res.status !== 200) {
                        return done(new Error('UpdateLocation failed with status ' + res.status + ': ' + JSON.stringify(res.body)));
                    }

                    // Now request location with different RequestMiataruDeviceID
                    var getLocationRequest = {
                        "MiataruConfig": {
                            "RequestMiataruDeviceID": VISITOR_DEVICE_1
                        },
                        "MiataruGetLocation": [{
                            "Device": TEST_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest)
                        .expect(200)
                        .end(function(err2, res) {
                            if (err2) {
                                console.log('Error response:', res ? res.body : err2);
                                return done(err2);
                            }

                            // Wait for async operations to complete
                            setTimeout(function() {
                                // Check that visitor history was stored
                                db.llen(VISIT_KEY, function(err3, length) {
                                    if (err3) return done(err3);
                                    expect(length).to.equal(1);

                                    // Verify the visitor entry
                                    db.lrange(VISIT_KEY, 0, 0, function(err4, entries) {
                                        if (err4) return done(err4);
                                        var visitor = JSON.parse(entries[0]);
                                        expect(visitor.DeviceID).to.equal(VISITOR_DEVICE_1);
                                        expect(visitor.TimeStamp).to.be.a('number');
                                        done();
                                    });
                                });
                            }, 200);
                        });
                });
        });
    });

    describe('GetLocationHistory with RequestMiataruDeviceID', function() {
        it('should NOT store visitor history when RequestMiataruDeviceID equals target deviceID', function(done) {
            var historyKey = kb.build(TEST_DEVICE, 'hist');
            var historyEntry = JSON.stringify({
                Device: TEST_DEVICE,
                Timestamp: 1700000000000,
                Longitude: '10.0',
                Latitude: '50.0',
                HorizontalAccuracy: '5.0'
            });

            // Create location history
            db.lpush(historyKey, historyEntry, function(err) {
                if (err) return done(err);

                // Request location history with RequestMiataruDeviceID equal to target deviceID
                var getHistoryRequest = {
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": TEST_DEVICE
                    },
                    "MiataruGetLocationHistory": {
                        "Device": TEST_DEVICE,
                        "Amount": "10"
                    }
                };

                request(app)
                    .post('/v1/GetLocationHistory')
                    .send(getHistoryRequest)
                    .expect(200)
                    .end(function(err2) {
                        if (err2) return done(err2);

                        // Check that no visitor history was stored
                        db.llen(VISIT_KEY, function(err3, length) {
                            if (err3) return done(err3);
                            expect(length).to.equal(0);

                            // Clean up
                            db.del(historyKey, done);
                        });
                    });
            });
        });

        it('should store visitor history when RequestMiataruDeviceID differs from target deviceID', function(done) {
            var historyKey = kb.build(TEST_DEVICE, 'hist');
            var historyEntry = JSON.stringify({
                Device: TEST_DEVICE,
                Timestamp: 1700000000000,
                Longitude: '10.0',
                Latitude: '50.0',
                HorizontalAccuracy: '5.0'
            });

            // Create location history
            db.lpush(historyKey, historyEntry, function(err) {
                if (err) return done(err);

                // Request location history with different RequestMiataruDeviceID
                var getHistoryRequest = {
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": VISITOR_DEVICE_1
                    },
                    "MiataruGetLocationHistory": {
                        "Device": TEST_DEVICE,
                        "Amount": "10"
                    }
                };

                request(app)
                    .post('/v1/GetLocationHistory')
                    .send(getHistoryRequest)
                    .expect(200)
                    .end(function(err2) {
                        if (err2) return done(err2);

                        // Wait for async operations to complete
                        setTimeout(function() {
                            // Check that visitor history was stored
                            db.llen(VISIT_KEY, function(err3, length) {
                                if (err3) return done(err3);
                                expect(length).to.equal(1);

                                // Verify the visitor entry
                                db.lrange(VISIT_KEY, 0, 0, function(err4, entries) {
                                    if (err4) return done(err4);
                                    var visitor = JSON.parse(entries[0]);
                                    expect(visitor.DeviceID).to.equal(VISITOR_DEVICE_1);
                                    expect(visitor.TimeStamp).to.be.a('number');

                                    // Clean up
                                    db.del(historyKey, done);
                                });
                            });
                        }, 200);
                    });
            });
        });
    });

    describe('GetVisitorHistory filtering', function() {
        it('should filter out entries where visitor DeviceID equals requested deviceID', function(done) {
            // Manually add visitor history entries, including one where DeviceID equals TEST_DEVICE
            var visitor1 = JSON.stringify({
                DeviceID: VISITOR_DEVICE_1,
                TimeStamp: Date.now() - 2000
            });
            var visitor2 = JSON.stringify({
                DeviceID: TEST_DEVICE, // This should be filtered out
                TimeStamp: Date.now() - 1000
            });
            var visitor3 = JSON.stringify({
                DeviceID: VISITOR_DEVICE_2,
                TimeStamp: Date.now()
            });

            db.lpush(VISIT_KEY, visitor1, function(err) {
                if (err) return done(err);

                db.lpush(VISIT_KEY, visitor2, function(err2) {
                    if (err2) return done(err2);

                    db.lpush(VISIT_KEY, visitor3, function(err3) {
                        if (err3) return done(err3);

                        // Request visitor history for TEST_DEVICE
                        var getVisitorRequest = {
                            "MiataruGetVisitorHistory": {
                                "Device": TEST_DEVICE,
                                "Amount": "10"
                            }
                        };

                        request(app)
                            .post('/v1/GetVisitorHistory')
                            .send(getVisitorRequest)
                            .expect(200)
                            .expect(function(res) {
                                expect(res.body.MiataruVisitors).to.be.an('array');
                                expect(res.body.MiataruVisitors).to.have.length(2);
                                expect(res.body.MiataruServerConfig.AvailableVisitorHistory).to.equal(2);

                                // Verify that TEST_DEVICE entry is filtered out
                                var deviceIDs = res.body.MiataruVisitors.map(function(v) {
                                    return v.DeviceID;
                                });
                                expect(deviceIDs).to.not.include(TEST_DEVICE);
                                expect(deviceIDs).to.include(VISITOR_DEVICE_1);
                                expect(deviceIDs).to.include(VISITOR_DEVICE_2);
                            })
                            .end(done);
                    });
                });
            });
        });

        it('should return all entries when visitor DeviceID differs from requested deviceID', function(done) {
            // Add visitor history entries, all with different DeviceIDs
            var visitor1 = JSON.stringify({
                DeviceID: VISITOR_DEVICE_1,
                TimeStamp: Date.now() - 2000
            });
            var visitor2 = JSON.stringify({
                DeviceID: VISITOR_DEVICE_2,
                TimeStamp: Date.now() - 1000
            });

            db.lpush(VISIT_KEY, visitor1, function(err) {
                if (err) return done(err);

                db.lpush(VISIT_KEY, visitor2, function(err2) {
                    if (err2) return done(err2);

                    // Request visitor history for TEST_DEVICE
                    var getVisitorRequest = {
                        "MiataruGetVisitorHistory": {
                            "Device": TEST_DEVICE,
                            "Amount": "10"
                        }
                    };

                    request(app)
                        .post('/v1/GetVisitorHistory')
                        .send(getVisitorRequest)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruVisitors).to.be.an('array');
                            expect(res.body.MiataruVisitors).to.have.length(2);
                            expect(res.body.MiataruServerConfig.AvailableVisitorHistory).to.equal(2);

                            var deviceIDs = res.body.MiataruVisitors.map(function(v) {
                                return v.DeviceID;
                            });
                            expect(deviceIDs).to.include(VISITOR_DEVICE_1);
                            expect(deviceIDs).to.include(VISITOR_DEVICE_2);
                        })
                        .end(done);
                });
            });
        });

        it('should return empty array when all entries have DeviceID equal to requested deviceID', function(done) {
            // Add visitor history entries, all with DeviceID equal to TEST_DEVICE
            var visitor1 = JSON.stringify({
                DeviceID: TEST_DEVICE,
                TimeStamp: Date.now() - 2000
            });
            var visitor2 = JSON.stringify({
                DeviceID: TEST_DEVICE,
                TimeStamp: Date.now() - 1000
            });

            db.lpush(VISIT_KEY, visitor1, function(err) {
                if (err) return done(err);

                db.lpush(VISIT_KEY, visitor2, function(err2) {
                    if (err2) return done(err2);

                    // Request visitor history for TEST_DEVICE
                    var getVisitorRequest = {
                        "MiataruGetVisitorHistory": {
                            "Device": TEST_DEVICE,
                            "Amount": "10"
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
                        })
                        .end(done);
                });
            });
        });

        it('should work with non-versioned GetVisitorHistory endpoint', function(done) {
            // Add visitor history entry with DeviceID equal to TEST_DEVICE
            var visitor = JSON.stringify({
                DeviceID: TEST_DEVICE,
                TimeStamp: Date.now()
            });

            db.lpush(VISIT_KEY, visitor, function(err) {
                if (err) return done(err);

                // Request visitor history using non-versioned endpoint
                var getVisitorRequest = {
                    "MiataruGetVisitorHistory": {
                        "Device": TEST_DEVICE,
                        "Amount": "10"
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
    });
});
