const expect = require('chai').expect;
const request = require('supertest');

const app = require('../../server');
const db = require('../../lib/db');
const kb = require('../../lib/utils/keyBuilder');
const configuration = require('../../lib/configuration');

const TEST_DEVICE = '5C93A7F3-1C74-4A4B-B861-578CA9C5E4F9';
const HISTORY_KEY = kb.build(TEST_DEVICE, 'hist');

function pushHistoryEntries(count, callback) {
    const entries = [];

    for (let index = 0; index < count; index += 1) {
        entries.push(JSON.stringify({
            Device: TEST_DEVICE,
            Timestamp: 1700000000000 + index,
            Longitude: (10 + index / 1000).toFixed(6),
            Latitude: (50 + index / 1000).toFixed(6)
        }));
    }

    const args = [HISTORY_KEY].concat(entries);
    args.push(callback);

    db.lpush.apply(db, args);
}

describe('GetLocationHistory large history retrieval', function() {
    this.timeout(10000);
    const originalMaximum = configuration.maximumNumberOfHistoryItems;

    before(function() {
        configuration.maximumNumberOfHistoryItems = 1500;
    });

    after(function() {
        configuration.maximumNumberOfHistoryItems = originalMaximum;
    });

    beforeEach(function(done) {
        db.del(HISTORY_KEY, done);
    });

    it('should return more than 1000 history entries without failing', function(done) {
        const requestedEntries = 1100;

        pushHistoryEntries(requestedEntries, function(err) {
            if (err) {
                return done(err);
            }

            request(app)
                .post('/GetLocationHistory')
                .send({
                    MiataruGetLocationHistory: {
                        Device: TEST_DEVICE,
                        Amount: String(requestedEntries)
                    },
                    MiataruConfig: {
                        RequestMiataruDeviceID: 'integration-test-client'
                    }
                })
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.be.an('object');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.lengthOf(requestedEntries);
                    expect(res.body.MiataruServerConfig).to.be.an('object');
                    expect(res.body.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(1500);
                    expect(res.body.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(requestedEntries);
                    expect(res.body.MiataruLocation[0].Timestamp).to.equal(1700000000000 + requestedEntries - 1);
                })
                .end(done);
        });
    });

    it('should also support the v1 endpoint with large history responses', function(done) {
        const requestedEntries = 1100;

        pushHistoryEntries(requestedEntries, function(err) {
            if (err) {
                return done(err);
            }

            request(app)
                .post('/v1/GetLocationHistory')
                .send({
                    MiataruGetLocationHistory: {
                        Device: TEST_DEVICE,
                        Amount: String(requestedEntries)
                    },
                    MiataruConfig: {
                        RequestMiataruDeviceID: 'integration-test-client'
                    }
                })
                .expect(200)
                .expect(function(res) {
                    expect(res.body).to.be.an('object');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation).to.have.lengthOf(requestedEntries);
                    expect(res.body.MiataruServerConfig).to.be.an('object');
                    expect(res.body.MiataruServerConfig.MaximumNumberOfLocationUpdates).to.equal(1500);
                    expect(res.body.MiataruServerConfig.AvailableDeviceLocationUpdates).to.equal(requestedEntries);
                    expect(res.body.MiataruLocation[0].Timestamp).to.equal(1700000000000 + requestedEntries - 1);
                })
                .end(done);
        });
    });
});
