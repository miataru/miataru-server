var expect = require('chai').expect;

var Config = require('../lib/models/Location');

describe('dataHolders', function() {

    describe('config', function() {
        it('should throw because of invalid data', function() {
            expect(function() { new Config() }).to.throw();
        });
    });

    describe('location', function() {

    });

});