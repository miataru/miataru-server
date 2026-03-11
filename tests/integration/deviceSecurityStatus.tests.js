var expect = require('chai').expect;
var request = require('supertest');
var app = require('../../server');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var deviceKeyUtils = require('../../lib/utils/deviceKey');
var allowedDevicesUtils = require('../../lib/utils/allowedDevices');

describe('DeviceSecurityStatus Integration Tests', function() {
    var TEST_TARGET_DEVICE = 'test-device-security-target-' + Date.now();
    var TEST_REQUEST_DEVICE = 'test-device-security-request-' + Date.now();
    var TEST_REQUEST_KEY = 'request-device-security-key-123';
    var TEST_TARGET_KEY = 'target-device-security-key-123';
    var TEST_OTHER_DEVICE = 'test-device-security-other-' + Date.now();

    var KEY_SUFFIX = 'key';
    var KEY_LAST = 'last';
    var KEY_VISIT = 'visit';
    var ALLOWED_SUFFIX = 'allowed';
    var ENABLED_FLAG_SUFFIX = 'allowed:enabled';

    function cleanup(done) {
        db.del(kb.build(TEST_TARGET_DEVICE, KEY_SUFFIX), function() {
            db.del(kb.build(TEST_REQUEST_DEVICE, KEY_SUFFIX), function() {
                db.del(kb.build(TEST_TARGET_DEVICE, KEY_LAST), function() {
                    db.del(kb.build(TEST_TARGET_DEVICE, KEY_VISIT), function() {
                        db.del(kb.build(TEST_TARGET_DEVICE, ALLOWED_SUFFIX), function() {
                            db.del(kb.build(TEST_TARGET_DEVICE, ENABLED_FLAG_SUFFIX), function() {
                                db.del(kb.build(TEST_OTHER_DEVICE, KEY_LAST), function() {
                                    db.del(kb.build(TEST_OTHER_DEVICE, KEY_VISIT), done);
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    function setRequesterKey(done) {
        deviceKeyUtils.setDeviceKey(TEST_REQUEST_DEVICE, TEST_REQUEST_KEY, done);
    }

    function securityStatusRequestBody(deviceId, requestDeviceKey) {
        return {
            MiataruGetDeviceSecurityStatus: {
                DeviceID: deviceId,
                RequestDeviceID: TEST_REQUEST_DEVICE,
                RequestDeviceKey: requestDeviceKey
            }
        };
    }

    function waitForVisitors(deviceId, minimumEntries, timeoutMs, callback) {
        var start = Date.now();
        var visitKey = kb.build(deviceId, KEY_VISIT);

        function poll() {
            db.lrange(visitKey, 0, -1, function(error, visitors) {
                if (error) return callback(error);

                if ((visitors || []).length >= minimumEntries) {
                    return callback(null, visitors || []);
                }

                if ((Date.now() - start) >= timeoutMs) {
                    return callback(null, visitors || []);
                }

                setTimeout(poll, 25);
            });
        }

        poll();
    }

    beforeEach(function(done) {
        cleanup(done);
    });

    afterEach(function(done) {
        cleanup(done);
    });

    it('should return true/true when target has DeviceKey and allowed devices list is enabled', function(done) {
        setRequesterKey(function(error) {
            if (error) return done(error);

            deviceKeyUtils.setDeviceKey(TEST_TARGET_DEVICE, TEST_TARGET_KEY, function(error2) {
                if (error2) return done(error2);

                allowedDevicesUtils.setAllowedDevices(TEST_TARGET_DEVICE, [
                    {
                        DeviceID: TEST_REQUEST_DEVICE,
                        hasCurrentLocationAccess: true,
                        hasHistoryAccess: true
                    }
                ], function(error3) {
                    if (error3) return done(error3);

                    request(app)
                        .post('/v1/getDeviceSecurityStatus')
                        .send(securityStatusRequestBody(TEST_TARGET_DEVICE, TEST_REQUEST_KEY))
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruDeviceSecurityStatus).to.deep.equal({
                                DeviceID: TEST_TARGET_DEVICE,
                                HasDeviceKey: true,
                                IsAllowedDeviceListEnabled: true
                            });
                        })
                        .end(done);
                });
            });
        });
    });

    it('should return false/false for unknown target device', function(done) {
        setRequesterKey(function(error) {
            if (error) return done(error);

            request(app)
                .post('/v1/getDeviceSecurityStatus')
                .send(securityStatusRequestBody('unknown-security-status-device', TEST_REQUEST_KEY))
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruDeviceSecurityStatus).to.deep.equal({
                        DeviceID: 'unknown-security-status-device',
                        HasDeviceKey: false,
                        IsAllowedDeviceListEnabled: false
                    });
                })
                .end(done);
        });
    });

    it('should return 403 when RequestDeviceKey does not match', function(done) {
        setRequesterKey(function(error) {
            if (error) return done(error);

            request(app)
                .post('/v1/getDeviceSecurityStatus')
                .send(securityStatusRequestBody(TEST_TARGET_DEVICE, 'wrong-request-key'))
                .expect(403)
                .expect(function(res) {
                    expect(res.body.error).to.include('DeviceKey does not match');
                })
                .end(done);
        });
    });

    it('should return 403 when RequestDeviceID has no configured DeviceKey', function(done) {
        request(app)
            .post('/v1/getDeviceSecurityStatus')
            .send(securityStatusRequestBody(TEST_TARGET_DEVICE, TEST_REQUEST_KEY))
            .expect(403)
            .expect(function(res) {
                expect(res.body.error).to.include('DeviceKey must be set');
            })
            .end(done);
    });

    it('should record visitor when target has a last location', function(done) {
        setRequesterKey(function(error) {
            if (error) return done(error);

            db.set(kb.build(TEST_TARGET_DEVICE, KEY_LAST), JSON.stringify({ Device: TEST_TARGET_DEVICE }), function(error2) {
                if (error2) return done(error2);

                request(app)
                    .post('/v1/getDeviceSecurityStatus')
                    .send(securityStatusRequestBody(TEST_TARGET_DEVICE, TEST_REQUEST_KEY))
                    .expect(200)
                    .end(function(err) {
                        if (err) return done(err);

                        waitForVisitors(TEST_TARGET_DEVICE, 1, 1500, function(error3, visitors) {
                            if (error3) return done(error3);
                            try {
                                expect(visitors).to.be.an('array');
                                expect(visitors.length).to.be.greaterThan(0);

                                var foundVisitor = visitors.map(function(entry) {
                                    return JSON.parse(entry);
                                }).find(function(visitor) {
                                    return visitor.DeviceID === TEST_REQUEST_DEVICE;
                                });

                                expect(foundVisitor).to.not.be.undefined;
                                done();
                            } catch (assertionError) {
                                done(assertionError);
                            }
                        });
                    });
            });
        });
    });

    it('should not record visitor when target has no last location', function(done) {
        setRequesterKey(function(error) {
            if (error) return done(error);

            request(app)
                .post('/v1/getDeviceSecurityStatus')
                .send(securityStatusRequestBody(TEST_OTHER_DEVICE, TEST_REQUEST_KEY))
                .expect(200)
                .end(function(err) {
                    if (err) return done(err);

                    setTimeout(function() {
                        db.lrange(kb.build(TEST_OTHER_DEVICE, KEY_VISIT), 0, -1, function(error2, visitors) {
                            if (error2) return done(error2);
                            try {
                                expect(visitors).to.be.an('array');
                                expect(visitors.length).to.equal(0);
                                done();
                            } catch (assertionError) {
                                done(assertionError);
                            }
                        });
                    }, 200);
                });
        });
    });

    it('should work with legacy endpoint', function(done) {
        setRequesterKey(function(error) {
            if (error) return done(error);

            request(app)
                .post('/getDeviceSecurityStatus')
                .send(securityStatusRequestBody('legacy-security-status-device', TEST_REQUEST_KEY))
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruDeviceSecurityStatus).to.deep.equal({
                        DeviceID: 'legacy-security-status-device',
                        HasDeviceKey: false,
                        IsAllowedDeviceListEnabled: false
                    });
                })
                .end(done);
        });
    });

    it('should reject non-POST methods', function(done) {
        request(app)
            .get('/v1/getDeviceSecurityStatus')
            .expect(405)
            .end(done);
    });
});
