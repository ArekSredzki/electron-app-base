'use strict';

const logger = require('winston');

const CONST = require('./constants');

logger.remove(logger.transports.Console);
if (CONST.APP.DEBUG) {
  logger.add(logger.transports.Console, {
    level: 'debug',
    prettyPrint: true,
    colorize: true,
    silent: false,
    timestamp: false,
    json: false
  });
}

module.exports = logger;
