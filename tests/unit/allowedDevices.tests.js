var expect = require('chai').expect;
var allowedDevicesUtils = require('../../lib/utils/allowedDevices');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');

describe('Allowed Devices Utilities', function() {
    var TEST_DEVICE_ID = 'test-allowed-devices-' + Date.now();
    var TEST_REQUESTING_DEVICE_ID = 'requesting-device-123';
    var KEY_SUFFIX = 'allowed';
    var ENABLED_FLAG_SUFFIX = 'allowed:enabled';

    beforeEach(function(done) {
        // Clean up test data before each test
        var hashKey = kb.build(TEST_DEVICE_ID, KEY_SUFFIX);
        var flagKey = kb.build(TEST_DEVICE_ID, ENABLED_FLAG_SUFFIX);
        db.del(hashKey, function() {
            db.del(flagKey, done);
        });
    });

    afterEach(function(done) {
        // Clean up test data after each test
        var hashKey = kb.build(TEST_DEVICE_ID, KEY_SUFFIX);
        var flagKey = kb.build(TEST_DEVICE_ID, ENABLED_FLAG_SUFFIX);
        db.del(hashKey, function() {
            db.del(flagKey, done);
        });
    });

    describe('isAllowedDeviceEnabled', function() {
        it('should return false when allowed devices list is not enabled', function(done) {
            allowedDevicesUtils.isAllowedDeviceEnabled(TEST_DEVICE_ID, function(error, isEnabled) {
                expect(error).to.be.null;
                expect(isEnabled).to.be.false;
                done();
            });
        });

        it('should return true when allowed devices list is enabled', function(done) {
            var allowedDevices = [
                { DeviceID: TEST_REQUESTING_DEVICE_ID, hasCurrentLocationAccess: true, hasHistoryAccess: false }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.isAllowedDeviceEnabled(TEST_DEVICE_ID, function(error2, isEnabled) {
                    expect(error2).to.be.null;
                    expect(isEnabled).to.be.true;
                    done();
                });
            });
        });
    });

    describe('setAllowedDevices', function() {
        it('should set allowed devices list', function(done) {
            var allowedDevices = [
                { DeviceID: TEST_REQUESTING_DEVICE_ID, hasCurrentLocationAccess: true, hasHistoryAccess: false }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                expect(error).to.be.null;

                allowedDevicesUtils.getAllowedDevices(TEST_DEVICE_ID, function(error2, devices) {
                    expect(error2).to.be.null;
                    expect(devices).to.have.length(1);
                    expect(devices[0].DeviceID).to.equal(TEST_REQUESTING_DEVICE_ID);
                    expect(devices[0].hasCurrentLocationAccess).to.be.true;
                    expect(devices[0].hasHistoryAccess).to.be.false;
                    done();
                });
            });
        });

        it('should replace entire list when updating', function(done) {
            var allowedDevices1 = [
                { DeviceID: 'device1', hasCurrentLocationAccess: true, hasHistoryAccess: false }
            ];
            var allowedDevices2 = [
                { DeviceID: 'device2', hasCurrentLocationAccess: false, hasHistoryAccess: true }
            ];

            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices1, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices2, function(error2) {
                    if (error2) return done(error2);

                    allowedDevicesUtils.getAllowedDevices(TEST_DEVICE_ID, function(error3, devices) {
                        expect(error3).to.be.null;
                        expect(devices).to.have.length(1);
                        expect(devices[0].DeviceID).to.equal('device2');
                        done();
                    });
                });
            });
        });

        it('should remove enabled flag when empty array is provided', function(done) {
            var allowedDevices = [
                { DeviceID: TEST_REQUESTING_DEVICE_ID, hasCurrentLocationAccess: true, hasHistoryAccess: false }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, [], function(error2) {
                    if (error2) return done(error2);

                    allowedDevicesUtils.isAllowedDeviceEnabled(TEST_DEVICE_ID, function(error3, isEnabled) {
                        expect(error3).to.be.null;
                        expect(isEnabled).to.be.false;
                        done();
                    });
                });
            });
        });

        it('should return error when array exceeds 256 elements', function(done) {
            var allowedDevices = [];
            for (var i = 0; i < 257; i++) {
                allowedDevices.push({ DeviceID: 'device' + i, hasCurrentLocationAccess: true, hasHistoryAccess: false });
            }
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                expect(error).to.not.be.null;
                expect(error.message).to.include('256');
                done();
            });
        });
    });

    describe('getAllowedDevices', function() {
        it('should return empty array when list is not enabled', function(done) {
            allowedDevicesUtils.getAllowedDevices(TEST_DEVICE_ID, function(error, devices) {
                expect(error).to.be.null;
                expect(devices).to.be.an('array');
                expect(devices).to.have.length(0);
                done();
            });
        });

        it('should return allowed devices when list is enabled', function(done) {
            var allowedDevices = [
                { DeviceID: 'device1', hasCurrentLocationAccess: true, hasHistoryAccess: false },
                { DeviceID: 'device2', hasCurrentLocationAccess: false, hasHistoryAccess: true }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.getAllowedDevices(TEST_DEVICE_ID, function(error2, devices) {
                    expect(error2).to.be.null;
                    expect(devices).to.have.length(2);
                    done();
                });
            });
        });
    });

    describe('checkAccess', function() {
        it('should return true for currentLocation when list is not enabled (backward compatible)', function(done) {
            allowedDevicesUtils.checkAccess(
                TEST_DEVICE_ID,
                TEST_REQUESTING_DEVICE_ID,
                allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
                function(error, hasAccess) {
                    expect(error).to.be.null;
                    expect(hasAccess).to.be.true;
                    done();
                }
            );
        });

        it('should return true for history when list is not enabled (backward compatible)', function(done) {
            allowedDevicesUtils.checkAccess(
                TEST_DEVICE_ID,
                TEST_REQUESTING_DEVICE_ID,
                allowedDevicesUtils.ACCESS_TYPE_HISTORY,
                function(error, hasAccess) {
                    expect(error).to.be.null;
                    expect(hasAccess).to.be.true;
                    done();
                }
            );
        });

        it('should return true when device has currentLocation access', function(done) {
            var allowedDevices = [
                { DeviceID: TEST_REQUESTING_DEVICE_ID, hasCurrentLocationAccess: true, hasHistoryAccess: false }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.checkAccess(
                    TEST_DEVICE_ID,
                    TEST_REQUESTING_DEVICE_ID,
                    allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
                    function(error2, hasAccess) {
                        expect(error2).to.be.null;
                        expect(hasAccess).to.be.true;
                        done();
                    }
                );
            });
        });

        it('should return false when device does not have currentLocation access', function(done) {
            var allowedDevices = [
                { DeviceID: TEST_REQUESTING_DEVICE_ID, hasCurrentLocationAccess: false, hasHistoryAccess: true }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.checkAccess(
                    TEST_DEVICE_ID,
                    TEST_REQUESTING_DEVICE_ID,
                    allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
                    function(error2, hasAccess) {
                        expect(error2).to.be.null;
                        expect(hasAccess).to.be.false;
                        done();
                    }
                );
            });
        });

        it('should return false when device is not in allowed list', function(done) {
            var allowedDevices = [
                { DeviceID: 'other-device', hasCurrentLocationAccess: true, hasHistoryAccess: true }
            ];
            allowedDevicesUtils.setAllowedDevices(TEST_DEVICE_ID, allowedDevices, function(error) {
                if (error) return done(error);

                allowedDevicesUtils.checkAccess(
                    TEST_DEVICE_ID,
                    TEST_REQUESTING_DEVICE_ID,
                    allowedDevicesUtils.ACCESS_TYPE_CURRENT_LOCATION,
                    function(error2, hasAccess) {
                        expect(error2).to.be.null;
                        expect(hasAccess).to.be.false;
                        done();
                    }
                );
            });
        });
    });
});
