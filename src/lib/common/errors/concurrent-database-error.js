'use strict';

const DatabaseError = require('./database-error');

/**
 * Used when a database load/save operation is attempted when another is already
 * running.
 */

module.exports = function ConcurrentDatabaseError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
};

require('util').inherits(module.exports, DatabaseError);
