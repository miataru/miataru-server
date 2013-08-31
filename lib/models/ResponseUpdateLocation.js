function ResponseUpdateLocation(eye) {
    this._eye = eye;
}

ResponseUpdateLocation.prototype.data = function() {
    return {
    	MiataruResponse: 'ACK',
        MiataruVerbose: '><)))' + this._eye + '>'
    };
};

module.exports = ResponseUpdateLocation;