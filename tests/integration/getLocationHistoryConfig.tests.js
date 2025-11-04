const expect = require('chai').expect;
const request = require('supertest');

const app = require('../../server');
const db = require('../../lib/db');
const kb = require('../../lib/utils/keyBuilder');

const TEST_DEVICE = '2FF802EA-0F13-41D7-B392-2841E97371C2';
const HISTORY_KEY = kb.build(TEST_DEVICE, 'hist');

describe('GetLocationHistory with MiataruConfig', function() {
    beforeEach(function(done) {
        db.del(HISTORY_KEY, done);
    });

    function requestBody() {
        return {
            "MiataruConfig": {
                "RequestMiataruDeviceID": "miataru-web-app"
            },
            "MiataruGetLocationHistory": {
                "Amount": "1000",
                "Device": TEST_DEVICE
            }
        };
    }

    it('should return an empty history when only config and device/amount are provided', function(done) {
        request(app)
            .post('/GetLocationHistory')
            .send(requestBody())
            .expect(200)
            .expect(function(res) {
                expect(res.body.MiataruServerConfig).to.be.an('object');
                expect(res.body.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(0);
                expect(res.body.MiataruLocation).to.be.an('array').that.is.empty;
            })
            .end(done);
    });

    it('should ignore invalid history entries instead of failing the request', function(done) {
        const validEntry = JSON.stringify({
            Device: TEST_DEVICE,
            Timestamp: 1700000000000,
            Longitude: '10.0',
            Latitude: '50.0',
            HorizontalAccuracy: '5.0'
        });

        db.lpush(HISTORY_KEY, '{"Device":"' + TEST_DEVICE, function(err) {
            if (err) return done(err);

            db.lpush(HISTORY_KEY, validEntry, function(pushErr) {
                if (pushErr) return done(pushErr);

                request(app)
                    .post('/GetLocationHistory')
                    .send(requestBody())
                    .expect(200)
                    .expect(function(res) {
                        expect(res.body.MiataruLocation).to.be.an('array').with.length(1);
                        expect(res.body.MiataruLocation[0].Device).to.equal(TEST_DEVICE);
                    })
                    .end(done);
            });
        });
    });
});
