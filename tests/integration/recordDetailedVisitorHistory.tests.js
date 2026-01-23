var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var configuration = require('../../lib/configuration');

var TEST_DEVICE = 'RECORD-DETAILED-TEST-DEVICE-12345';
var VISITOR_DEVICE_1 = 'VISITOR-DEVICE-A';
var VISITOR_DEVICE_2 = 'VISITOR-DEVICE-B';
var VISITOR_DEVICE_3 = 'VISITOR-DEVICE-C';
var VISIT_KEY = kb.build(TEST_DEVICE, 'visit');
var LAST_KEY = kb.build(TEST_DEVICE, 'last');
var HISTORY_KEY = kb.build(TEST_DEVICE, 'hist');

describe('recordDetailedVisitorHistory Configuration', function() {
    var originalConfigValue;
    var originalMaxVisitors;

    beforeEach(function(done) {
        // Save original configuration
        originalConfigValue = configuration.recordDetailedVisitorHistory;
        originalMaxVisitors = configuration.maximumNumberOfLocationVistors;
        
        // Clean up visitor history and last location for test device
        db.del(VISIT_KEY, function(err1) {
            db.del(LAST_KEY, function(err2) {
                db.del(HISTORY_KEY, function(err3) {
                    done(err1 || err2 || err3);
                });
            });
        });
    });

    afterEach(function(done) {
        // Restore original configuration
        configuration.recordDetailedVisitorHistory = originalConfigValue;
        configuration.maximumNumberOfLocationVistors = originalMaxVisitors;
        
        // Clean up after each test
        db.del(VISIT_KEY, function(err1) {
            db.del(LAST_KEY, function(err2) {
                db.del(HISTORY_KEY, function(err3) {
                    done(err1 || err2 || err3);
                });
            });
        });
    });

    describe('ON mode (recordDetailedVisitorHistory: true)', function() {
        beforeEach(function() {
            configuration.recordDetailedVisitorHistory = true;
        });

        it('should record every access as separate entry via GetLocation', function(done) {
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
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // First access
                    var getLocationRequest1 = {
                        "MiataruConfig": {
                            "RequestMiataruDeviceID": VISITOR_DEVICE_1
                        },
                        "MiataruGetLocation": [{
                            "Device": TEST_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest1)
                        .expect(200)
                        .end(function(err2) {
                            if (err2) return done(err2);

                            // Wait a bit to ensure different timestamps
                            setTimeout(function() {
                                // Second access by same device
                                request(app)
                                    .post('/v1/GetLocation')
                                    .send(getLocationRequest1)
                                    .expect(200)
                                    .end(function(err3) {
                                        if (err3) return done(err3);

                                        // Check that two entries were created
                                        db.llen(VISIT_KEY, function(err4, length) {
                                            if (err4) return done(err4);
                                            expect(length).to.equal(2);

                                            // Verify both entries exist
                                            db.lrange(VISIT_KEY, 0, 1, function(err5, entries) {
                                                if (err5) return done(err5);
                                                expect(entries).to.have.length(2);
                                                
                                                var visitor1 = JSON.parse(entries[0]);
                                                var visitor2 = JSON.parse(entries[1]);
                                                
                                                expect(visitor1.DeviceID).to.equal(VISITOR_DEVICE_1);
                                                expect(visitor2.DeviceID).to.equal(VISITOR_DEVICE_1);
                                                expect(visitor1.TimeStamp).to.be.a('number');
                                                expect(visitor2.TimeStamp).to.be.a('number');
                                                
                                                done();
                                            });
                                        });
                                    });
                            }, 100);
                        });
                });
        });

        it('should record every access as separate entry via GetLocationHistory', function(done) {
            // Create location history
            var historyEntry = JSON.stringify({
                Device: TEST_DEVICE,
                Timestamp: 1700000000000,
                Longitude: '10.0',
                Latitude: '50.0',
                HorizontalAccuracy: '5.0'
            });

            db.lpush(HISTORY_KEY, historyEntry, function(err) {
                if (err) return done(err);

                // First access
                var getHistoryRequest1 = {
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
                    .send(getHistoryRequest1)
                    .expect(200)
                    .end(function(err2) {
                        if (err2) return done(err2);

                        // Wait a bit to ensure different timestamps
                        setTimeout(function() {
                            // Second access by same device
                            request(app)
                                .post('/v1/GetLocationHistory')
                                .send(getHistoryRequest1)
                                .expect(200)
                                .end(function(err3) {
                                    if (err3) return done(err3);

                                    // Check that two entries were created
                                    db.llen(VISIT_KEY, function(err4, length) {
                                        if (err4) return done(err4);
                                        expect(length).to.equal(2);

                                        // Verify both entries exist
                                        db.lrange(VISIT_KEY, 0, 1, function(err5, entries) {
                                            if (err5) return done(err5);
                                            expect(entries).to.have.length(2);
                                            
                                            var visitor1 = JSON.parse(entries[0]);
                                            var visitor2 = JSON.parse(entries[1]);
                                            
                                            expect(visitor1.DeviceID).to.equal(VISITOR_DEVICE_1);
                                            expect(visitor2.DeviceID).to.equal(VISITOR_DEVICE_1);
                                            
                                            done();
                                        });
                                    });
                                });
                        }, 100);
                    });
            });
        });
    });

    describe('OFF mode (recordDetailedVisitorHistory: false)', function() {
        beforeEach(function() {
            configuration.recordDetailedVisitorHistory = false;
        });

        it('should update existing entry instead of creating duplicate via GetLocation', function(done) {
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
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    var getLocationRequest = {
                        "MiataruConfig": {
                            "RequestMiataruDeviceID": VISITOR_DEVICE_1
                        },
                        "MiataruGetLocation": [{
                            "Device": TEST_DEVICE
                        }]
                    };

                    // First access
                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest)
                        .expect(200)
                        .end(function(err2) {
                            if (err2) return done(err2);

                            // Wait for async operations to complete before reading
                            setTimeout(function() {
                                // Get first timestamp
                                db.lrange(VISIT_KEY, 0, 0, function(err3, entries) {
                                    if (err3) return done(err3);
                                    expect(entries).to.have.length(1);
                                    var firstVisitor = JSON.parse(entries[0]);
                                    var firstTimestamp = firstVisitor.TimeStamp;

                                    // Wait a bit to ensure different timestamps
                                    setTimeout(function() {
                                // Second access by same device
                                request(app)
                                    .post('/v1/GetLocation')
                                    .send(getLocationRequest)
                                    .expect(200)
                                    .end(function(err4) {
                                        if (err4) return done(err4);

                                        // Wait for async operations to complete
                                        setTimeout(function() {
                                            // Check that only one entry exists (updated, not duplicated)
                                            db.llen(VISIT_KEY, function(err5, length) {
                                                if (err5) return done(err5);
                                                expect(length).to.equal(1);

                                                // Verify the entry was updated with new timestamp
                                                db.lrange(VISIT_KEY, 0, 0, function(err6, entries2) {
                                                    if (err6) return done(err6);
                                                    expect(entries2).to.have.length(1);
                                                    
                                                    var updatedVisitor = JSON.parse(entries2[0]);
                                                    expect(updatedVisitor.DeviceID).to.equal(VISITOR_DEVICE_1);
                                                    expect(updatedVisitor.TimeStamp).to.be.a('number');
                                                    expect(updatedVisitor.TimeStamp).to.be.at.least(firstTimestamp);
                                                    
                                                    done();
                                                });
                                            });
                                        }, 200);
                                    });
                                    }, 100);
                                });
                            }, 200);
                        });
                });
        });

        it('should update existing entry instead of creating duplicate via GetLocationHistory', function(done) {
            // Create location history
            var historyEntry = JSON.stringify({
                Device: TEST_DEVICE,
                Timestamp: 1700000000000,
                Longitude: '10.0',
                Latitude: '50.0',
                HorizontalAccuracy: '5.0'
            });

            db.lpush(HISTORY_KEY, historyEntry, function(err) {
                if (err) return done(err);

                var getHistoryRequest = {
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": VISITOR_DEVICE_1
                    },
                    "MiataruGetLocationHistory": {
                        "Device": TEST_DEVICE,
                        "Amount": "10"
                    }
                };

                // First access
                request(app)
                    .post('/v1/GetLocationHistory')
                    .send(getHistoryRequest)
                    .expect(200)
                    .end(function(err2) {
                        if (err2) return done(err2);

                        // Wait for async operations to complete before reading
                        setTimeout(function() {
                            // Get first timestamp
                            db.lrange(VISIT_KEY, 0, 0, function(err3, entries) {
                                if (err3) return done(err3);
                                expect(entries).to.have.length(1);
                                var firstVisitor = JSON.parse(entries[0]);
                                var firstTimestamp = firstVisitor.TimeStamp;

                                // Wait a bit to ensure different timestamps
                                setTimeout(function() {
                                    // Second access by same device
                                    request(app)
                                        .post('/v1/GetLocationHistory')
                                        .send(getHistoryRequest)
                                        .expect(200)
                                        .end(function(err4) {
                                            if (err4) return done(err4);

                                            // Wait for async operations to complete
                                            setTimeout(function() {
                                                // Check that only one entry exists (updated, not duplicated)
                                                db.llen(VISIT_KEY, function(err5, length) {
                                                    if (err5) return done(err5);
                                                    expect(length).to.equal(1);

                                                    // Verify the entry was updated with new timestamp
                                                    db.lrange(VISIT_KEY, 0, 0, function(err6, entries2) {
                                                        if (err6) return done(err6);
                                                        expect(entries2).to.have.length(1);
                                                        
                                                        var updatedVisitor = JSON.parse(entries2[0]);
                                                        expect(updatedVisitor.DeviceID).to.equal(VISITOR_DEVICE_1);
                                                        expect(updatedVisitor.TimeStamp).to.be.at.least(firstTimestamp);
                                                        
                                                        // Clean up
                                                        db.del(HISTORY_KEY, done);
                                                    });
                                                });
                                            }, 200);
                                        });
                                }, 100);
                            });
                        }, 200);
                    });
            });
        });

        it('should sort visitors by timestamp with newest first', function(done) {
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
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // Access by device 1
                    var request1 = {
                        "MiataruConfig": {
                            "RequestMiataruDeviceID": VISITOR_DEVICE_1
                        },
                        "MiataruGetLocation": [{
                            "Device": TEST_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(request1)
                        .expect(200)
                        .end(function(err2) {
                            if (err2) return done(err2);

                            setTimeout(function() {
                                // Access by device 2
                                var request2 = {
                                    "MiataruConfig": {
                                        "RequestMiataruDeviceID": VISITOR_DEVICE_2
                                    },
                                    "MiataruGetLocation": [{
                                        "Device": TEST_DEVICE
                                    }]
                                };

                                request(app)
                                    .post('/v1/GetLocation')
                                    .send(request2)
                                    .expect(200)
                                    .end(function(err3) {
                                        if (err3) return done(err3);

                                        setTimeout(function() {
                                            // Access by device 3
                                            var request3 = {
                                                "MiataruConfig": {
                                                    "RequestMiataruDeviceID": VISITOR_DEVICE_3
                                                },
                                                "MiataruGetLocation": [{
                                                    "Device": TEST_DEVICE
                                                }]
                                            };

                                            request(app)
                                                .post('/v1/GetLocation')
                                                .send(request3)
                                                .expect(200)
                                                .end(function(err4) {
                                                    if (err4) return done(err4);

                                                    // Wait for async operations to complete
                                                    setTimeout(function() {
                                                        // Verify all three devices are recorded
                                                        db.llen(VISIT_KEY, function(err5, length) {
                                                            if (err5) return done(err5);
                                                            expect(length).to.equal(3);

                                                            // Verify they are sorted by timestamp (newest first)
                                                            db.lrange(VISIT_KEY, 0, 2, function(err6, entries) {
                                                                if (err6) return done(err6);
                                                                expect(entries).to.have.length(3);
                                                                
                                                                var visitors = entries.map(function(e) {
                                                                    return JSON.parse(e);
                                                                });
                                                                
                                                                // Verify newest is first
                                                                expect(visitors[0].TimeStamp).to.be.at.least(visitors[1].TimeStamp);
                                                                expect(visitors[1].TimeStamp).to.be.at.least(visitors[2].TimeStamp);
                                                                
                                                                // Verify all device IDs are present
                                                                var deviceIDs = visitors.map(function(v) {
                                                                    return v.DeviceID;
                                                                });
                                                                expect(deviceIDs).to.include(VISITOR_DEVICE_1);
                                                                expect(deviceIDs).to.include(VISITOR_DEVICE_2);
                                                                expect(deviceIDs).to.include(VISITOR_DEVICE_3);
                                                                
                                                                // Verify device 3 (last accessed) is first
                                                                expect(visitors[0].DeviceID).to.equal(VISITOR_DEVICE_3);
                                                                
                                                                done();
                                                            });
                                                        });
                                                    }, 200);
                                                });
                                        }, 100);
                                    });
                            }, 100);
                        });
                });
        });

        it('should update existing entry and maintain sort order when same device accesses again', function(done) {
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
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // Access by device 1
                    var request1 = {
                        "MiataruConfig": {
                            "RequestMiataruDeviceID": VISITOR_DEVICE_1
                        },
                        "MiataruGetLocation": [{
                            "Device": TEST_DEVICE
                        }]
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(request1)
                        .expect(200)
                        .end(function(err2) {
                            if (err2) return done(err2);

                            setTimeout(function() {
                                // Access by device 2
                                var request2 = {
                                    "MiataruConfig": {
                                        "RequestMiataruDeviceID": VISITOR_DEVICE_2
                                    },
                                    "MiataruGetLocation": [{
                                        "Device": TEST_DEVICE
                                    }]
                                };

                                request(app)
                                    .post('/v1/GetLocation')
                                    .send(request2)
                                    .expect(200)
                                    .end(function(err3) {
                                        if (err3) return done(err3);

                                        setTimeout(function() {
                                            // Device 1 accesses again - should update and move to top
                                            request(app)
                                                .post('/v1/GetLocation')
                                                .send(request1)
                                                .expect(200)
                                                .end(function(err4) {
                                                    if (err4) return done(err4);

                                                    // Wait for async operations to complete
                                                    setTimeout(function() {
                                                        // Verify only 2 entries exist (device 1 updated, not duplicated)
                                                        db.llen(VISIT_KEY, function(err5, length) {
                                                            if (err5) return done(err5);
                                                            expect(length).to.equal(2);

                                                            // Verify device 1 is now first (newest)
                                                            db.lrange(VISIT_KEY, 0, 1, function(err6, entries) {
                                                                if (err6) return done(err6);
                                                                expect(entries).to.have.length(2);
                                                                
                                                                var visitors = entries.map(function(e) {
                                                                    return JSON.parse(e);
                                                                });
                                                                
                                                                // Device 1 should be first (newest)
                                                                expect(visitors[0].DeviceID).to.equal(VISITOR_DEVICE_1);
                                                                expect(visitors[1].DeviceID).to.equal(VISITOR_DEVICE_2);
                                                                expect(visitors[0].TimeStamp).to.be.at.least(visitors[1].TimeStamp);
                                                                
                                                                done();
                                                            });
                                                        });
                                                    }, 200);
                                                });
                                        }, 100);
                                    });
                            }, 100);
                        });
                });
        });

        it('should handle empty visitor list correctly', function(done) {
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
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // First access should create entry
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
                        .end(function(err2) {
                            if (err2) return done(err2);

                            // Wait for async operations to complete
                            setTimeout(function() {
                                // Verify entry was created
                                db.llen(VISIT_KEY, function(err3, length) {
                                    if (err3) return done(err3);
                                    expect(length).to.equal(1);

                                    db.lrange(VISIT_KEY, 0, 0, function(err4, entries) {
                                        if (err4) return done(err4);
                                        expect(entries).to.have.length(1);
                                        
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

        it('should respect maximumNumberOfLocationVistors limit', function(done) {
            // Set a small limit for testing
            configuration.maximumNumberOfLocationVistors = 3;

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
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    // Add 4 different visitors
                    var devices = [VISITOR_DEVICE_1, VISITOR_DEVICE_2, VISITOR_DEVICE_3, 'VISITOR-DEVICE-D'];
                    var addVisitor = function(index) {
                        if (index >= devices.length) {
                            // Wait for last async operation to complete
                            setTimeout(function() {
                                // Verify only 3 entries exist (max limit)
                                db.llen(VISIT_KEY, function(err2, length) {
                                    if (err2) return done(err2);
                                    expect(length).to.equal(3);
                                    done();
                                });
                            }, 300);
                            return;
                        }

                        var requestData = {
                            "MiataruConfig": {
                                "RequestMiataruDeviceID": devices[index]
                            },
                            "MiataruGetLocation": [{
                                "Device": TEST_DEVICE
                            }]
                        };

                        request(app)
                            .post('/v1/GetLocation')
                            .send(requestData)
                            .expect(200)
                            .end(function(err3) {
                                if (err3) return done(err3);
                                // Wait for async operations to complete
                                setTimeout(function() {
                                    addVisitor(index + 1);
                                }, 200);
                            });
                    };

                    addVisitor(0);
                });
        });
    });
});
