'use strict';

const app = require('electron').app;
const path = require('path');

const CONST = require('../common/constants');
const logger = require('../common/log');

if (!CONST.APP.DEBUG) {
  logger.add(logger.transports.File, {
    level: 'debug',
    filename: path.join(app.getPath('userData'), 'main.txt'),
    handleExceptions: true,
    humanReadableUnhandledException: true
  });
}

app.on('quit', (event, exitCode) => {
  if (exitCode !== 0) {
    logger.error(
      'Application closing with exit code: ' + exitCode,
      event
    );
  }
});

module.exports = logger;
