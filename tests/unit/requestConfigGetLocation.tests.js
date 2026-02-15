var expect = require('chai').expect;

var RequestConfigGetLocation = require('../../lib/models/RequestConfigGetLocation');

describe('RequestConfigGetLocation', function() {
    it('should keep RequestMiataruDeviceID and RequestMiataruDeviceKey', function() {
        var config = new RequestConfigGetLocation({
            RequestMiataruDeviceID: 'requesting-device-id',
            RequestMiataruDeviceKey: 'requesting-device-key'
        });

        expect(config.requestMiataruDeviceID()).to.equal('requesting-device-id');
        expect(config.requestMiataruDeviceKey()).to.equal('requesting-device-key');
    });

    it('should default RequestMiataruDeviceKey to null when omitted', function() {
        var config = new RequestConfigGetLocation({
            RequestMiataruDeviceID: 'requesting-device-id'
        });

        expect(config.requestMiataruDeviceKey()).to.equal(null);
    });

    it('should accept requestingDeviceID and requestingDeviceKey aliases', function() {
        var config = new RequestConfigGetLocation({
            requestingDeviceID: 'requesting-device-id-alias',
            requestingDeviceKey: 'requesting-device-key-alias'
        });

        expect(config.requestMiataruDeviceID()).to.equal('requesting-device-id-alias');
        expect(config.requestMiataruDeviceKey()).to.equal('requesting-device-key-alias');
    });
});
