var expect = require('chai').expect;
var ResponseDeleteLocation = require('../../lib/models/ResponseDeleteLocation');

describe('ResponseDeleteLocation', function() {
    describe('constructor', function() {
        it('should create response with device ID and deleted count', function() {
            var response = new ResponseDeleteLocation('test-device', 3);
            
            expect(response._deviceId).to.equal('test-device');
            expect(response._deletedCount).to.equal(3);
        });
    });

    describe('data method', function() {
        it('should return correct response structure', function() {
            var response = new ResponseDeleteLocation('test-device', 2);
            var data = response.data();
            
            expect(data).to.be.an('object');
            expect(data.MiataruResponse).to.equal('ACK');
            expect(data.MiataruVerboseResponse).to.equal('Location data deleted for device: test-device');
            expect(data.MiataruDeletedCount).to.equal(2);
        });

        it('should handle zero deleted count', function() {
            var response = new ResponseDeleteLocation('non-existent-device', 0);
            var data = response.data();
            
            expect(data.MiataruResponse).to.equal('ACK');
            expect(data.MiataruVerboseResponse).to.equal('Location data deleted for device: non-existent-device');
            expect(data.MiataruDeletedCount).to.equal(0);
        });

        it('should handle multiple deleted items', function() {
            var response = new ResponseDeleteLocation('device-with-history', 3);
            var data = response.data();
            
            expect(data.MiataruResponse).to.equal('ACK');
            expect(data.MiataruVerboseResponse).to.equal('Location data deleted for device: device-with-history');
            expect(data.MiataruDeletedCount).to.equal(3);
        });

        it('should handle special characters in device ID', function() {
            var specialDeviceId = 'device-with-special-chars-!@#$%^&*()';
            var response = new ResponseDeleteLocation(specialDeviceId, 1);
            var data = response.data();
            
            expect(data.MiataruVerboseResponse).to.equal('Location data deleted for device: ' + specialDeviceId);
        });
    });
});
