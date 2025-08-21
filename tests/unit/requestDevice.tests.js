var expect = require('chai').expect;

var RequestDevice = require('../../lib/models/RequestDevice');
var errors = require('../../lib/errors');

describe('RequestDevice', function() {
    it('should throw on missing device', function() {
        expect(function() {
            new RequestDevice();
        }).to.throw(errors.BadRequestError);
    });
});

