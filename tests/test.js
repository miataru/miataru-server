var expect = require('chai').expect;

describe('miataru', function() {

    it('should be true', function() {
        expect(true).to.be.true;
    });
});

/* missing test case implementations:

UpdateLocation
	- Expected Redis Keys are created (with and without History)
	- Error handling for wrong formatted inputs

GetLocation
	- Correct answer when no data is available / nolocation
	- correct formatted output when data is available

*/