var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestSetDeviceKey = require('../../lib/models/RequestSetDeviceKey');

describe('RequestSetDeviceKey', function() {

    describe('constructor', function() {
        it('should throw BadRequestError when DeviceID is missing', function() {
            expect(function() {
                new RequestSetDeviceKey({});
            }).to.throw(errors.BadRequestError, 'missing DeviceID');
        });

        it('should throw BadRequestError when NewDeviceKey is missing', function() {
            expect(function() {
                new RequestSetDeviceKey({ DeviceID: 'test-device' });
            }).to.throw(errors.BadRequestError, 'missing NewDeviceKey');
        });

        it('should throw BadRequestError when NewDeviceKey exceeds 256 characters', function() {
            var longKey = 'a'.repeat(257);
            expect(function() {
                new RequestSetDeviceKey({
                    DeviceID: 'test-device',
                    NewDeviceKey: longKey
                });
            }).to.throw(errors.BadRequestError, '256 characters');
        });

        it('should accept valid request with DeviceID and NewDeviceKey', function() {
            var request = new RequestSetDeviceKey({
                DeviceID: 'test-device',
                NewDeviceKey: 'test-key-123'
            });
            expect(request.deviceId()).to.equal('test-device');
            expect(request.newDeviceKey()).to.equal('test-key-123');
            expect(request.currentDeviceKey()).to.be.null;
        });

        it('should accept CurrentDeviceKey as null for first-time setup', function() {
            var request = new RequestSetDeviceKey({
                DeviceID: 'test-device',
                CurrentDeviceKey: null,
                NewDeviceKey: 'test-key-123'
            });
            expect(request.currentDeviceKey()).to.be.null;
        });

        it('should accept CurrentDeviceKey as empty string for first-time setup', function() {
            var request = new RequestSetDeviceKey({
                DeviceID: 'test-device',
                CurrentDeviceKey: '',
                NewDeviceKey: 'test-key-123'
            });
            expect(request.currentDeviceKey()).to.be.null;
        });

        it('should accept CurrentDeviceKey when provided', function() {
            var request = new RequestSetDeviceKey({
                DeviceID: 'test-device',
                CurrentDeviceKey: 'old-key',
                NewDeviceKey: 'new-key'
            });
            expect(request.currentDeviceKey()).to.equal('old-key');
        });

        it('should accept NewDeviceKey with exactly 256 characters', function() {
            var key256 = 'a'.repeat(256);
            var request = new RequestSetDeviceKey({
                DeviceID: 'test-device',
                NewDeviceKey: key256
            });
            expect(request.newDeviceKey()).to.equal(key256);
        });

        it('should accept unicode characters in NewDeviceKey', function() {
            var unicodeKey = '测试-ключ-🔑';
            var request = new RequestSetDeviceKey({
                DeviceID: 'test-device',
                NewDeviceKey: unicodeKey
            });
            expect(request.newDeviceKey()).to.equal(unicodeKey);
        });
    });
});
