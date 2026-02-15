var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var deviceKeyUtils = require('../../lib/utils/deviceKey');
var configuration = require('../../lib/configuration');

describe('GetLocation strict RequestMiataruDeviceKey validation', function() {
    var TARGET_DEVICE = 'target-device-' + Date.now();
    var REQUESTING_DEVICE = 'requesting-device-' + Date.now();
    var REQUESTING_DEVICE_KEY = 'requesting-device-key-123';

    var KEY_LAST = 'last';
    var KEY_HISTORY = 'hist';
    var KEY_VISIT = 'visit';
    var KEY_ALLOWED = 'allowed';
    var KEY_ALLOWED_ENABLED = 'allowed:enabled';
    var KEY_DEVICE_KEY = 'key';

    var originalStrictDeviceKeyCheck;

    function cleanup(done) {
        var keys = [
            kb.build(TARGET_DEVICE, KEY_LAST),
            kb.build(TARGET_DEVICE, KEY_HISTORY),
            kb.build(TARGET_DEVICE, KEY_VISIT),
            kb.build(TARGET_DEVICE, KEY_ALLOWED),
            kb.build(TARGET_DEVICE, KEY_ALLOWED_ENABLED),
            kb.build(REQUESTING_DEVICE, KEY_DEVICE_KEY)
        ];

        var remaining = keys.length;

        keys.forEach(function(key) {
            db.del(key, function() {
                remaining--;
                if (remaining === 0) {
                    done();
                }
            });
        });
    }

    function createLocationForTarget(done) {
        var updateData = calls.locationUpdateCall({
            locations: calls.location({ device: TARGET_DEVICE })
        });

        request(app)
            .post('/v1/UpdateLocation')
            .send(updateData)
            .expect(200)
            .end(done);
    }

    function setRequestingDeviceKey(done) {
        deviceKeyUtils.setDeviceKey(REQUESTING_DEVICE, REQUESTING_DEVICE_KEY, done);
    }

    beforeEach(function(done) {
        originalStrictDeviceKeyCheck = configuration.strictDeviceKeyCheck;
        configuration.strictDeviceKeyCheck = true;
        cleanup(done);
    });

    afterEach(function(done) {
        configuration.strictDeviceKeyCheck = originalStrictDeviceKeyCheck;
        cleanup(done);
    });

    it('should return 403 when requesting device has DeviceKey but RequestMiataruDeviceKey is missing', function(done) {
        createLocationForTarget(function(error) {
            if (error) return done(error);

            setRequestingDeviceKey(function(error2) {
                if (error2) return done(error2);

                request(app)
                    .post('/v1/GetLocation')
                    .send(calls.getLocationCall(TARGET_DEVICE, REQUESTING_DEVICE))
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('RequestMiataruDeviceKey');
                    })
                    .end(done);
            });
        });
    });

    it('should return 403 when RequestMiataruDeviceKey does not match', function(done) {
        createLocationForTarget(function(error) {
            if (error) return done(error);

            setRequestingDeviceKey(function(error2) {
                if (error2) return done(error2);

                request(app)
                    .post('/v1/GetLocation')
                    .send(calls.getLocationCall(TARGET_DEVICE, REQUESTING_DEVICE, 'wrong-key'))
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('RequestMiataruDeviceKey');
                        expect(res.body.error).to.include('strictDeviceKeyCheck is enabled');
                    })
                    .end(done);
            });
        });
    });

    it('should return location when RequestMiataruDeviceKey matches', function(done) {
        createLocationForTarget(function(error) {
            if (error) return done(error);

            setRequestingDeviceKey(function(error2) {
                if (error2) return done(error2);

                request(app)
                    .post('/v1/GetLocation')
                    .send(calls.getLocationCall(TARGET_DEVICE, REQUESTING_DEVICE, REQUESTING_DEVICE_KEY))
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body).to.have.property('MiataruLocation');
                        expect(res.body.MiataruLocation[0]).to.have.property('Device', TARGET_DEVICE);
                    })
                    .end(done);
            });
        });
    });

    it('should ignore RequestMiataruDeviceKey when strictDeviceKeyCheck is disabled', function(done) {
        createLocationForTarget(function(error) {
            if (error) return done(error);

            setRequestingDeviceKey(function(error2) {
                if (error2) return done(error2);

                configuration.strictDeviceKeyCheck = false;

                request(app)
                    .post('/v1/GetLocation')
                    .send(calls.getLocationCall(TARGET_DEVICE, REQUESTING_DEVICE))
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body).to.have.property('MiataruLocation');
                        expect(res.body.MiataruLocation[0]).to.have.property('Device', TARGET_DEVICE);
                    })
                    .end(done);
            });
        });
    });
});
