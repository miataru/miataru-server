var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestSetDeviceSlogan = require('../../lib/models/RequestSetDeviceSlogan');

describe('RequestSetDeviceSlogan', function() {

    describe('constructor', function() {
        it('should throw BadRequestError when DeviceID is missing', function() {
            expect(function() {
                new RequestSetDeviceSlogan({});
            }).to.throw(errors.BadRequestError, 'missing DeviceID');
        });

        it('should throw BadRequestError when DeviceKey is missing', function() {
            expect(function() {
                new RequestSetDeviceSlogan({
                    DeviceID: 'test-device'
                });
            }).to.throw(errors.BadRequestError, 'missing DeviceKey');
        });

        it('should throw BadRequestError when Slogan is missing', function() {
            expect(function() {
                new RequestSetDeviceSlogan({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key'
                });
            }).to.throw(errors.BadRequestError, 'missing Slogan');
        });

        it('should throw BadRequestError when Slogan exceeds 40 characters', function() {
            var longSlogan = 'a'.repeat(41);
            expect(function() {
                new RequestSetDeviceSlogan({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key',
                    Slogan: longSlogan
                });
            }).to.throw(errors.BadRequestError, '40 characters');
        });

        it('should throw BadRequestError when Slogan contains control characters', function() {
            expect(function() {
                new RequestSetDeviceSlogan({
                    DeviceID: 'test-device',
                    DeviceKey: 'test-key',
                    Slogan: 'hello\nworld'
                });
            }).to.throw(errors.BadRequestError, 'control characters');
        });

        it('should accept valid request', function() {
            var request = new RequestSetDeviceSlogan({
                DeviceID: 'test-device',
                DeviceKey: 'test-key',
                Slogan: 'My short slogan'
            });

            expect(request.deviceId()).to.equal('test-device');
            expect(request.deviceKey()).to.equal('test-key');
            expect(request.slogan()).to.equal('My short slogan');
        });

        it('should accept empty string slogan', function() {
            var request = new RequestSetDeviceSlogan({
                DeviceID: 'test-device',
                DeviceKey: 'test-key',
                Slogan: ''
            });

            expect(request.slogan()).to.equal('');
        });
    });
});
