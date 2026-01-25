var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');

describe('RequestMiataruDeviceID validation', function() {

    describe('GetLocation without RequestMiataruDeviceID', function() {
        it('should return 400 Bad Request when RequestMiataruDeviceID is missing', function(done) {
            request(app)
                .post('/v1/GetLocation')
                .send({
                    "MiataruGetLocation": [
                        {
                            "Device": "test-device"
                        }
                    ]
                })
                .expect(400)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.include('RequestMiataruDeviceID is required');
                    done();
                });
        });

        it('should return 400 Bad Request when RequestMiataruDeviceID is empty string', function(done) {
            request(app)
                .post('/v1/GetLocation')
                .send({
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": ""
                    },
                    "MiataruGetLocation": [
                        {
                            "Device": "test-device"
                        }
                    ]
                })
                .expect(400)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.include('RequestMiataruDeviceID is required');
                    done();
                });
        });
    });

    describe('GetLocationHistory without RequestMiataruDeviceID', function() {
        it('should return 400 Bad Request when RequestMiataruDeviceID is missing', function(done) {
            request(app)
                .post('/v1/GetLocationHistory')
                .send({
                    "MiataruGetLocationHistory": {
                        "Device": "test-device",
                        "Amount": "10"
                    }
                })
                .expect(400)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.include('RequestMiataruDeviceID is required');
                    done();
                });
        });

        it('should return 400 Bad Request when RequestMiataruDeviceID is empty string', function(done) {
            request(app)
                .post('/v1/GetLocationHistory')
                .send({
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": ""
                    },
                    "MiataruGetLocationHistory": {
                        "Device": "test-device",
                        "Amount": "10"
                    }
                })
                .expect(400)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.include('RequestMiataruDeviceID is required');
                    done();
                });
        });
    });

    describe('GetLocation with valid RequestMiataruDeviceID', function() {
        it('should work when RequestMiataruDeviceID is provided', function(done) {
            request(app)
                .post('/v1/GetLocation')
                .send({
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": "test-client"
                    },
                    "MiataruGetLocation": [
                        {
                            "Device": "test-device"
                        }
                    ]
                })
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.body).to.have.property('MiataruLocation');
                    done();
                });
        });
    });

    describe('GetLocationHistory with valid RequestMiataruDeviceID', function() {
        it('should work when RequestMiataruDeviceID is provided', function(done) {
            request(app)
                .post('/v1/GetLocationHistory')
                .send({
                    "MiataruConfig": {
                        "RequestMiataruDeviceID": "test-client"
                    },
                    "MiataruGetLocationHistory": {
                        "Device": "test-device",
                        "Amount": "10"
                    }
                })
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body).to.have.property('MiataruServerConfig');
                    done();
                });
        });
    });
});
