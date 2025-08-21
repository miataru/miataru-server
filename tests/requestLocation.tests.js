var expect = require('chai').expect;

var RequestLocation = require('../lib/models/RequestLocation');
var errors = require('../lib/errors');

describe('RequestLocation', function() {

    var validData;

    beforeEach(function() {
        validData = {
            Device: 'device',
            Timestamp: 123456789,
            Longitude: 1.23,
            Latitude: 4.56,
            HorizontalAccuracy: 10
        };
    });

    ['Device', 'Timestamp', 'Longitude', 'Latitude', 'HorizontalAccuracy'].forEach(function(prop) {
        it('should throw BadRequestError when ' + prop + ' is missing', function() {
            var data = Object.assign({}, validData);
            delete data[prop];
            expect(function() { new RequestLocation(data); }).to.throw(errors.BadRequestError);
        });
    });

});

