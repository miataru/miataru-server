var expect = require('chai').expect;
var request = require('supertest');

var app = require('../../server');
var calls = require('../testFiles/calls');

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

            request(app)
                .post('/v1/UpdateLocation')
                .send(oldFormatUpdate)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    done();
                });
        });

        it('should return old format data for old clients', function(done) {
            var oldFormatGet = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "old-client"
                },
                "MiataruGetLocation": [{
                    "Device": OLD_CLIENT_DEVICE
                }]
            };

            request(app)
                .post('/v1/GetLocation')
                .send(oldFormatGet)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation[0]).to.have.property('Device', OLD_CLIENT_DEVICE);
                    expect(res.body.MiataruLocation[0]).to.have.property('Timestamp', '1376735651302');
                    expect(res.body.MiataruLocation[0]).to.have.property('Longitude', '10.837502');
                    expect(res.body.MiataruLocation[0]).to.have.property('Latitude', '49.828925');
                    expect(res.body.MiataruLocation[0]).to.have.property('HorizontalAccuracy', '50.00');
                    
                    // New fields should not be present
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');
                    done();
                });
        });

        it('should work with old format in location history', function(done) {
            var oldFormatHistory = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "old-client"
                },
                "MiataruGetLocationHistory": {
                    "Device": OLD_CLIENT_DEVICE,
                    "Amount": "25"
                }
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(oldFormatHistory)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation[0]).to.have.property('Device', OLD_CLIENT_DEVICE);
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Speed');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('BatteryLevel');
                    expect(res.body.MiataruLocation[0]).to.not.have.property('Altitude');
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

            request(app)
                .post('/UpdateLocation') // Legacy endpoint without /v1
                .send(legacyUpdate)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    done();
                });
        });

        it('should work with legacy /GetLocation endpoint', function(done) {
            var legacyGet = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "legacy-client"
                },
                "MiataruGetLocation": [{
                    "Device": LEGACY_DEVICE
                }]
            };

            request(app)
                .post('/GetLocation') // Legacy endpoint without /v1
                .send(legacyGet)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruLocation).to.be.an('array');
                    expect(res.body.MiataruLocation[0]).to.have.property('Device', LEGACY_DEVICE);
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

            request(app)
                .post('/v1/UpdateLocation')
                .send(stringUpdate)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
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

            request(app)
                .post('/v1/UpdateLocation')
                .send(numericUpdate)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
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

            request(app)
                .post('/v1/UpdateLocation')
                .send(zeroUpdate)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body.MiataruResponse).to.equal('ACK');
                    done();
                });
        });
    });

    describe('Error handling compatibility', function() {
        it('should handle malformed requests the same way as before', function(done) {
            var malformedUpdate = {
                "MiataruLocation": "invalid" // Should be array
            };

            request(app)
                .post('/v1/UpdateLocation')
                .send(malformedUpdate)
                .expect(400)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    done();
                });
        });

        it('should handle empty requests the same way as before', function(done) {
            request(app)
                .post('/v1/UpdateLocation')
                .send({})
                .expect(400)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    done();
                });
        });
    });

    describe('Field order compatibility for GetLocationHistory', function() {
        var ORDER_DEVICE = 'order-compatibility-device';

        before(function(done) {
            var updatePayload = calls.locationUpdateCall({
                locations: [
                    calls.location({ device: ORDER_DEVICE })
                ]
            });

            request(app)
                .post('/v1/UpdateLocation')
                .send(updatePayload)
                .expect(200)
                .end(function(err) {
                    done(err);
                });
        });

        it('should accept Amount before Device in the history request', function(done) {
            var reversedPayload = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "test-client"
                },
                "MiataruGetLocationHistory": {
                    "Amount": "5",
                    "Device": ORDER_DEVICE
                }
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(reversedPayload)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    done();
                });
        });

        it('should accept lower-case field names regardless of order', function(done) {
            var lowercasePayload = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "test-client"
                },
                "MiataruGetLocationHistory": {
                    "amount": 3,
                    "device": ORDER_DEVICE
                }
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(lowercasePayload)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    done();
                });
        });

        it('should accept Map style payloads in Device, Amount order', function(done) {
            var mapPayload = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "test-client"
                },
                "MiataruGetLocationHistory": [
                    ["Device", ORDER_DEVICE],
                    ["Amount", "5"]
                ]
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(mapPayload)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    done();
                });
        });

        it('should accept Map style payloads in Amount, Device order', function(done) {
            var reversedMapPayload = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "test-client"
                },
                "MiataruGetLocationHistory": [
                    ["Amount", "5"],
                    ["Device", ORDER_DEVICE]
                ]
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(reversedMapPayload)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    done();
                });
        });

        it('should accept key=value string payloads in Device, Amount order', function(done) {
            var keyValuePayload = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "test-client"
                },
                "MiataruGetLocationHistory": "Device=" + ORDER_DEVICE + "&Amount=5"
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(keyValuePayload)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    done();
                });
        });

        it('should accept key=value string payloads in Amount, Device order', function(done) {
            var reversedKeyValuePayload = {
                "MiataruConfig": {
                    "RequestMiataruDeviceID": "test-client"
                },
                "MiataruGetLocationHistory": "Amount=5&Device=" + ORDER_DEVICE
            };

            request(app)
                .post('/v1/GetLocationHistory')
                .send(reversedKeyValuePayload)
                .expect(200)
                .end(function(err, res) {
                    expect(err).to.be.null;
                    expect(res.body).to.have.property('MiataruLocation');
                    expect(res.body.MiataruLocation).to.be.an('array');
                    done();
                });
        });
    });
});
