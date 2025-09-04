var expect = require('chai').expect;

var ResponseLocationGeoJSON = require('../../lib/models/ResponseLocationGeoJSON');

describe('ResponseLocationGeoJSON with new fields', function() {

    describe('GeoJSON generation', function() {
        it('should generate GeoJSON with new fields in properties', function() {
            var locationData = {
                Device: "test-device",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00",
                Speed: "25.5",
                BatteryLevel: "85",
                Altitude: "120.5"
            };

            var response = new ResponseLocationGeoJSON();
            response.pushLocation(locationData);
            var geoJson = response.data();

            expect(geoJson).to.have.property('type', 'Feature');
            expect(geoJson).to.have.property('geometry');
            expect(geoJson).to.have.property('properties');
            
            expect(geoJson.geometry).to.have.property('type', 'Point');
            expect(geoJson.geometry.coordinates).to.deep.equal([10.837502, 49.828925]);
            
            expect(geoJson.properties).to.have.property('name', 'test-device');
            expect(geoJson.properties).to.have.property('timestamp', '1376735651302');
            expect(geoJson.properties).to.have.property('horizontalAccuracy', '50.00');
            expect(geoJson.properties).to.have.property('speed', '25.5');
            expect(geoJson.properties).to.have.property('batteryLevel', '85');
            expect(geoJson.properties).to.have.property('altitude', '120.5');
        });

        it('should handle location without new fields', function() {
            var locationData = {
                Device: "test-device",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00"
            };

            var response = new ResponseLocationGeoJSON();
            response.pushLocation(locationData);
            var geoJson = response.data();

            expect(geoJson).to.have.property('type', 'Feature');
            expect(geoJson).to.have.property('geometry');
            expect(geoJson).to.have.property('properties');
            
            expect(geoJson.properties).to.have.property('name', 'test-device');
            expect(geoJson.properties).to.have.property('timestamp', '1376735651302');
            expect(geoJson.properties).to.have.property('horizontalAccuracy', '50.00');
            expect(geoJson.properties).to.have.property('speed', undefined);
            expect(geoJson.properties).to.have.property('batteryLevel', undefined);
            expect(geoJson.properties).to.have.property('altitude', undefined);
        });

        it('should handle location with partial new fields', function() {
            var locationData = {
                Device: "test-device",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00",
                Speed: "15.2"
                // BatteryLevel and Altitude missing
            };

            var response = new ResponseLocationGeoJSON();
            response.pushLocation(locationData);
            var geoJson = response.data();

            expect(geoJson).to.have.property('type', 'Feature');
            expect(geoJson).to.have.property('geometry');
            expect(geoJson).to.have.property('properties');
            
            expect(geoJson.properties).to.have.property('name', 'test-device');
            expect(geoJson.properties).to.have.property('speed', '15.2');
            expect(geoJson.properties).to.have.property('batteryLevel', undefined);
            expect(geoJson.properties).to.have.property('altitude', undefined);
        });

        it('should handle empty location list', function() {
            var response = new ResponseLocationGeoJSON();
            var geoJson = response.data();

            expect(geoJson).to.deep.equal({});
        });

        it('should handle location without required coordinates', function() {
            var locationData = {
                Device: "test-device",
                Timestamp: "1376735651302",
                HorizontalAccuracy: "50.00",
                Speed: "25.5",
                BatteryLevel: "85",
                Altitude: "120.5"
                // Longitude and Latitude missing
            };

            var response = new ResponseLocationGeoJSON();
            response.pushLocation(locationData);
            var geoJson = response.data();

            expect(geoJson).to.deep.equal({});
        });

        it('should handle multiple locations (uses first one)', function() {
            var locationData1 = {
                Device: "test-device-1",
                Timestamp: "1376735651301",
                Longitude: "10.837501",
                Latitude: "49.828924",
                HorizontalAccuracy: "50.00",
                Speed: "20.0",
                BatteryLevel: "90",
                Altitude: "100.0"
            };

            var locationData2 = {
                Device: "test-device-2",
                Timestamp: "1376735651302",
                Longitude: "10.837502",
                Latitude: "49.828925",
                HorizontalAccuracy: "50.00",
                Speed: "30.0",
                BatteryLevel: "80",
                Altitude: "200.0"
            };

            var response = new ResponseLocationGeoJSON();
            response.pushLocation(locationData1);
            response.pushLocation(locationData2);
            var geoJson = response.data();

            expect(geoJson).to.have.property('type', 'Feature');
            expect(geoJson.properties).to.have.property('name', 'test-device-1');
            expect(geoJson.properties).to.have.property('speed', '20.0');
            expect(geoJson.properties).to.have.property('batteryLevel', '90');
            expect(geoJson.properties).to.have.property('altitude', '100.0');
        });
    });
});
