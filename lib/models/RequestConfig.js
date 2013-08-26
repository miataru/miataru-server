var errors = require('../errors');

function RequestConfig(data) {
    data = data || {};

    this._enableLocationHistory = data.EnableLocationHistory || null;
    this._locationDataRentionTime = data.LocationDataRetentionTime || null;

    if(this._enableLocationHistory !== null) {
        if(this._enableLocationHistory.toLowerCase() === 'true') {
            this._enableLocationHistory = true;
        } else {
            this._enableLocationHistory = false;
        }
    }

    if(this._locationDataRentionTime !== null) {
        this._locationDataRentionTime = +this._locationDataRentionTime;
    }

    this._validate();
}

RequestConfig.prototype.enableLocationHistory = function() {
    return this._enableLocationHistory;
};

RequestConfig.prototype.locationDataRetentionTime = function() {
    return this._locationDataRentionTime;
};

RequestConfig.prototype._validate = function() {
    var that = this;
    Object.keys(this).forEach(function(property) {
        if(that[property] === null) {
            throw new errors.BadRequestError('Missing RequestProperty ' + property + ' in configuration');
        }
    });
};

module.exports = RequestConfig;