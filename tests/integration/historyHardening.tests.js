var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');

describe('GetLocationHistory hardening', function() {
    function sendHistory(payload) {
        return request(app)
            .post('/v1/GetLocationHistory')
            .send({
                MiataruConfig: {
                    RequestMiataruDeviceID: 'history-client'
                },
                MiataruGetLocationHistory: payload
            });
    }

    it('should accept legacy query-style payloads', function(done) {
        sendHistory('Device=test-device&Amount=5')
            .expect(200)
            .end(done);
    });

    it('should reject semicolon-separated legacy payloads', function(done) {
        sendHistory('Device=test-device;Amount=5')
            .expect(400)
            .expect(function(res) {
                expect(res.body.error).to.include('must use "&" and "=" only');
            })
            .end(done);
    });

    it('should reject duplicate legacy keys', function(done) {
        sendHistory('Device=test-device&Amount=5&Amount=6')
            .expect(400)
            .expect(function(res) {
                expect(res.body.error).to.include('duplicate GetLocationHistory key');
            })
            .end(done);
    });

    it('should reject RequestMiataruDeviceID values with colons', function(done) {
        request(app)
            .post('/v1/GetLocationHistory')
            .send({
                MiataruConfig: {
                    RequestMiataruDeviceID: 'history:client'
                },
                MiataruGetLocationHistory: {
                    Device: 'test-device',
                    Amount: '5'
                }
            })
            .expect(400)
            .expect(function(res) {
                expect(res.body.error).to.include('RequestMiataruDeviceID must not contain ":"');
            })
            .end(done);
    });
});
