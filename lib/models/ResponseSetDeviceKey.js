function ResponseSetDeviceKey() {
}

ResponseSetDeviceKey.prototype.data = function() {
    return {
        MiataruResponse: 'ACK',
        MiataruVerboseResponse: 'Device key set successfully'
    };
};

module.exports = ResponseSetDeviceKey;
