var expect = require('chai').expect;

var keyBuilder = require('../../lib/utils/keyBuilder');

describe('stuff', function() {

    describe('keybuilder', function() {
        it('should use only the main namespace', function() {
            expect(keyBuilder.build()).to.equal('miadTest');
        });

        it('should use all the parameters to build a key', function() {
            expect(keyBuilder.build('foo', 'bar')).to.equal('miadTest:foo:bar');
        });
    });

});