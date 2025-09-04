var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestDevice = require('../../lib/models/RequestDevice');

describe('RequestDevice', function() {

    describe('constructor', function() {
        it('should throw BadRequestError when no arguments provided', function() {
            expect(function() {
                new RequestDevice();
            }).to.throw(errors.BadRequestError, 'missing data');
        });

        it('should throw BadRequestError when null is passed', function() {
            expect(function() {
                new RequestDevice(null);
            }).to.throw(errors.BadRequestError, 'missing data');
        });

        it('should throw BadRequestError when undefined is passed', function() {
            expect(function() {
                new RequestDevice(undefined);
            }).to.throw(errors.BadRequestError, 'missing data');
        });

        it('should throw BadRequestError when empty object is passed', function() {
            expect(function() {
                new RequestDevice({});
            }).to.throw(errors.BadRequestError, 'missing device');
        });

        it('should throw BadRequestError when data object has no Device property', function() {
            expect(function() {
                new RequestDevice({ someOtherProperty: 'value' });
            }).to.throw(errors.BadRequestError, 'missing device');
        });

        it('should throw BadRequestError when Device property is null', function() {
            expect(function() {
                new RequestDevice({ Device: null });
            }).to.throw(errors.BadRequestError, 'missing device');
        });

        it('should throw BadRequestError when Device property is undefined', function() {
            expect(function() {
                new RequestDevice({ Device: undefined });
            }).to.throw(errors.BadRequestError, 'missing device');
        });

        it('should throw BadRequestError when Device property is empty string', function() {
            expect(function() {
                new RequestDevice({ Device: '' });
            }).to.throw(errors.BadRequestError, 'missing device');
        });

        it('should create instance successfully when valid Device is provided', function() {
            var requestDevice = new RequestDevice({ Device: 'test-device-id' });
            expect(requestDevice).to.be.an.instanceof(RequestDevice);
            expect(requestDevice.device()).to.equal('test-device-id');
        });

        it('should create instance successfully when Device is 0', function() {
            var requestDevice = new RequestDevice({ Device: 0 });
            expect(requestDevice).to.be.an.instanceof(RequestDevice);
            expect(requestDevice.device()).to.equal(0);
        });

        it('should create instance successfully when Device is false', function() {
            var requestDevice = new RequestDevice({ Device: false });
            expect(requestDevice).to.be.an.instanceof(RequestDevice);
            expect(requestDevice.device()).to.equal(false);
        });
    });

    describe('device method', function() {
        it('should return the device value', function() {
            var deviceId = 'my-device-123';
            var requestDevice = new RequestDevice({ Device: deviceId });
            expect(requestDevice.device()).to.equal(deviceId);
        });
    });

});
