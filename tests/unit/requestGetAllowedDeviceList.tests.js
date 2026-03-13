var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestGetAllowedDeviceList = require('../../lib/models/RequestGetAllowedDeviceList');

describe('RequestGetAllowedDeviceList', function() {
    it('should throw BadRequestError when DeviceID is missing', function() {
        expect(function() {
            new RequestGetAllowedDeviceList({});
        }).to.throw(errors.BadRequestError, 'missing DeviceID');
    });

    it('should throw BadRequestError when DeviceKey is missing', function() {
        expect(function() {
            new RequestGetAllowedDeviceList({ DeviceID: 'test-device' });
        }).to.throw(errors.BadRequestError, 'missing DeviceKey');
    });

    it('should reject DeviceID values with colons', function() {
        expect(function() {
            new RequestGetAllowedDeviceList({
                DeviceID: 'test:device',
                DeviceKey: 'test-key'
            });
        }).to.throw(errors.BadRequestError, 'DeviceID must not contain ":"');
    });

    it('should accept valid requests', function() {
        var request = new RequestGetAllowedDeviceList({
            DeviceID: 'test-device',
            DeviceKey: 'test-key'
        });

        expect(request.deviceId()).to.equal('test-device');
        expect(request.deviceKey()).to.equal('test-key');
    });
});
