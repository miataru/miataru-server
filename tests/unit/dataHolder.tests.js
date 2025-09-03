var expect = require('chai').expect;

var RequestConfig = require('../../lib/models/RequestConfig');

describe('dataHolders', function() {

    describe('config', function() {
        it('should throw because of invalid data', function() {
            expect(function() { new RequestConfig() }).to.throw();
        });
    });

    describe('location', function() {
        var RequestLocation = require('../../lib/models/RequestLocation');

        describe('RequestLocation with new fields', function() {
            it('should handle old format without new fields', function() {
                var oldData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00"
                };

                var request = new RequestLocation(oldData);
                var data = request.data();

                expect(data.Device).to.equal("test-device");
                expect(data.Timestamp).to.equal("1376735651302");
                expect(data.Longitude).to.equal("10.837502");
                expect(data.Latitude).to.equal("49.828925");
                expect(data.HorizontalAccuracy).to.equal("50.00");
                expect(data.Speed).to.be.undefined;
                expect(data.BatteryLevel).to.be.undefined;
                expect(data.Altitude).to.be.undefined;
            });

            it('should handle new format with all fields', function() {
                var newData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: "25.5",
                    BatteryLevel: "85",
                    Altitude: "120.5"
                };

                var request = new RequestLocation(newData);
                var data = request.data();

                expect(data.Device).to.equal("test-device");
                expect(data.Timestamp).to.equal("1376735651302");
                expect(data.Longitude).to.equal("10.837502");
                expect(data.Latitude).to.equal("49.828925");
                expect(data.HorizontalAccuracy).to.equal("50.00");
                expect(data.Speed).to.equal("25.5");
                expect(data.BatteryLevel).to.equal("85");
                expect(data.Altitude).to.equal("120.5");
            });

            it('should handle mixed format with some new fields', function() {
                var mixedData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: "15.2"
                    // BatteryLevel and Altitude missing
                };

                var request = new RequestLocation(mixedData);
                var data = request.data();

                expect(data.Device).to.equal("test-device");
                expect(data.Timestamp).to.equal("1376735651302");
                expect(data.Longitude).to.equal("10.837502");
                expect(data.Latitude).to.equal("49.828925");
                expect(data.HorizontalAccuracy).to.equal("50.00");
                expect(data.Speed).to.equal("15.2");
                expect(data.BatteryLevel).to.be.undefined;
                expect(data.Altitude).to.be.undefined;
            });

            it('should exclude fields with -1 values', function() {
                var minusOneData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: -1,
                    BatteryLevel: -1,
                    Altitude: -1
                };

                var request = new RequestLocation(minusOneData);
                var data = request.data();

                expect(data.Device).to.equal("test-device");
                expect(data.Timestamp).to.equal("1376735651302");
                expect(data.Longitude).to.equal("10.837502");
                expect(data.Latitude).to.equal("49.828925");
                expect(data.HorizontalAccuracy).to.equal("50.00");
                expect(data.Speed).to.be.undefined;
                expect(data.BatteryLevel).to.be.undefined;
                expect(data.Altitude).to.be.undefined;
            });

            it('should handle zero values correctly', function() {
                var zeroData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: 0,
                    BatteryLevel: 0,
                    Altitude: 0
                };

                var request = new RequestLocation(zeroData);
                var data = request.data();

                expect(data.Speed).to.equal(0);
                expect(data.BatteryLevel).to.equal(0);
                expect(data.Altitude).to.equal(0);
            });

            it('should provide getter methods for new fields', function() {
                var data = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: "25.5",
                    BatteryLevel: "85",
                    Altitude: "120.5"
                };

                var request = new RequestLocation(data);

                expect(request.speed()).to.equal("25.5");
                expect(request.batteryLevel()).to.equal("85");
                expect(request.altitude()).to.equal("120.5");
            });

            it('should default new fields to -1 when not provided', function() {
                var data = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00"
                };

                var request = new RequestLocation(data);

                expect(request.speed()).to.equal(-1);
                expect(request.batteryLevel()).to.equal(-1);
                expect(request.altitude()).to.equal(-1);
            });

            it('should handle string and numeric values for new fields', function() {
                var stringData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: "25.5",
                    BatteryLevel: "85",
                    Altitude: "120.5"
                };

                var numericData = {
                    Device: "test-device",
                    Timestamp: "1376735651302",
                    Longitude: "10.837502",
                    Latitude: "49.828925",
                    HorizontalAccuracy: "50.00",
                    Speed: 25.5,
                    BatteryLevel: 85,
                    Altitude: 120.5
                };

                var stringRequest = new RequestLocation(stringData);
                var numericRequest = new RequestLocation(numericData);

                expect(stringRequest.speed()).to.equal("25.5");
                expect(numericRequest.speed()).to.equal(25.5);
                expect(stringRequest.batteryLevel()).to.equal("85");
                expect(numericRequest.batteryLevel()).to.equal(85);
                expect(stringRequest.altitude()).to.equal("120.5");
                expect(numericRequest.altitude()).to.equal(120.5);
            });
        });
    });

});