var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var logger = require('../../lib/logger');

describe('Parse error logging hardening', function() {
    var originalError;
    var originalWarn;
    var errorMessages;
    var warnMessages;

    beforeEach(function() {
        originalError = logger.error;
        originalWarn = logger.warn;
        errorMessages = [];
        warnMessages = [];

        logger.error = function() {
            errorMessages.push(Array.prototype.join.call(arguments, ' '));
        };

        logger.warn = function() {
            warnMessages.push(Array.prototype.join.call(arguments, ' '));
        };
    });

    afterEach(function() {
        logger.error = originalError;
        logger.warn = originalWarn;
    });

    it('should not log raw body previews or device keys on JSON parse errors', function(done) {
        request(app)
            .post('/v1/UpdateLocation')
            .set('Content-Type', 'application/json')
            .send('{"MiataruLocation":[{"Device":"test-device","DeviceKey":"super-secret-key"')
            .expect(400)
            .end(function(err) {
                if (err) return done(err);

                var combinedLogs = errorMessages.concat(warnMessages).join(' ');
                expect(combinedLogs).to.not.include('super-secret-key');
                expect(combinedLogs).to.not.include('rawBodyPreview');
                done();
            });
    });
});
