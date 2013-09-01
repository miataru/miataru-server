function ConsoleTransport() {}

ConsoleTransport.prototype.write = function(logContent) {
    console.log(logContent);
};

module.exports = ConsoleTransport;