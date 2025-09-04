var errors = require('../errors');

function RequestConfig(data) {
    data = data || {};

    this._enableLocationHistory = data.EnableLocationHistory || null;
    this._locationDataRetentionTime = data.LocationDataRetentionTime || null;

    if(this._enableLocationHistory !== null) {
        // Validate that EnableLocationHistory is a string
        if(typeof this._enableLocationHistory !== 'string') {
            throw new errors.BadRequestError('EnableLocationHistory must be a string, received: ' + typeof this._enableLocationHistory);
        }
        
        if(this._enableLocationHistory.toLowerCase() === 'true') {
            this._enableLocationHistory = true;
        } else {
            this._enableLocationHistory = false;
        }
    }

    if(this._locationDataRetentionTime !== null) {
        this._locationDataRetentionTime = +this._locationDataRetentionTime;
    }

    this._validate();
}

RequestConfig.prototype.enableLocationHistory = function() {
    return this._enableLocationHistory;
};

RequestConfig.prototype.locationDataRetentionTime = function() {
    return this._locationDataRetentionTime;
};

RequestConfig.prototype._validate = function() {
    var that = this;

    Object.keys(this).forEach(function(property) {
        // Allow _enableLocationHistory to be null as it's optional
        if(that[property] === null && property !== '_enableLocationHistory') {
            throw new errors.BadRequestError('Missing RequestProperty ' + property + ' in configuration');
          }
    });
};

module.exports = RequestConfig;
