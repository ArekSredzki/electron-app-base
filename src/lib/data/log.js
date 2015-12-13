'use strict';

const path = require('path');

const CONST = require('../common/constants');
const logger = require('../common/log');

module.exports = function(logDirectory) {
  if (!CONST.APP.DEBUG && logDirectory) {
    logger.add(logger.transports.File, {
      level: 'warn',
      filename: path.join(logDirectory, 'data.txt'),
      handleExceptions: true,
      humanReadableUnhandledException: true
    });
  }

  return logger;
};
