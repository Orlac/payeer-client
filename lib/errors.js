var util = require('util');

module.exports = exports = {};

function BadInputError(message) {
  'use strict';
  this.name = 'BAD_INPUT';
  this.message = message;
  Error.captureStackTrace(this, BadInputError);
}

function PayeerUnauthorizedEror(message) {
  'use strict';
  this.name = 'PAYEER_UNAUTHORIZED';
  this.message = message;
  Error.captureStackTrace(this, PayeerUnauthorizedEror);
};

function PayeerRequestError(message, errors) {
  'use strict';
  this.name = 'PAYEER_REQUEST_FAILED';
  this.message = message;
  this.errors = errors;
  Error.captureStackTrace(this, PayeerRequestError);
};

util.inherits(BadInputError, Error);
util.inherits(PayeerUnauthorizedEror, Error);
util.inherits(PayeerRequestError, Error);

exports.BadInputError = BadInputError;
exports.PayeerRequestError = PayeerRequestError;
exports.PayeerUnauthorizedEror = PayeerUnauthorizedEror;
