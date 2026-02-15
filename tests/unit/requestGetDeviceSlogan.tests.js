var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestGetDeviceSlogan = require('../../lib/models/RequestGetDeviceSlogan');

describe('RequestGetDeviceSlogan', function() {

    describe('constructor', function() {
        it('should throw BadRequestError when DeviceID is missing', function() {
            expect(function() {
                new RequestGetDeviceSlogan({});
            }).to.throw(errors.BadRequestError, 'missing DeviceID');
        });

        it('should throw BadRequestError when RequestDeviceID is missing', function() {
            expect(function() {
                new RequestGetDeviceSlogan({
                    DeviceID: 'target-device'
                });
            }).to.throw(errors.BadRequestError, 'missing RequestDeviceID');
        });

        it('should throw BadRequestError when RequestDeviceKey is missing', function() {
            expect(function() {
                new RequestGetDeviceSlogan({
                    DeviceID: 'target-device',
                    RequestDeviceID: 'request-device'
                });
            }).to.throw(errors.BadRequestError, 'missing RequestDeviceKey');
        });

        it('should throw BadRequestError when RequestDeviceKey exceeds 256 characters', function() {
            expect(function() {
                new RequestGetDeviceSlogan({
                    DeviceID: 'target-device',
                    RequestDeviceID: 'request-device',
                    RequestDeviceKey: 'a'.repeat(257)
                });
            }).to.throw(errors.BadRequestError, '256');
        });

        it('should accept valid request', function() {
            var request = new RequestGetDeviceSlogan({
                DeviceID: 'target-device',
                RequestDeviceID: 'request-device',
                RequestDeviceKey: 'request-key'
            });

            expect(request.deviceId()).to.equal('target-device');
            expect(request.requestDeviceID()).to.equal('request-device');
            expect(request.requestDeviceKey()).to.equal('request-key');
        });

        it('should accept RequestMiataru aliases', function() {
            var request = new RequestGetDeviceSlogan({
                DeviceID: 'target-device',
                RequestMiataruDeviceID: 'request-device',
                RequestMiataruDeviceKey: 'request-key'
            });

            expect(request.requestDeviceID()).to.equal('request-device');
            expect(request.requestDeviceKey()).to.equal('request-key');
        });

        it('should accept legacy requestingDevice aliases', function() {
            var request = new RequestGetDeviceSlogan({
                DeviceID: 'target-device',
                requestingDeviceID: 'request-device',
                requestingDeviceKey: 'request-key'
            });

            expect(request.requestDeviceID()).to.equal('request-device');
            expect(request.requestDeviceKey()).to.equal('request-key');
        });
    });

    describe('requestVisitorObject', function() {
        it('should return null when request device equals target device', function() {
            var request = new RequestGetDeviceSlogan({
                DeviceID: 'target-device',
                RequestDeviceID: 'same-device',
                RequestDeviceKey: 'request-key'
            });

            expect(request.requestVisitorObject('same-device')).to.equal(null);
        });

        it('should return visitor object for different requester', function() {
            var request = new RequestGetDeviceSlogan({
                DeviceID: 'target-device',
                RequestDeviceID: 'request-device',
                RequestDeviceKey: 'request-key'
            });

            var visitor = request.requestVisitorObject('target-device');
            expect(visitor.DeviceID).to.equal('request-device');
            expect(visitor.TimeStamp).to.be.a('number');
        });
    });
});
