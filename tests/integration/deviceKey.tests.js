var expect = require('chai').expect;
var request = require('supertest');
var app = require('../../server');
var calls = require('../testFiles/calls');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var deviceKeyUtils = require('../../lib/utils/deviceKey');

describe('DeviceKey Integration Tests', function() {
    var TEST_DEVICE = 'test-device-key-' + Date.now();
    var TEST_DEVICE_KEY = 'test-device-key-123';
    var KEY_SUFFIX = 'key';

    beforeEach(function(done) {
        // Clean up test data
        var key = kb.build(TEST_DEVICE, KEY_SUFFIX);
        db.del(key, function() {
            done();
        });
    });

    afterEach(function(done) {
        // Clean up test data
        var key = kb.build(TEST_DEVICE, KEY_SUFFIX);
        db.del(key, function() {
            done();
        });
    });

    describe('setDeviceKey endpoint', function() {
        it('should set device key for first time (no CurrentDeviceKey)', function(done) {
            var setKeyRequest = {
                MiataruSetDeviceKey: {
                    DeviceID: TEST_DEVICE,
                    CurrentDeviceKey: null,
                    NewDeviceKey: TEST_DEVICE_KEY
                }
            };

            request(app)
                .post('/v1/setDeviceKey')
                .send(setKeyRequest)
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruResponse).to.equal('ACK');
                })
                .end(function(err) {
                    if (err) return done(err);

                    // Verify key was set
                    deviceKeyUtils.getDeviceKey(TEST_DEVICE, function(error, key) {
                        expect(error).to.be.null;
                        expect(key).to.equal(TEST_DEVICE_KEY);
                        done();
                    });
                });
        });

        it('should change existing device key with valid CurrentDeviceKey', function(done) {
            var newKey = 'new-device-key-456';
            
            // First set initial key
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var changeKeyRequest = {
                    MiataruSetDeviceKey: {
                        DeviceID: TEST_DEVICE,
                        CurrentDeviceKey: TEST_DEVICE_KEY,
                        NewDeviceKey: newKey
                    }
                };

                request(app)
                    .post('/v1/setDeviceKey')
                    .send(changeKeyRequest)
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body.MiataruResponse).to.equal('ACK');
                    })
                    .end(function(err) {
                        if (err) return done(err);

                        // Verify key was changed
                        deviceKeyUtils.getDeviceKey(TEST_DEVICE, function(error2, key) {
                            expect(error2).to.be.null;
                            expect(key).to.equal(newKey);
                            done();
                        });
                    });
            });
        });

        it('should return 403 when CurrentDeviceKey does not match', function(done) {
            // First set initial key
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var changeKeyRequest = {
                    MiataruSetDeviceKey: {
                        DeviceID: TEST_DEVICE,
                        CurrentDeviceKey: 'wrong-key',
                        NewDeviceKey: 'new-key'
                    }
                };

                request(app)
                    .post('/v1/setDeviceKey')
                    .send(changeKeyRequest)
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('CurrentDeviceKey does not match');
                    })
                    .end(done);
            });
        });
    });

    describe('updateLocation with DeviceKey', function() {
        it('should accept updateLocation without DeviceKey when no key is set (backward compatible)', function(done) {
            var updateData = calls.locationUpdateCall({
                locations: calls.location({ device: TEST_DEVICE })
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

        it('should accept updateLocation with valid DeviceKey', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var updateData = calls.locationUpdateCall({
                    locations: {
                        Device: TEST_DEVICE,
                        Timestamp: Date.now().toString(),
                        Longitude: '10.0',
                        Latitude: '50.0',
                        HorizontalAccuracy: '5.0',
                        DeviceKey: TEST_DEVICE_KEY
                    }
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

        it('should return 403 when DeviceKey does not match', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var updateData = calls.locationUpdateCall({
                    locations: {
                        Device: TEST_DEVICE,
                        Timestamp: Date.now().toString(),
                        Longitude: '10.0',
                        Latitude: '50.0',
                        HorizontalAccuracy: '5.0',
                        DeviceKey: 'wrong-key'
                    }
                });

                request(app)
                    .post('/v1/UpdateLocation')
                    .send(updateData)
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey');
                    })
                    .end(done);
            });
        });

        it('should return 403 when DeviceKey is missing but required', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var updateData = calls.locationUpdateCall({
                    locations: calls.location({ device: TEST_DEVICE })
                    // DeviceKey is missing
                });

                request(app)
                    .post('/v1/UpdateLocation')
                    .send(updateData)
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey is required');
                    })
                    .end(done);
            });
        });
    });

    describe('getVisitorHistory with DeviceKey', function() {
        it('should accept getVisitorHistory without DeviceKey when no key is set (backward compatible)', function(done) {
            var getVisitorRequest = {
                MiataruGetVisitorHistory: {
                    Device: TEST_DEVICE,
                    Amount: '10'
                }
            };

            request(app)
                .post('/v1/GetVisitorHistory')
                .send(getVisitorRequest)
                .expect(200)
                .end(done);
        });

        it('should accept getVisitorHistory with valid DeviceKey', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var getVisitorRequest = {
                    MiataruGetVisitorHistory: {
                        Device: TEST_DEVICE,
                        Amount: '10',
                        DeviceKey: TEST_DEVICE_KEY
                    }
                };

                request(app)
                    .post('/v1/GetVisitorHistory')
                    .send(getVisitorRequest)
                    .expect(200)
                    .end(done);
            });
        });

        it('should return 403 when DeviceKey does not match', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var getVisitorRequest = {
                    MiataruGetVisitorHistory: {
                        Device: TEST_DEVICE,
                        Amount: '10',
                        DeviceKey: 'wrong-key'
                    }
                };

                request(app)
                    .post('/v1/GetVisitorHistory')
                    .send(getVisitorRequest)
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey');
                    })
                    .end(done);
            });
        });

        it('should return 403 when DeviceKey is missing but required', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var getVisitorRequest = {
                    MiataruGetVisitorHistory: {
                        Device: TEST_DEVICE,
                        Amount: '10'
                        // DeviceKey is missing
                    }
                };

                request(app)
                    .post('/v1/GetVisitorHistory')
                    .send(getVisitorRequest)
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey is required');
                    })
                    .end(done);
            });
        });
    });
});
