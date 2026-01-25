function ResponseSetAllowedDeviceList() {
}

ResponseSetAllowedDeviceList.prototype.data = function() {
    return {
        MiataruResponse: 'ACK',
        MiataruVerboseResponse: 'Allowed devices list updated successfully'
    };
};

module.exports = ResponseSetAllowedDeviceList;
