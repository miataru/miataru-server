var expect = require('chai').expect;

var RequestConfig = require('../../lib/models/RequestConfig');

describe('dataHolders', function() {

    describe('config', function() {
        it('should throw because of invalid data', function() {
            expect(function() { new RequestConfig() }).to.throw();
        });
    });

    describe('location', function() {

    });

});