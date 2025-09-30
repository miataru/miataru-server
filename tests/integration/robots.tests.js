var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var logger = require('../../lib/logger');

describe('robots.txt', function() {

    var originalError;
    var errorCalls;

    beforeEach(function() {
        errorCalls = [];
        originalError = logger.error;
        logger.error = function() {
            errorCalls.push([].slice.call(arguments));
        };
    });

    afterEach(function() {
        logger.error = originalError;
    });

    it('should respond with a plain text robots policy without logging errors', function(done) {
        request(app)
            .get('/robots.txt')
            .expect('Content-Type', /text\/plain/)
            .expect(200)
            .expect('User-agent: *\nDisallow:')
            .end(function(err) {
                if (err) {
                    return done(err);
                }

                try {
                    expect(errorCalls.length).to.equal(0, 'Expected no error logs');
                    done();
                } catch (assertionError) {
                    done(assertionError);
                }
            });
    });

});
