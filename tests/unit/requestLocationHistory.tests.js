var expect = require('chai').expect;
var errors = require('../../lib/errors');
var RequestLocationHistory = require('../../lib/models/RequestLocationHistory');

describe('RequestLocationHistory', function() {
    it('should accept object payloads', function() {
        var request = new RequestLocationHistory({
            Device: 'test-device',
            Amount: '5'
        });

        expect(request.device()).to.equal('test-device');
        expect(request.amount()).to.equal(5);
    });

    it('should accept JSON string payloads', function() {
        var request = new RequestLocationHistory('{"Device":"test-device","Amount":"5"}');
        expect(request.device()).to.equal('test-device');
        expect(request.amount()).to.equal(5);
    });

    it('should accept legacy query-style payloads', function() {
        var request = new RequestLocationHistory('Device=test-device&Amount=5');
        expect(request.device()).to.equal('test-device');
        expect(request.amount()).to.equal(5);
    });

    it('should reject legacy payloads using semicolons', function() {
        expect(function() {
            new RequestLocationHistory('Device=test-device;Amount=5');
        }).to.throw(errors.BadRequestError, 'must use "&" and "=" only');
    });

    it('should reject legacy payloads using colons as separators', function() {
        expect(function() {
            new RequestLocationHistory('Device:test-device&Amount:5');
        }).to.throw(errors.BadRequestError, 'must use "&" and "=" only');
    });

    it('should reject duplicate keys', function() {
        expect(function() {
            new RequestLocationHistory('Device=test-device&Amount=5&Amount=6');
        }).to.throw(errors.BadRequestError, 'duplicate GetLocationHistory key');
    });

    it('should reject device values with colons', function() {
        expect(function() {
            new RequestLocationHistory({
                Device: 'test:device',
                Amount: '5'
            });
        }).to.throw(errors.BadRequestError, 'Device must not contain ":"');
    });

    it('should require Amount to be a positive integer', function() {
        expect(function() {
            new RequestLocationHistory({
                Device: 'test-device',
                Amount: '5.5'
            });
        }).to.throw(errors.BadRequestError, 'Amount must be an integer');
    });
});
