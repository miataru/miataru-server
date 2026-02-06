var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');

describe('security review coverage', function() {
    it('rejects invalid JSON payloads with 400', function(done) {
        request(app)
            .post('/v1/UpdateLocation')
            .set('Content-Type', 'application/json')
            .send('{"MiataruLocation":')
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }

                expect(res.body).to.have.property('error');
                done();
            });
    });

    it('enforces JSON body size limits to mitigate large payload abuse', function(done) {
        this.timeout(10000);

        var filler = 'a'.repeat(10 * 1024 * 1024 + 1024);
        var payload = '{"MiataruLocation":[{"Device":"device-1","Timestamp":"1","Longitude":"1","Latitude":"1","HorizontalAccuracy":"1","Extra":"' + filler + '"}]}';

        request(app)
            .post('/v1/UpdateLocation')
            .set('Content-Type', 'application/json')
            .send(payload)
            .expect(413)
            .end(done);
    });

    it('rejects update requests with missing required location fields', function(done) {
        request(app)
            .post('/v1/UpdateLocation')
            .set('Content-Type', 'application/json')
            .send('{}')
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }

                expect(res.body.error).to.match(/Bad Request/);
                done();
            });
    });

    it('rejects invalid history requests with missing amount', function(done) {
        request(app)
            .post('/v1/GetLocationHistory')
            .set('Content-Type', 'application/json')
            .send('{"MiataruGetLocationHistory":{"Device":"device-1","Amount":0}}')
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }

                expect(res.body.error).to.match(/missing device or amount/i);
                done();
            });
    });

    it('adds CORS headers for allowed origins', function(done) {
        request(app)
            .post('/v1/GetLocation')
            .set('Origin', 'http://localhost:3000')
            .set('Content-Type', 'application/json')
            .send('{"MiataruGetLocation":[{"Device":"device-1"}]}')
            .expect(function(res) {
                expect(res.headers).to.have.property('access-control-allow-origin', 'http://localhost:3000');
            })
            .end(done);
    });

    it('does not add CORS headers for disallowed origins', function(done) {
        request(app)
            .post('/v1/GetLocation')
            .set('Origin', 'https://malicious.example.com')
            .set('Content-Type', 'application/json')
            .send('{"MiataruGetLocation":[{"Device":"device-1"}]}')
            .expect(function(res) {
                expect(res.headers).to.not.have.property('access-control-allow-origin');
            })
            .end(done);
    });
});
