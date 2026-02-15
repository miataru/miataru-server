var expect = require('chai').expect;
var request = require('supertest');
var app = require('../../server');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var deviceKeyUtils = require('../../lib/utils/deviceKey');
var allowedDevicesUtils = require('../../lib/utils/allowedDevices');

describe('DeviceSlogan Integration Tests', function() {
    var TEST_TARGET_DEVICE = 'test-device-slogan-target-' + Date.now();
    var TEST_TARGET_KEY = 'target-device-key-123';
    var TEST_REQUEST_DEVICE = 'test-device-slogan-request-' + Date.now();
    var TEST_REQUEST_KEY = 'request-device-key-123';

    var KEY_SUFFIX = 'key';
    var KEY_SLOGAN = 'slogan';
    var KEY_VISIT = 'visit';
    var ALLOWED_SUFFIX = 'allowed';
    var ENABLED_FLAG_SUFFIX = 'allowed:enabled';

    function cleanup(done) {
        db.del(kb.build(TEST_TARGET_DEVICE, KEY_SUFFIX), function() {
            db.del(kb.build(TEST_REQUEST_DEVICE, KEY_SUFFIX), function() {
                db.del(kb.build(TEST_TARGET_DEVICE, KEY_SLOGAN), function() {
                    db.del(kb.build(TEST_TARGET_DEVICE, KEY_VISIT), function() {
                        db.del(kb.build(TEST_TARGET_DEVICE, ALLOWED_SUFFIX), function() {
                            db.del(kb.build(TEST_TARGET_DEVICE, ENABLED_FLAG_SUFFIX), done);
                        });
                    });
                });
            });
        });
    }

    beforeEach(function(done) {
        cleanup(done);
    });

    afterEach(function(done) {
        cleanup(done);
    });

    describe('setDeviceSlogan endpoint', function() {
        it('should set slogan with valid DeviceKey', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_TARGET_DEVICE, TEST_TARGET_KEY, function(error) {
                if (error) return done(error);

                request(app)
                    .post('/v1/setDeviceSlogan')
                    .send({
                        MiataruSetDeviceSlogan: {
                            DeviceID: TEST_TARGET_DEVICE,
                            DeviceKey: TEST_TARGET_KEY,
                            Slogan: 'Hello from Miataru'
                        }
                    })
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body.MiataruResponse).to.equal('ACK');
                    })
                    .end(function(err) {
                        if (err) return done(err);

                        db.get(kb.build(TEST_TARGET_DEVICE, KEY_SLOGAN), function(error2, slogan) {
                            if (error2) return done(error2);
                            expect(slogan).to.equal('Hello from Miataru');
                            done();
                        });
                    });
            });
        });

        it('should return 403 when no DeviceKey is configured for target device', function(done) {
            request(app)
                .post('/v1/setDeviceSlogan')
                .send({
                    MiataruSetDeviceSlogan: {
                        DeviceID: TEST_TARGET_DEVICE,
                        DeviceKey: TEST_TARGET_KEY,
                        Slogan: 'Hello from Miataru'
                    }
                })
                .expect(403)
                .expect(function(res) {
                    expect(res.body.error).to.include('DeviceKey must be set');
                })
                .end(done);
        });

        it('should return 403 when DeviceKey does not match', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_TARGET_DEVICE, TEST_TARGET_KEY, function(error) {
                if (error) return done(error);

                request(app)
                    .post('/v1/setDeviceSlogan')
                    .send({
                        MiataruSetDeviceSlogan: {
                            DeviceID: TEST_TARGET_DEVICE,
                            DeviceKey: 'wrong-key',
                            Slogan: 'Hello from Miataru'
                        }
                    })
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey does not match');
                    })
                    .end(done);
            });
        });

        it('should return 400 when slogan exceeds 40 characters', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_TARGET_DEVICE, TEST_TARGET_KEY, function(error) {
                if (error) return done(error);

                request(app)
                    .post('/v1/setDeviceSlogan')
                    .send({
                        MiataruSetDeviceSlogan: {
                            DeviceID: TEST_TARGET_DEVICE,
                            DeviceKey: TEST_TARGET_KEY,
                            Slogan: 'a'.repeat(41)
                        }
                    })
                    .expect(400)
                    .expect(function(res) {
                        expect(res.body.error).to.include('40 characters');
                    })
                    .end(done);
            });
        });
    });

    describe('getDeviceSlogan endpoint', function() {
        function setUpSlogan(done) {
            deviceKeyUtils.setDeviceKey(TEST_TARGET_DEVICE, TEST_TARGET_KEY, function(error) {
                if (error) return done(error);

                deviceKeyUtils.setDeviceKey(TEST_REQUEST_DEVICE, TEST_REQUEST_KEY, function(error2) {
                    if (error2) return done(error2);

                    request(app)
                        .post('/v1/setDeviceSlogan')
                        .send({
                            MiataruSetDeviceSlogan: {
                                DeviceID: TEST_TARGET_DEVICE,
                                DeviceKey: TEST_TARGET_KEY,
                                Slogan: 'Visible slogan'
                            }
                        })
                        .expect(200)
                        .end(done);
                });
            });
        }

        it('should return slogan when RequestDeviceID and RequestDeviceKey are valid', function(done) {
            setUpSlogan(function(error) {
                if (error) return done(error);

                request(app)
                    .post('/v1/getDeviceSlogan')
                    .send({
                        MiataruGetDeviceSlogan: {
                            DeviceID: TEST_TARGET_DEVICE,
                            RequestDeviceID: TEST_REQUEST_DEVICE,
                            RequestDeviceKey: TEST_REQUEST_KEY
                        }
                    })
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body.MiataruDeviceSlogan.DeviceID).to.equal(TEST_TARGET_DEVICE);
                        expect(res.body.MiataruDeviceSlogan.Slogan).to.equal('Visible slogan');
                    })
                    .end(done);
            });
        });

        it('should return 403 when RequestDeviceKey does not match', function(done) {
            setUpSlogan(function(error) {
                if (error) return done(error);

                request(app)
                    .post('/v1/getDeviceSlogan')
                    .send({
                        MiataruGetDeviceSlogan: {
                            DeviceID: TEST_TARGET_DEVICE,
                            RequestDeviceID: TEST_REQUEST_DEVICE,
                            RequestDeviceKey: 'wrong-key'
                        }
                    })
                    .expect(403)
                    .expect(function(res) {
                        expect(res.body.error).to.include('DeviceKey does not match');
                    })
                    .end(done);
            });
        });

        it('should return 403 when RequestDeviceID has no configured DeviceKey', function(done) {
            deviceKeyUtils.setDeviceKey(TEST_TARGET_DEVICE, TEST_TARGET_KEY, function(error) {
                if (error) return done(error);

                request(app)
                    .post('/v1/setDeviceSlogan')
                    .send({
                        MiataruSetDeviceSlogan: {
                            DeviceID: TEST_TARGET_DEVICE,
                            DeviceKey: TEST_TARGET_KEY,
                            Slogan: 'Visible slogan'
                        }
                    })
                    .expect(200)
                    .end(function(err) {
                        if (err) return done(err);

                        request(app)
                            .post('/v1/getDeviceSlogan')
                            .send({
                                MiataruGetDeviceSlogan: {
                                    DeviceID: TEST_TARGET_DEVICE,
                                    RequestDeviceID: TEST_REQUEST_DEVICE,
                                    RequestDeviceKey: TEST_REQUEST_KEY
                                }
                            })
                            .expect(403)
                            .expect(function(res) {
                                expect(res.body.error).to.include('DeviceKey must be set');
                            })
                            .end(done);
                    });
            });
        });

        it('should ignore allowedDevices restrictions and record visitor history', function(done) {
            setUpSlogan(function(error) {
                if (error) return done(error);

                // Enable access restrictions but do not allow requester.
                allowedDevicesUtils.setAllowedDevices(TEST_TARGET_DEVICE, [], function(error2) {
                    if (error2) return done(error2);

                    request(app)
                        .post('/v1/getDeviceSlogan')
                        .send({
                            MiataruGetDeviceSlogan: {
                                DeviceID: TEST_TARGET_DEVICE,
                                RequestDeviceID: TEST_REQUEST_DEVICE,
                                RequestDeviceKey: TEST_REQUEST_KEY
                            }
                        })
                        .expect(200)
                        .expect(function(res) {
                            expect(res.body.MiataruDeviceSlogan.Slogan).to.equal('Visible slogan');
                        })
                        .end(function(err) {
                            if (err) return done(err);

                            setTimeout(function() {
                                request(app)
                                    .post('/v1/GetVisitorHistory')
                                    .send({
                                        MiataruGetVisitorHistory: {
                                            Device: TEST_TARGET_DEVICE,
                                            Amount: '10',
                                            DeviceKey: TEST_TARGET_KEY
                                        }
                                    })
                                    .expect(200)
                                    .expect(function(res) {
                                        expect(res.body.MiataruVisitors).to.be.an('array');
                                        var visitor = res.body.MiataruVisitors.find(function(entry) {
                                            return entry.DeviceID === TEST_REQUEST_DEVICE;
                                        });
                                        expect(visitor).to.not.be.undefined;
                                    })
                                    .end(done);
                            }, 50);
                        });
                });
            });
        });
    });
});
