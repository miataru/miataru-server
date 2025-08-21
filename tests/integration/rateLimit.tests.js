var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');

var serverUrl = 'http://localhost:' + config.port;

describe('rate limit middleware', function() {
    it('should return 429 after exceeding request threshold', function(done) {
        this.timeout(10000);
        var max = config.rateLimit.maxRequests;
        var ip = '123.4.5.6';

        var options = {
            url: serverUrl + '/',
            headers: { 'X-Forwarded-For': ip }
        };

        function send(n, cb) {
            request.get(options, function(err, res) {
                if (err) return cb(err);
                if (n > 0) {
                    send(n - 1, cb);
                } else {
                    cb(null, res.statusCode);
                }
            });
        }

        send(max, function(err, status) {
            expect(err).to.be.null;
            expect(status).to.equal(429);
            done();
        });
    });
});
