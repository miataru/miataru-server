var path = require('path');

var expect = require('chai').expect;

var configLoader = require('../../lib/configurationLoader');
var TEST_FILE_BASE = path.join(__dirname, '../testFiles/configLoader');

describe('configLoader', function() {

    beforeEach(function() {
        var cache = require.cache;

        Object.keys(cache).forEach(function(key) {
            if(key.indexOf(TEST_FILE_BASE) > -1) {
                delete cache[key];
            }
        });
    });

    it('should load the default config', function() {
        var config = configLoader.load(path.join(TEST_FILE_BASE, '/config'));

        expect(config).to.deep.equal({foo:'bar', bax: 'baz', a: {b: {c: 42, d: 23 } } });
    });

    it('should load the default config, overwritten by the environment config', function() {
        var tmpEnv = process.env.NODE_ENV;

        process.env.NODE_ENV = 'test';
        var config = configLoader.load(path.join(TEST_FILE_BASE, '/config2'));

        expect(config).to.deep.equal({foo:'barFromTestEnvironment', foo2: 'baar'});

        process.env.NODE_ENV = tmpEnv;
    });

    it('should load the default config, overwritten by the environment config, overwritten by the user config', function() {
        var tmpEnv = process.env.NODE_ENV;
        var tmpUser = process.env.USER;

        process.env.NODE_ENV = 'test';
        process.env.USER = 'foouser';

        var config = configLoader.load(path.join(TEST_FILE_BASE, '/config3'));

        expect(config).to.deep.equal({foo:'barFromuser', bar: 'barFromEnvironment', baz: 'bax'});

        //restore
        process.env.NODE_ENV = tmpEnv;
        process.env.USER = tmpUser;
    });

    it('should load the default config and should enhance/overwrite it with cliParms', function() {
        var config = configLoader.load(path.join(TEST_FILE_BASE, '/config'), {bax:'cliBaz', spam: 'eggs'});

        expect(config).to.deep.equal({foo:'bar', bax: 'cliBaz', spam: 'eggs', a: {b: {c: 42, d: 23 } }});
    });

    it('should load the default config and should enhance/overwrite it with deep nested cli Parms', function() {
        var config = configLoader.load(path.join(TEST_FILE_BASE, 'config'), {a: {b: {c: 48}}});

        expect(config).to.deep.equal({foo:'bar', bax: 'baz', a: {b: {c: 48, d: 23 } }});
    });

    it('should load the default config and enhance it with an "external" config file', function() {
        var externalConfigPath = path.join(__dirname, '../testFiles/configLoader/external/external.js');
        var config = configLoader.load(path.join(TEST_FILE_BASE, 'config'), {externalconfig: externalConfigPath});

        expect(config).to.deep.equal({foo:'bar', bax: 'baz', a: {b: {c: 256, d: 1024 } }});
    });
});