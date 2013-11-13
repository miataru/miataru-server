var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');

var serverUrl = 'http://localhost:' + config.port;

describe('smoke', function() {

    it('should show that its running', function(done) {
        request(serverUrl, function (error, response, body) {
            expect(error).to.be.null;
            expect(body).to.match(/this is the miataru service backend/);

            done();
        });
    });

});