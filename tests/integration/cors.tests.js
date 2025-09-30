var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var logger = require('../../lib/logger');

describe('CORS middleware', function() {

    describe('OPTIONS preflight requests', function() {
        it('should allow preflight requests from allowed origins', function(done) {
            request(app)
                .options('/')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET')
                .set('Access-Control-Request-Headers', 'Content-Type')
                .expect(204)
                .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
                .expect('Access-Control-Allow-Credentials', 'true')
                .expect('Access-Control-Allow-Methods', /GET/)
                .expect('Access-Control-Allow-Headers', /Content-Type/)
                .end(done);
        });

        it('should allow preflight requests from test allowed origins', function(done) {
            request(app)
                .options('/')
                .set('Origin', 'http://test.example.com')
                .set('Access-Control-Request-Method', 'POST')
                .set('Access-Control-Request-Headers', 'Authorization')
                .expect(204)
                .expect('Access-Control-Allow-Origin', 'http://test.example.com')
                .expect('Access-Control-Allow-Credentials', 'true')
                .expect('Access-Control-Allow-Methods', /POST/)
                .expect('Access-Control-Allow-Headers', /Authorization/)
                .end(done);
        });

        it('should reject preflight requests from disallowed origins', function(done) {
            request(app)
                .get('/')
                .set('Origin', 'http://malicious-site.com')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.headers).to.not.have.property('access-control-allow-origin');
                    done();
                });
        });
    });

    describe('Actual requests', function() {
        it('should allow GET requests from allowed origins', function(done) {
            request(app)
                .get('/')
                .set('Origin', 'http://localhost:3000')
                .expect(200)
                .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
                .expect('Access-Control-Allow-Credentials', 'true')
                .end(done);
        });

        it('should allow POST requests from allowed origins', function(done) {
            request(app)
                .post('/UpdateLocation')
                .set('Origin', 'http://test.example.com')
                .set('Content-Type', 'application/json')
                .send({
                    "MiataruConfig": {
                        "EnableLocationHistory": "True",
                        "MaximumNumberOfLocationHistory": "10",
                        "LocationDataRetentionTime": "30"
                    },
                    "MiataruLocation": [{
                        "Device": "test-device",
                        "Timestamp": "2013-06-22T19:56:35.000Z",
                        "Longitude": "13.404954",
                        "Latitude": "52.520008",
                        "HorizontalAccuracy": "50.00"
                    }]
                })
                .expect(200)
                .expect('Access-Control-Allow-Origin', 'http://test.example.com')
                .expect('Access-Control-Allow-Credentials', 'true')
                .end(done);
        });

        it('should reject requests from disallowed origins', function(done) {
            request(app)
                .get('/')
                .set('Origin', 'http://unauthorized-site.com')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    expect(res.headers).to.not.have.property('access-control-allow-origin');
                    done();
                });
        });

        it('should allow requests with no origin (mobile apps, curl, etc.)', function(done) {
            request(app)
                .get('/')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    // When there's no origin, CORS headers should not be present
                    expect(res.headers).to.not.have.property('access-control-allow-origin');
                    done();
                });
        });
    });

    describe('CORS headers validation', function() {
        it('should include proper CORS headers for allowed origins', function(done) {
            request(app)
                .get('/')
                .set('Origin', 'http://test.example.com')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    
                    expect(res.headers).to.have.property('access-control-allow-origin', 'http://test.example.com');
                    expect(res.headers).to.have.property('access-control-allow-credentials', 'true');
                    
                    done();
                });
        });
    });

    describe('Error handling', function() {
        it('should handle CORS errors gracefully', function(done) {
            request(app)
                .get('/')
                .set('Origin', 'http://blocked-domain.com')
                .expect(200)
                .end(function(err, res) {
                    if (err) return done(err);
                    // CORS rejection means no CORS headers are present
                    expect(res.headers).to.not.have.property('access-control-allow-origin');
                    done();
                });
        });
    });

    describe('Location endpoint preflight', function() {
        var originalLoggerError;

        beforeEach(function() {
            originalLoggerError = logger.error;
        });

        afterEach(function() {
            logger.error = originalLoggerError;
        });

        it('should allow OPTIONS requests without logging errors', function(done) {
            var errorLogged = false;

            logger.error = function() {
                errorLogged = true;
            };

            request(app)
                .options('/v1/GetLocation')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST')
                .set('Access-Control-Request-Headers', 'Content-Type')
                .expect(204)
                .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
                .expect('Access-Control-Allow-Credentials', 'true')
                .expect('Access-Control-Allow-Methods', /POST/)
                .expect('Access-Control-Allow-Headers', /Content-Type/)
                .end(function(err) {
                    if (err) return done(err);

                    if (errorLogged) {
                        return done(new Error('Expected no logger.error invocations for OPTIONS /v1/GetLocation'));
                    }

                    done();
                });
        });
    });

});
