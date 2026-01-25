var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestSetAllowedDeviceList = require('../../lib/models/RequestSetAllowedDeviceList');

describe('RequestSetAllowedDeviceList', function() {

    describe('constructor', function() {
        it('should throw BadRequestError when DeviceID is missing', function() {
            expect(function() {
                new RequestSetAllowedDeviceList({});
            }).to.throw(errors.BadRequestError, 'missing DeviceID');
        });

        it('should throw BadRequestError when DeviceKey is missing', function() {
            expect(function() {
                new RequestSetAllowedDeviceList({ DeviceID: 'test-device' });
            }).to.throw(errors.BadRequestError, 'missing DeviceKey');
        });

        it('should throw BadRequestError when allowedDevices is missing', function() {
            expect(function() {
                new RequestSetAllowedDeviceList({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key'
                });
            }).to.throw(errors.BadRequestError, 'missing allowedDevices');
        });

        it('should throw BadRequestError when allowedDevices is not an array', function() {
            expect(function() {
                new RequestSetAllowedDeviceList({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key',
                    allowedDevices: 'not-an-array'
                });
            }).to.throw(errors.BadRequestError, 'must be an array');
        });

        it('should throw BadRequestError when allowedDevices exceeds 256 elements', function() {
            var allowedDevices = [];
            for (var i = 0; i < 257; i++) {
                allowedDevices.push({ DeviceID: 'device' + i, hasCurrentLocationAccess: true, hasHistoryAccess: false });
            }
            expect(function() {
                new RequestSetAllowedDeviceList({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key',
                    allowedDevices: allowedDevices
                });
            }).to.throw(errors.BadRequestError, '256');
        });

        it('should accept valid request with all required fields', function() {
            var request = new RequestSetAllowedDeviceList({
                DeviceID: 'test-device',
                DeviceKey: 'test-key',
                allowedDevices: [
                    { DeviceID: 'device1', hasCurrentLocationAccess: true, hasHistoryAccess: false }
                ]
            });
            expect(request.deviceId()).to.equal('test-device');
            expect(request.deviceKey()).to.equal('test-key');
            expect(request.allowedDevices()).to.have.length(1);
        });

        it('should set default values for missing boolean fields', function() {
            var request = new RequestSetAllowedDeviceList({
                DeviceID: 'test-device',
                DeviceKey: 'test-key',
                allowedDevices: [
                    { DeviceID: 'device1' }
                ]
            });
            var devices = request.allowedDevices();
            expect(devices[0].hasCurrentLocationAccess).to.be.false;
            expect(devices[0].hasHistoryAccess).to.be.false;
        });

        it('should validate DeviceID in allowedDevices', function() {
            expect(function() {
                new RequestSetAllowedDeviceList({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key',
                    allowedDevices: [
                        { hasCurrentLocationAccess: true }
                    ]
                });
            }).to.throw(errors.BadRequestError, 'DeviceID');
        });

        it('should validate boolean fields in allowedDevices', function() {
            expect(function() {
                new RequestSetAllowedDeviceList({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key',
                    allowedDevices: [
                        { DeviceID: 'device1', hasCurrentLocationAccess: 'not-boolean' }
                    ]
                });
            }).to.throw(errors.BadRequestError, 'boolean');
        });

        it('should accept empty array', function() {
            var request = new RequestSetAllowedDeviceList({
                DeviceID: 'test-device',
                DeviceKey: 'test-key',
                allowedDevices: []
            });
            expect(request.allowedDevices()).to.have.length(0);
        });

        it('should accept array with exactly 256 elements', function() {
            var allowedDevices = [];
            for (var i = 0; i < 256; i++) {
                allowedDevices.push({ DeviceID: 'device' + i, hasCurrentLocationAccess: true, hasHistoryAccess: false });
            }
            var request = new RequestSetAllowedDeviceList({
                DeviceID: 'test-device',
                DeviceKey: 'test-key',
                allowedDevices: allowedDevices
            });
            expect(request.allowedDevices()).to.have.length(256);
        });
    });
});
