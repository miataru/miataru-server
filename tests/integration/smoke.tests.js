var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');

describe('smoke', function() {

    it('should show that its running', function(done) {
        request(app)
            .get('/')
            .expect(200)
            .expect(/this is the miataru service backend/)
            .end(done);
    });

});