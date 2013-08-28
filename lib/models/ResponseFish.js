function ResponseFish(eye) {
    this._eye = eye;
}

ResponseFish.prototype.data = function() {
    return {
        MiataruFishResponse: '><)))' + this._eye + '>'
    };
};

module.exports = ResponseFish;