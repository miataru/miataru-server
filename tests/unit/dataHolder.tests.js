var expect = require('chai').expect;

var RequestConfig = require('../../lib/models/RequestConfig');

describe('dataHolders', function() {

    describe('config', function() {
        it('should throw because of invalid data', function() {
            expect(function() { new RequestConfig() }).to.throw();
        });

        it('should throw when EnableLocationHistory is numeric', function() {
            expect(function() {
                new RequestConfig({
                    EnableLocationHistory: 1,
                    LocationDataRetentionTime: '15'
                });
            }).to.throw();
        });

        it('should throw when EnableLocationHistory is boolean', function() {
            expect(function() {
                new RequestConfig({
                    EnableLocationHistory: true,
                    LocationDataRetentionTime: '15'
                });
            }).to.throw();
        });
    });

    describe('location', function() {

    });

});