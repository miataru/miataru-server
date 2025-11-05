var expect = require('chai').expect;
var request = require('supertest');

var logger = require('../../lib/logger');
var app = require('../../server');

describe('server error handling logging', function() {
    var originalError;
    var errorCalls;

    beforeEach(function() {
        originalError = logger.error;
        errorCalls = 0;
        logger.error = function() {
            errorCalls++;
        };
    });

    afterEach(function() {
        logger.error = originalError;
    });

    it('does not log error level messages for 404 responses', function(done) {
        request(app)
            .get('/non-existent-route')
            .expect(404)
            .end(function(err) {
                if (err) {
                    return done(err);
                }

                expect(errorCalls).to.equal(0);
                done();
            });
    });

    it('does not log error level messages for 405 responses', function(done) {
        request(app)
            .get('/UpdateLocation')
            .expect(405)
            .end(function(err) {
                if (err) {
                    return done(err);
                }

                expect(errorCalls).to.equal(0);
                done();
            });
    });

    it('responds with 400 for malformed JSON payloads', function(done) {
        request(app)
            .post('/v1/GetLocationHistory')
            .set('Content-Type', 'application/json')
            .send('{"MiataruGetLocationHistory":{')
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }

                expect(res.body)
                    .to.have.property('error')
                    .that.is.a('string')
                    .and.contains('JSON');
                expect(errorCalls).to.equal(0);
                done();
            });
    });
});
