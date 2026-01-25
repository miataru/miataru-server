var expect = require('chai').expect;
var request = require('supertest');
var app = require('../../server');
var calls = require('../testFiles/calls');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var deviceKeyUtils = require('../../lib/utils/deviceKey');
var allowedDevicesUtils = require('../../lib/utils/allowedDevices');

describe('Allowed Devices Integration Tests', function() {
    var TEST_DEVICE = 'test-allowed-devices-' + Date.now();
    var TEST_REQUESTING_DEVICE = 'requesting-device-' + Date.now();
    var TEST_DEVICE_KEY = 'test-device-key-123';
    var KEY_SUFFIX = 'key';
    var ALLOWED_SUFFIX = 'allowed';
    var ENABLED_FLAG_SUFFIX = 'allowed:enabled';

    beforeEach(function(done) {
        // Clean up test data
        var key = kb.build(TEST_DEVICE, KEY_SUFFIX);
        var allowedKey = kb.build(TEST_DEVICE, ALLOWED_SUFFIX);
        var flagKey = kb.build(TEST_DEVICE, ENABLED_FLAG_SUFFIX);
        db.del(key, function() {
            db.del(allowedKey, function() {
                db.del(flagKey, done);
            });
        });
    });

    afterEach(function(done) {
        // Clean up test data
        var key = kb.build(TEST_DEVICE, KEY_SUFFIX);
        var allowedKey = kb.build(TEST_DEVICE, ALLOWED_SUFFIX);
        var flagKey = kb.build(TEST_DEVICE, ENABLED_FLAG_SUFFIX);
        db.del(key, function() {
            db.del(allowedKey, function() {
                db.del(flagKey, done);
            });
        });
    });

    describe('setAllowedDeviceList endpoint', function() {
        it('should set allowed devices list with valid DeviceKey', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var setAllowedRequest = {
                    MiataruSetAllowedDeviceList: {
                        DeviceID: TEST_DEVICE,
                        DeviceKey: TEST_DEVICE_KEY,
                        allowedDevices: [
                            {
                                DeviceID: TEST_REQUESTING_DEVICE,
                                hasCurrentLocationAccess: true,
                                hasHistoryAccess: false
                            }
                        ]
                    }
                };

                request(app)
                    .post('/v1/setAllowedDeviceList')
                    .send(setAllowedRequest)
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body.MiataruResponse).to.equal('ACK');
                    })
                    .end(function(err) {
                        if (err) return done(err);

                        // Verify list was set
                        allowedDevicesUtils.isAllowedDeviceEnabled(TEST_DEVICE, function(error2, isEnabled) {
                            expect(error2).to.be.null;
                            expect(isEnabled).to.be.true;
                            done();
                        });
                    });
            });
        });

        it('should return 403 when DeviceKey does not match', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var setAllowedRequest = {
                    MiataruSetAllowedDeviceList: {
                        DeviceID: TEST_DEVICE,
                        DeviceKey: 'wrong-key',
                        allowedDevices: []
                    }
                };

                request(app)
                    .post('/v1/setAllowedDeviceList')
                    .send(setAllowedRequest)
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey does not match');
                    })
                    .end(done);
            });
        });
    });

    describe('GetLocation with allowed devices', function() {
        it('should return location when allowed devices list is not enabled (backward compatible)', function(done) {
            // Set location first
            var updateData = calls.locationUpdateCall({
                locations: calls.location({ device: TEST_DEVICE })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    var getLocationRequest = {
                        MiataruGetLocation: [
                            { Device: TEST_DEVICE }
                        ],
                        MiataruConfig: {
                            RequestMiataruDeviceID: TEST_REQUESTING_DEVICE
                        }
                    };

                    request(app)
                        .post('/v1/GetLocation')
                        .send(getLocationRequest)
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruLocation).to.be.an('array');
                            expect(res.body.MiataruLocation.length).to.be.greaterThan(0);
                        })
                        .end(done);
                });
        });

        it('should return location when device has hasCurrentLocationAccess', function(done) {
            // Set device key and allowed devices
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var allowedDevices = [
                    {
                        DeviceID: TEST_REQUESTING_DEVICE,
                        hasCurrentLocationAccess: true,
                        hasHistoryAccess: false
                    }
                ];
                allowedDevicesUtils.setAllowedDevices(TEST_DEVICE, allowedDevices, function(error2) {
                    if (error2) return done(error2);

                    // Set location
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
                        .end(function(err) {
                            if (err) return done(err);

                            var getLocationRequest = {
                                MiataruGetLocation: [
                                    { Device: TEST_DEVICE }
                                ],
                                MiataruConfig: {
                                    RequestMiataruDeviceID: TEST_REQUESTING_DEVICE
                                }
                            };

                            request(app)
                                .post('/v1/GetLocation')
                                .send(getLocationRequest)
                                .expect(200)
                                .expect(function(res) {
                                    expect(res.body.MiataruLocation).to.be.an('array');
                                    expect(res.body.MiataruLocation.length).to.be.greaterThan(0);
                                })
                                .end(done);
                        });
                });
            });
        });

        it('should return null location when device does not have hasCurrentLocationAccess', function(done) {
            // Set device key and allowed devices
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                var allowedDevices = [
                    {
                        DeviceID: TEST_REQUESTING_DEVICE,
                        hasCurrentLocationAccess: false,
                        hasHistoryAccess: true
                    }
                ];
                allowedDevicesUtils.setAllowedDevices(TEST_DEVICE, allowedDevices, function(error2) {
                    if (error2) return done(error2);

                    // Set location
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
                        .end(function(err) {
                            if (err) return done(err);

                            var getLocationRequest = {
                                MiataruGetLocation: [
                                    { Device: TEST_DEVICE }
                                ],
                                MiataruConfig: {
                                    RequestMiataruDeviceID: TEST_REQUESTING_DEVICE
                                }
                            };

                            request(app)
                                .post('/v1/GetLocation')
                                .send(getLocationRequest)
                                .expect(200)
                                .expect(function(res) {
                                    expect(res.body.MiataruLocation).to.be.an('array');
                                    // Location should be null (as if device doesn't exist)
                                    var location = res.body.MiataruLocation.find(function(loc) {
                                        return loc && loc.Device === TEST_DEVICE;
                                    });
                                    expect(location).to.be.undefined;
                                })
                                .end(done);
                        });
                });
            });
        });
    });

    describe('GetLocationGeoJSON with DeviceKey', function() {
        it('should return 401 when DeviceKey is set', function(done) {
            // Set device key first
            deviceKeyUtils.setDeviceKey(TEST_DEVICE, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                request(app)
                    .get('/v1/GetLocationGeoJSON/' + TEST_DEVICE)
                    .expect(401)
                    .expect(function(res) {
                        expect(res.body.error).to.include('not available when DeviceKey is set');
                    })
                    .end(done);
            });
        });

        it('should work normally when DeviceKey is not set (backward compatible)', function(done) {
            // Set location without DeviceKey
            var updateData = calls.locationUpdateCall({
                locations: calls.location({ device: TEST_DEVICE })
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updateData)
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    request(app)
                        .get('/v1/GetLocationGeoJSON/' + TEST_DEVICE)
                        .expect(200)
                        .end(done);
                });
        });
    });
});
