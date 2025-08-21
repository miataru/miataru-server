var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var serverUrl = 'http://localhost:' + config.port;

describe('dashboard route', function() {
    it('should respond with html', function(done) {
        request(serverUrl + '/dashboard', function(error, response, body) {
            expect(error).to.be.null;
            expect(response.headers['content-type']).to.match(/text\/html/);
            done();
        });
    });
});
