var util = require('util');

function BaseError(mssg, statusCode) {
    Error.call(this, mssg);

    this.message = mssg;
    this.statusCode = statusCode;
}
util.inherits(BaseError, Error);

function MethodNotSupportedError(method, path) {
    BaseError.call(this, 'Method not supported on endpoint ' + path + ': ' + method + '. Please refer to the api documentation at http://www.miataru.com/#tabr4', 405);
}
util.inherits(MethodNotSupportedError, BaseError);

function NotFoundError(path) {
    BaseError.call(this, 'Not found: ' + path + '. Please refer to the API documentation at http://www.miataru.com/#tabr4', 404);
}
util.inherits(NotFoundError, BaseError);

function InternalServerError() {
    BaseError.call(this, 'Internal Server Error', 500);
}
util.inherits(InternalServerError, BaseError);

function BadRequestError(message) {
    BaseError.call(this, 'Bad Request: ' + message, 400);
}
util.inherits(BadRequestError, BaseError);

module.exports = {
    MethodNotSupportedError: MethodNotSupportedError,
    NotFoundError: NotFoundError,
    InternalServerError: InternalServerError,
    BadRequestError: BadRequestError
};