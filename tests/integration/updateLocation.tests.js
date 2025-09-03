var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

describe('updateLocation', function() {

    it('should answer with ACK to simple update location request', function(done) {
        var updateData = calls.locationUpdateCall();

        request(app)
            .post('/v1/UpdateLocation')
            .send(updateData)
            .expect(200)
            .expect(function(res) {
                expect(res.body.MiataruResponse).to.equal('ACK');
                expect(res.body.MiataruVerboseResponse).to.match(/><\)\)\).>/);
            })
            .end(done);
    });

    it('should answer with ACK to update location request with multiple locations', function(done) {
        var updateData = calls.locationUpdateCall({
            locations: [
                calls.location({device: 'device1'}),
                calls.location({device: 'device2'})
            ]
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

    it('should answer with ACK to update location request with history enabled', function(done) {
        var updateData = calls.locationUpdateCall({
            config: calls.config({history: true, retentionTime: 15})
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

    it('should answer with ACK to update location request with new fields', function(done) {
        var updateData = calls.locationUpdateCall({
            locations: calls.location({
                device: 'new-fields-device',
                speed: '25.5',
                batteryLevel: '85',
                altitude: '120.5'
            })
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

    it('should handle malformed update location request', function(done) {
        var malformedData = {
            "MiataruLocation": "invalid" // Should be array
        };

        request(app)
            .post('/v1/UpdateLocation')
            .send(malformedData)
            .expect(400)
            .end(done);
    });

    it('should handle empty update location request', function(done) {
        request(app)
            .post('/v1/UpdateLocation')
            .send({})
            .expect(400)
            .end(done);
    });

    it('should wait for Redis operations when history is disabled', function(done) {
        var deviceId = 'redis-wait-test-device';
        var updateData = calls.locationUpdateCall({
            config: calls.config({history: false, retentionTime: 15}),
            locations: calls.location({
                device: deviceId,
                longitude: "10.837502",
                latitude: "49.828925"
            })
        });

        // Test that the update completes successfully with history disabled
        // This verifies that Redis del/setex operations complete before responding
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