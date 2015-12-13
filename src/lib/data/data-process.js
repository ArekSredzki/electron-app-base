'use strict';
/**
 * Data Process
 * This process contains our database, for more information see data-service.
 *
 * The database often performs CPU-bound operations and thus has been extracted
 * into it's own process. This allows other operations to run in the meantime.
 * Doing so was especially important to avoid blocking synchronous IPC between
 * the renderer windows and main process; if this is allowed to happen, it is
 * very disruptive to the user experience.
 */

const log = require('./log')(process.argv[2]); // jshint ignore:line
const DataIPCService = require('./data-ipc-service');

DataIPCService.initialize();
