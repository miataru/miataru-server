var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var db = require('../../lib/db');
var kb = require('../../lib/utils/keyBuilder');
var allowedDevicesUtils = require('../../lib/utils/allowedDevices');

describe('getAllowedDeviceList validation integration', function() {
    var TEST_DEVICE = 'get-allowed-validation-' + Date.now();
    var ALLOWED_SUFFIX = 'allowed';
    var ENABLED_FLAG_SUFFIX = 'allowed:enabled';

    function cleanup(done) {
        db.del(kb.build(TEST_DEVICE, ALLOWED_SUFFIX), function() {
            db.del(kb.build(TEST_DEVICE, ENABLED_FLAG_SUFFIX), done);
        });
    }

    beforeEach(function(done) {
        cleanup(done);
    });

    afterEach(function(done) {
        cleanup(done);
    });

    it('should read existing allowed list without migration', function(done) {
        allowedDevicesUtils.setAllowedDevices(TEST_DEVICE, [
            {
                DeviceID: 'reader-device',
                hasCurrentLocationAccess: true,
                hasHistoryAccess: true
            }
        ], function(error) {
            if (error) return done(error);

            request(app)
                .post('/v1/getAllowedDeviceList')
                .send({
                    MiataruGetAllowedDeviceList: {
                        DeviceID: TEST_DEVICE,
                        DeviceKey: 'unused-when-no-key-is-set'
                    }
                })
                .expect(200)
                .expect(function(res) {
                    expect(res.body.MiataruAllowedDeviceList.IsAllowedDeviceListEnabled).to.equal(true);
                    expect(res.body.MiataruAllowedDeviceList.allowedDevices).to.have.length(1);
                })
                .end(done);
        });
    });
});
