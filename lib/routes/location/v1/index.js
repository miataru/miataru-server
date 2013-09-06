var inputParser = require('./inputParser');
var location = require('./location');

module.exports = {
    inputParser: inputParser,
    updateLocation: location.updateLocation,
    getLocation: location.getLocation,
    getLocationHistory: location.getLocationHistory
};