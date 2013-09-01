var path = require('path');

var expect = require('chai').expect;

var configLoader = require('../../lib/utils/configurationLoader');

describe('configLoader', function() {

    it('should load the default config', function() {
        var config = configLoader.load(path.join(__dirname, '../testFiles/configLoader/config'));

        expect(config).to.deep.equal({foo:'bar'});
    });

    it('should load the default config, overwritten by the environment config', function() {
        var tmpEnv = process.env.NODE_ENV;

        process.env.NODE_ENV = 'test';
        var config = configLoader.load(path.join(__dirname, '../testFiles/configLoader/config2'));

        expect(config).to.deep.equal({foo:'barFromTestEnvironment', foo2: 'baar'});

        process.env.NODE_ENV = tmpEnv;
    });

    it('should load the default config, overwritten by the environment config, overwritten by the user config', function() {
        var tmpEnv = process.env.NODE_ENV;
        var tmpUser = process.env.USER;

        process.env.NODE_ENV = 'test';
        process.env.USER = 'foouser';

        var config = configLoader.load(path.join(__dirname, '../testFiles/configLoader/config3'));

        expect(config).to.deep.equal({foo:'barFromuser', bar: 'barFromEnvironment', baz: 'bax'});

        //restore
        process.env.NODE_ENV = tmpEnv;
        process.env.USER = tmpUser;
    });

});