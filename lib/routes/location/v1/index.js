var inputParser = require('./inputParser');
var location = require('./location');

module.exports = {
    inputParser: inputParser,
    updateLocation: location.updateLocation,
    getLocation: location.getLocation,
    getLocationGeoJSON: location.getLocationGeoJSON,
    getLocationGeoJSONGET: location.getLocationGeoJSONGET,
    getLocationHistory: location.getLocationHistory,
    getVisitorHistory: location.getVisitorHistory,
    deleteLocation: location.deleteLocation,
    setDeviceKey: location.setDeviceKey,
    setAllowedDeviceList: location.setAllowedDeviceList
};
