var expect = require('chai').expect;

var RequestLocationHistory = require('../../../lib/models/RequestLocationHistory');

function build(entries) {
    return new RequestLocationHistory(entries);
}

describe('RequestLocationHistory', function() {
    it('should accept Amount before Device within a plain object', function() {
        var request = build({
            Amount: '5',
            Device: 'order-device'
        });

        expect(request.device()).to.equal('order-device');
        expect(request.amount()).to.equal(5);
    });

    it('should pick values from multiple objects regardless of order', function() {
        var request = build([
            { Amount: '3' },
            { Device: 'array-device' }
        ]);

        expect(request.device()).to.equal('array-device');
        expect(request.amount()).to.equal(3);
    });

    it('should unwrap nested arrays when searching for data', function() {
        var request = build([
            [{ amount: '7' }],
            { DEVICE: 'nested-device' }
        ]);

        expect(request.device()).to.equal('nested-device');
        expect(request.amount()).to.equal(7);
    });

    it('should parse JSON strings containing the payload', function() {
        var payload = JSON.stringify({ Amount: '9', Device: 'string-device' });
        var request = build(payload);

        expect(request.device()).to.equal('string-device');
        expect(request.amount()).to.equal(9);
    });

    it('should throw when required fields are missing', function() {
        expect(function() {
            build({ Amount: '5' });
        }).to.throw(/missing device or amount/);

        expect(function() {
            build({ Device: 'only-device' });
        }).to.throw(/missing device or amount/);
    });
});
