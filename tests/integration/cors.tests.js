var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');

var serverUrl = 'http://localhost:' + config.port;

describe('cors', function() {
    it('should include CORS headers for allowed origin', function(done) {
        var options = {
            url: serverUrl + '/',
            headers: {
                Origin: 'http://example.com'
            }
        };

        request(options, function(error, response, body) {
            expect(error).to.be.null;
            expect(response.headers['access-control-allow-origin']).to.equal('http://example.com');
            done();
        });
    });

    it('should not include CORS headers for disallowed origin', function(done) {
        var options = {
            url: serverUrl + '/',
            headers: {
                Origin: 'http://notallowed.com'
            }
        };

        request(options, function(error, response, body) {
            expect(error).to.be.null;
            expect(response.headers['access-control-allow-origin']).to.be.undefined;
            done();
        });
    });
});
