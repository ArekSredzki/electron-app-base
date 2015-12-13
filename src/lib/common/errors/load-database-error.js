'use strict';

const DatabaseError = require('./database-error');

module.exports = function LoadDatabaseError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
};

require('util').inherits(module.exports, DatabaseError);
