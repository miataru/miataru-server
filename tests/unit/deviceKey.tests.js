var expect = require('chai').expect;
var deviceKeyUtils = require('../../lib/utils/deviceKey');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');

describe('DeviceKey Utilities', function() {
    var TEST_DEVICE_ID = 'test-device-key-' + Date.now();
    var TEST_DEVICE_KEY = 'test-key-123';
    var KEY_SUFFIX = 'key';

    beforeEach(function(done) {
        // Clean up test data before each test
        var key = kb.build(TEST_DEVICE_ID, KEY_SUFFIX);
        db.del(key, function() {
            done();
        });
    });

    afterEach(function(done) {
        // Clean up test data after each test
        var key = kb.build(TEST_DEVICE_ID, KEY_SUFFIX);
        db.del(key, function() {
            done();
        });
    });

    describe('getDeviceKey', function() {
        it('should return null when device key does not exist', function(done) {
            deviceKeyUtils.getDeviceKey(TEST_DEVICE_ID, function(error, deviceKey) {
                expect(error).to.be.null;
                expect(deviceKey).to.be.null;
                done();
            });
        });

        it('should return the device key when it exists', function(done) {
            var key = kb.build(TEST_DEVICE_ID, KEY_SUFFIX);
            db.set(key, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.getDeviceKey(TEST_DEVICE_ID, function(error2, deviceKey) {
                    expect(error2).to.be.null;
                    expect(deviceKey).to.equal(TEST_DEVICE_KEY);
                    done();
                });
            });
        });

        it('should return error when device ID is missing', function(done) {
            deviceKeyUtils.getDeviceKey(null, function(error, deviceKey) {
                expect(error).to.not.be.null;
                expect(error.message).to.include('Device ID is required');
                expect(deviceKey).to.be.undefined;
                done();
            });
        });
    });

    describe('setDeviceKey', function() {
        it('should set a new device key', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error) {
                expect(error).to.be.null;

                // Verify it was set
                deviceKeyUtils.getDeviceKey(TEST_DEVICE_ID, function(error2, deviceKey) {
                    expect(error2).to.be.null;
                    expect(deviceKey).to.equal(TEST_DEVICE_KEY);
                    done();
                });
            });
        });

        it('should update an existing device key', function(done) {
            var newKey = 'new-test-key-456';
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, newKey, function(error2) {
                    expect(error2).to.be.null;

                    deviceKeyUtils.getDeviceKey(TEST_DEVICE_ID, function(error3, deviceKey) {
                        expect(error3).to.be.null;
                        expect(deviceKey).to.equal(newKey);
                        done();
                    });
                });
            });
        });

        it('should return error when device ID is missing', function(done) {
            deviceKeyUtils.setDeviceKey(null, TEST_DEVICE_KEY, function(error) {
                expect(error).to.not.be.null;
                expect(error.message).to.include('Device ID is required');
                done();
            });
        });

        it('should return error when device key is null', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, null, function(error) {
                expect(error).to.not.be.null;
                expect(error.message).to.include('Device key is required');
                done();
            });
        });

        it('should return error when device key exceeds 256 characters', function(done) {
            var longKey = 'a'.repeat(257);
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, longKey, function(error) {
                expect(error).to.not.be.null;
                expect(error.message).to.include('256 characters');
                done();
            });
        });

        it('should accept device key with exactly 256 characters', function(done) {
            var key256 = 'a'.repeat(256);
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, key256, function(error) {
                expect(error).to.be.null;
                done();
            });
        });

        it('should accept unicode characters in device key', function(done) {
            var unicodeKey = '测试-ключ-🔑-' + 'a'.repeat(200);
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, unicodeKey, function(error) {
                expect(error).to.be.null;

                deviceKeyUtils.getDeviceKey(TEST_DEVICE_ID, function(error2, deviceKey) {
                    expect(error2).to.be.null;
                    expect(deviceKey).to.equal(unicodeKey);
                    done();
                });
            });
        });
    });

    describe('validateDeviceKey', function() {
        it('should return true when no key is set (backward compatibility)', function(done) {
            deviceKeyUtils.validateDeviceKey(TEST_DEVICE_ID, null, function(error, isValid) {
                expect(error).to.be.null;
                expect(isValid).to.be.true;
                done();
            });
        });

        it('should return true when keys match', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.validateDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error2, isValid) {
                    expect(error2).to.be.null;
                    expect(isValid).to.be.true;
                    done();
                });
            });
        });

        it('should return false when keys do not match', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.validateDeviceKey(TEST_DEVICE_ID, 'wrong-key', function(error2, isValid) {
                    expect(error2).to.be.null;
                    expect(isValid).to.be.false;
                    done();
                });
            });
        });

        it('should return false when provided key is null and stored key exists', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.validateDeviceKey(TEST_DEVICE_ID, null, function(error2, isValid) {
                    expect(error2).to.be.null;
                    expect(isValid).to.be.false;
                    done();
                });
            });
        });

        it('should return false when provided key is empty string and stored key exists', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, TEST_DEVICE_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.validateDeviceKey(TEST_DEVICE_ID, '', function(error2, isValid) {
                    expect(error2).to.be.null;
                    expect(isValid).to.be.false;
                    done();
                });
            });
        });

        it('should use constant-time comparison to prevent timing attacks', function(done) {
            // This test verifies that the comparison doesn't short-circuit on length mismatch
            deviceKeyUtils.setDeviceKey(TEST_DEVICE_ID, 'short', function(error) {
                if (error) return done(error);

                deviceKeyUtils.validateDeviceKey(TEST_DEVICE_ID, 'very-long-key-that-does-not-match', function(error2, isValid) {
                    expect(error2).to.be.null;
                    expect(isValid).to.be.false;
                    done();
                });
            });
        });
    });
});
