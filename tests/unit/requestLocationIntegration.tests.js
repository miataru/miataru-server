var expect = require('chai').expect;

var RequestLocation = require('../../lib/models/RequestLocation');
var ResponseLocation = require('../../lib/models/ResponseLocation');
var ResponseLocationGeoJSON = require('../../lib/models/ResponseLocationGeoJSON');

describe('RequestLocation Integration Tests', function() {

    describe('End-to-end data flow', function() {
        it('should handle complete data flow from request to response', function() {
            // Simulate incoming request data
            var incomingData = {
                Device: "integration-test-device",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00",
                Speed: "35.5",
                BatteryLevel: "78",
                Altitude: "180.2"
            };

            // Step 1: Parse incoming data
            var requestLocation = new RequestLocation(incomingData);
            var parsedData = requestLocation.data();

            // Verify parsing
            expect(parsedData.Device).to.equal("integration-test-device");
            expect(parsedData.Speed).to.equal("35.5");
            expect(parsedData.BatteryLevel).to.equal("78");
            expect(parsedData.Altitude).to.equal("180.2");

            // Step 2: Simulate database storage (JSON.stringify/parse)
            var storedData = JSON.stringify(parsedData);
            var retrievedData = JSON.parse(storedData);

            // Step 3: Create response
            var responseLocation = new ResponseLocation();
            responseLocation.pushLocation(retrievedData);
            var responseData = responseLocation.data();

            // Verify response
            expect(responseData.MiataruLocation).to.be.an('array');
            expect(responseData.MiataruLocation[0]).to.have.property('Device', 'integration-test-device');
            expect(responseData.MiataruLocation[0]).to.have.property('Speed', '35.5');
            expect(responseData.MiataruLocation[0]).to.have.property('BatteryLevel', '78');
            expect(responseData.MiataruLocation[0]).to.have.property('Altitude', '180.2');
        });

        it('should handle backward compatibility in complete data flow', function() {
            // Simulate old client data
            var oldClientData = {
                Device: "old-client-device",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00"
            };

            // Step 1: Parse old client data
            var requestLocation = new RequestLocation(oldClientData);
            var parsedData = requestLocation.data();

            // Verify parsing (new fields should not be present)
            expect(parsedData.Device).to.equal("old-client-device");
            expect(parsedData.Speed).to.be.undefined;
            expect(parsedData.BatteryLevel).to.be.undefined;
            expect(parsedData.Altitude).to.be.undefined;

            // Step 2: Simulate database storage
            var storedData = JSON.stringify(parsedData);
            var retrievedData = JSON.parse(storedData);

            // Step 3: Create response
            var responseLocation = new ResponseLocation();
            responseLocation.pushLocation(retrievedData);
            var responseData = responseLocation.data();

            // Verify response (should be compatible with old clients)
            expect(responseData.MiataruLocation).to.be.an('array');
            expect(responseData.MiataruLocation[0]).to.have.property('Device', 'old-client-device');
            expect(responseData.MiataruLocation[0]).to.not.have.property('Speed');
            expect(responseData.MiataruLocation[0]).to.not.have.property('BatteryLevel');
            expect(responseData.MiataruLocation[0]).to.not.have.property('Altitude');
        });

        it('should handle mixed data scenarios', function() {
            var scenarios = [
                {
                    name: 'all fields',
                    data: {
                        Device: "mixed-device-1",
                        Timestamp: "1376735651301",
                        Longitude: "10.837501",
                        Latitude: "49.828924",
                        HorizontalAccuracy: "50.00",
                        Speed: "25.0",
                        BatteryLevel: "90",
                        Altitude: "100.0"
                    },
                    expectedFields: ['Speed', 'BatteryLevel', 'Altitude']
                },
                {
                    name: 'partial fields',
                    data: {
                        Device: "mixed-device-2",
                        Timestamp: "1376735651302",
                        Longitude: "10.837502",
                        Latitude: "49.828925",
                        HorizontalAccuracy: "50.00",
                        Speed: "30.0"
                    },
                    expectedFields: ['Speed']
                },
                {
                    name: 'minus one values',
                    data: {
                        Device: "mixed-device-3",
                        Timestamp: "1376735651303",
                        Longitude: "10.837503",
                        Latitude: "49.828926",
                        HorizontalAccuracy: "50.00",
                        Speed: -1,
                        BatteryLevel: -1,
                        Altitude: -1
                    },
                    expectedFields: []
                },
                {
                    name: 'zero values',
                    data: {
                        Device: "mixed-device-4",
                        Timestamp: "1376735651304",
                        Longitude: "10.837504",
                        Latitude: "49.828927",
                        HorizontalAccuracy: "50.00",
                        Speed: 0,
                        BatteryLevel: 0,
                        Altitude: 0
                    },
                    expectedFields: ['Speed', 'BatteryLevel', 'Altitude']
                }
            ];

            scenarios.forEach(function(scenario) {
                // Parse data
                var requestLocation = new RequestLocation(scenario.data);
                var parsedData = requestLocation.data();

                // Verify expected fields are present
                scenario.expectedFields.forEach(function(field) {
                    expect(parsedData).to.have.property(field, scenario.data[field]);
                });

                // Verify unexpected fields are not present
                ['Speed', 'BatteryLevel', 'Altitude'].forEach(function(field) {
                    if (scenario.expectedFields.indexOf(field) === -1) {
                        expect(parsedData).to.not.have.property(field);
                    }
                });

                // Test response generation
                var responseLocation = new ResponseLocation();
                responseLocation.pushLocation(parsedData);
                var responseData = responseLocation.data();

                expect(responseData.MiataruLocation[0]).to.have.property('Device', scenario.data.Device);
            });
        });

        it('should handle GeoJSON generation with new fields', function() {
            var locationData = {
                Device: "geojson-test-device",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00",
                Speed: "40.0",
                BatteryLevel: "85",
                Altitude: "250.0"
            };

            // Create GeoJSON response
            var responseGeoJSON = new ResponseLocationGeoJSON();
            responseGeoJSON.pushLocation(locationData);
            var geoJsonData = responseGeoJSON.data();

            // Verify GeoJSON structure
            expect(geoJsonData).to.have.property('type', 'Feature');
            expect(geoJsonData).to.have.property('geometry');
            expect(geoJsonData).to.have.property('properties');
            
            // Verify coordinates
            expect(geoJsonData.geometry.coordinates).to.deep.equal([10.837502, 49.828925]);
            
            // Verify properties include new fields
            expect(geoJsonData.properties).to.have.property('name', 'geojson-test-device');
            expect(geoJsonData.properties).to.have.property('speed', '40.0');
            expect(geoJsonData.properties).to.have.property('batteryLevel', '85');
            expect(geoJsonData.properties).to.have.property('altitude', '250.0');
        });
    });
});
