var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('updateLocation', function() {

    it('should answer with ACK to simple update location request', function(done) {
        var updateData = calls.locationUpdateCall();

        var options = {
            url: serverUrl + '/UpdateLocation',
            method: 'POST',
            json: updateData
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;

            expect(response.statusCode).to.equal(200);
            expect(body.MiataruResponse).to.equal('ACK');
            expect(body.MiataruVerboseResponse).to.match(/><\)\)\).>/);

            done();
        });
    });

    it('should answer with error on empty locationUpdate request', function(done) {
        var options = {
            url: serverUrl + '/UpdateLocation',
            method: 'POST',
            json: {}
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(400);

            done();
        });
    });

    it('should answer with error on crippled locationUpdate request', function(done) {
        var options = {
            url: serverUrl + '/UpdateLocation',
            method: 'POST',
            json: {
                MiataruLocation: 'foo'
            }
        };

        request(options, function (error, response, body) {
            expect(error).to.be.null;
            expect(response.statusCode).to.equal(400);

            done();
        });
    });

   it('should answer with a documentation redirect for GET requests to the UpdateLocation url',function(done) {
      var options = {
	followRedirect: false,
	url: serverUrl + '/UpdateLocation',
	method: 'GET'
	};

	request(options,function (error, response, body) {
		expect(error).to.be.null;
		expect(response.statusCode).to.equal(301);
		done();
	});
    });

});
