const expect = require('chai').expect;
const request = require('supertest');

const app = require('../../server');
const db = require('../../lib/db');
const kb = require('../../lib/utils/keyBuilder');

const TEST_DEVICE = 'TEST-DEVICE-0000-0000-0000-000000000001';
const HISTORY_KEY = kb.build(TEST_DEVICE, 'hist');

describe('GetLocationHistory JSON parsing error reproduction', function() {
    beforeEach(function(done) {
        db.del(HISTORY_KEY, done);
    });

    it('should handle Amount=1000 without JSON parsing errors', function(done) {
        // This is the exact request from the user's log that's failing
        const requestBody = {
            "MiataruConfig": {
                "RequestMiataruDeviceID": "miataru-web-app"
            },
            "MiataruGetLocationHistory": {
                "Amount": "1000",
                "Device": TEST_DEVICE
            }
        };

        request(app)
            .post('/v1/GetLocationHistory')
            .set('Content-Type', 'application/json')
            .send(requestBody)
            .expect(function(res) {
                // Should not get a 400 parsing error
                expect(res.status).to.not.equal(400);
                if (res.status === 400 && res.body && res.body.error) {
                    throw new Error('Got 400 error: ' + res.body.error);
                }
            })
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('object');
                done();
            });
    });

    it('should handle Amount=100 without errors (baseline)', function(done) {
        const requestBody = {
            "MiataruConfig": {
                "RequestMiataruDeviceID": "miataru-web-app"
            },
            "MiataruGetLocationHistory": {
                "Amount": "100",
                "Device": TEST_DEVICE
            }
        };

        request(app)
            .post('/v1/GetLocationHistory')
            .set('Content-Type', 'application/json')
            .send(requestBody)
            .expect(200)
            .expect(function(res) {
                expect(res.body).to.be.an('object');
                expect(res.body.MiataruLocation).to.be.an('array');
            })
            .end(done);
    });

    it('should handle the exact request body from the error log', function(done) {
        // The exact body from the user's error log (original content-length=155)
        // Note: Using a test device ID instead of the original, so length will differ
        const requestBodyString = '{"MiataruConfig":{"RequestMiataruDeviceID":"miataru-web-app"},"MiataruGetLocationHistory":{"Amount":"1000","Device":"TEST-DEVICE-0000-0000-0000-000000000001"}}';
        
        // Verify the string length is reasonable (original was 155-156, new is longer due to test device ID)
        expect(requestBodyString.length).to.be.at.least(155);
        expect(requestBodyString.length).to.be.at.most(165);

        request(app)
            .post('/v1/GetLocationHistory')
            .set('Content-Type', 'application/json')
            .set('Content-Length', String(requestBodyString.length))
            .send(requestBodyString)
            .expect(function(res) {
                // Should not get a 400 parsing error
                expect(res.status).to.not.equal(400);
                if (res.status === 400 && res.body && res.body.error) {
                    throw new Error('Got 400 parsing error: ' + res.body.error);
                }
            })
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                expect(res.status).to.equal(200);
                done();
            });
    });

    it('should handle various Amount values without parsing errors', function(done) {
        const amounts = ['100', '500', '1000', '1500', '2000'];
        let completed = 0;
        let hasError = false;

        amounts.forEach(function(amount) {
            const requestBody = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "miataru-web-app"
                },
                "MiataruGetLocationHistory": {
                    "Amount": amount,
                    "Device": TEST_DEVICE
                }
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .set('Content-Type', 'application/json')
                .send(requestBody)
                .end(function(err, res) {
                    completed++;
                    
                    if (err || res.status === 400) {
                        hasError = true;
                        console.error('Failed for Amount=' + amount + ': status=' + res.status + ', error=' + (res.body && res.body.error));
                    }
                    
                    if (completed === amounts.length) {
                        if (hasError) {
                            return done(new Error('One or more Amount values caused parsing errors'));
                        }
                        done();
                    }
                });
        });
    });
});
