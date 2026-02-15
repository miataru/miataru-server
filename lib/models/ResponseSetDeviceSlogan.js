function ResponseSetDeviceSlogan() {
}

ResponseSetDeviceSlogan.prototype.data = function() {
    return {
        MiataruResponse: 'ACK',
        MiataruVerboseResponse: 'Device slogan set successfully'
    };
};

module.exports = ResponseSetDeviceSlogan;
