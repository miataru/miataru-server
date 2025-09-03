var expect = require('chai').expect;
var request = require('request');

var config = require('../../lib/configuration');
var calls = require('../testFiles/calls');

var serverUrl = 'http://localhost:' + config.port;

describe('Backward Compatibility Tests', function() {

    describe('Old client compatibility', function() {
        var OLD_CLIENT_DEVICE = 'old-client-device';

        it('should accept old format location updates', function(done) {
            // Simulate old client sending only original fields
            var oldFormatUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": OLD_CLIENT_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00"
                }]
            };

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: oldFormatUpdate
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });

        it('should return old format data for old clients', function(done) {
            var oldFormatGet = {
                "MiataruGetLocation": [{
                    "Device": OLD_CLIENT_DEVICE
                }]
            };

            var options = {
                url: serverUrl + '/v1/GetLocation',
                method: 'POST',
                json: oldFormatGet
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation[0]).to.have.property('Device', OLD_CLIENT_DEVICE);
                expect(body.MiataruLocation[0]).to.have.property('Timestamp', '1376735651302');
                expect(body.MiataruLocation[0]).to.have.property('Longitude', '10.837502');
                expect(body.MiataruLocation[0]).to.have.property('Latitude', '49.828925');
                expect(body.MiataruLocation[0]).to.have.property('HorizontalAccuracy', '50.00');
                
                // New fields should not be present
                expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                expect(body.MiataruLocation[0]).to.not.have.property('Altitude');
                done();
            });
        });

        it('should work with old format in location history', function(done) {
            var oldFormatHistory = {
                "MiataruGetLocationHistory": {
                    "Device": OLD_CLIENT_DEVICE,
                    "Amount": "25"
                }
            };

            var options = {
                url: serverUrl + '/v1/GetLocationHistory',
                method: 'POST',
                json: oldFormatHistory
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation[0]).to.have.property('Device', OLD_CLIENT_DEVICE);
                expect(body.MiataruLocation[0]).to.not.have.property('Speed');
                expect(body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                expect(body.MiataruLocation[0]).to.not.have.property('Altitude');
                done();
            });
        });
    });

    describe('Legacy API endpoint compatibility', function() {
        var LEGACY_DEVICE = 'legacy-device';

        it('should work with legacy /UpdateLocation endpoint', function(done) {
            var legacyUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": LEGACY_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00"
                }]
            };

            var options = {
                url: serverUrl + '/UpdateLocation', // Legacy endpoint without /v1
                method: 'POST',
                json: legacyUpdate
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });

        it('should work with legacy /GetLocation endpoint', function(done) {
            var legacyGet = {
                "MiataruGetLocation": [{
                    "Device": LEGACY_DEVICE
                }]
            };

            var options = {
                url: serverUrl + '/GetLocation', // Legacy endpoint without /v1
                method: 'POST',
                json: legacyGet
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruLocation).to.be.an('array');
                expect(body.MiataruLocation[0]).to.have.property('Device', LEGACY_DEVICE);
                done();
            });
        });
    });

    describe('Data type compatibility', function() {
        var DATA_TYPE_DEVICE = 'data-type-device';

        it('should handle string values for new fields', function(done) {
            var stringUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": DATA_TYPE_DEVICE,
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00",
                    "Speed": "25.5",
                    "BatteryLevel": "85",
                    "Altitude": "120.5"
                }]
            };

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: stringUpdate
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });

        it('should handle numeric values for new fields', function(done) {
            var numericUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": DATA_TYPE_DEVICE + '-numeric',
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00",
                    "Speed": 25.5,
                    "BatteryLevel": 85,
                    "Altitude": 120.5
                }]
            };

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: numericUpdate
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });

        it('should handle zero values for new fields', function(done) {
            var zeroUpdate = {
                "MiataruConfig": {
                    "EnableLocationHistory": "True",
                    "LocationDataRetentionTime": "15"
                },
                "MiataruLocation": [{
                    "Device": DATA_TYPE_DEVICE + '-zero',
                    "Timestamp": "1376735651302",
                    "Longitude": "10.837502",
                    "Latitude": "49.828925",
                    "HorizontalAccuracy": "50.00",
                    "Speed": 0,
                    "BatteryLevel": 0,
                    "Altitude": 0
                }]
            };

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: zeroUpdate
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(200);
                expect(body.MiataruResponse).to.equal('ACK');
                done();
            });
        });
    });

    describe('Error handling compatibility', function() {
        it('should handle malformed requests the same way as before', function(done) {
            var malformedUpdate = {
                "MiataruLocation": "invalid" // Should be array
            };

            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: malformedUpdate
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(400);
                done();
            });
        });

        it('should handle empty requests the same way as before', function(done) {
            var options = {
                url: serverUrl + '/v1/UpdateLocation',
                method: 'POST',
                json: {}
            };

            request(options, function (error, response, body) {
                expect(error).to.be.null;
                expect(response.statusCode).to.equal(400);
                done();
            });
        });
    });
});
