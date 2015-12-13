'use strict';
/**
 * Database
 * This module manages the database process & offers an IPC interface for it
 */

const _ = require('lodash');
const log = require('winston');
const path = require('path');
const Bluebird = require('bluebird');
const Errio = require('errio');
const cp = require('child_process');

// Module to control application life. Used here for killing the app on database
// failure.
const electron = require('electron');
const app = electron.app;
const dialog = electron.dialog;

const Database = function() {
  this._databaseProcess = undefined;

  // Unresolved Query Promises
  // This allows us to asyncronously handle responses from the database
  // process.
  this._requestPromises = {};

  // Request identifier generator
  // This increments each time a request is made, and is used to identify
  // which request the message from the database process matches.
  //
  // Usage: let requestId = this._requestIdGenerator.next().value
  this._requestIdGenerator = (function*() {
    var requestId = 1;

    while (true) {
      yield requestId++;
    }
  })();
};
module.exports = new Database();

const CONST = require('../common/constants');
// const Utils = require('../common/utils');
const UserSettings = require('./user-settings');
const DatabaseError = require('../common/errors/database-error');
const IPCService = require('./ipc-service');

/**
 * Initializes the Database synchronously.
 * This will fork a new data process.
 *
 * Note: To avoid unwanted data loss, this will fail if the database process is
 * already running.
 *
 * @return {Boolean} True if started successfully, false if the database is
 * already running.
 */
Database.prototype.initialize = function() {
  // Check if database is already running
  if (this.databaseProcess !== undefined) {
    log.error(CONST.ERROR.DB.PROCESS.START.RUNNING);
    return false;
  }

  let databaseProcessPath = path.join(__dirname, '/../data/data-process.js');

  log.debug('Database process path.', databaseProcessPath);

  let options = {};

  options.silent = !CONST.APP.DEBUG;

  const argString = process.argv.concat(process.execArgv).join('');
  // Whether the process is being run in debug mode
  const isDebug = typeof v8debug === 'object' || /--debug|--inspect/.test(argString);

  if (isDebug) {
    const dbDebugPort = (process.debugPort || 5858) + 1;
    options.execArgv = (process.execArgv || []);
    options.execArgv.push(`--inspect=${dbDebugPort}`);
  }

  this.databaseProcess = cp.fork(
    databaseProcessPath, [
      path.join(app.getPath('userData'))
    ], options
  );

  this.databaseProcess.on(
    'message',
    data => this._handleMessage(data)
  );

  this.databaseProcess.on(
    'close',
    (code, signal) => this._handleDatabaseProcessClose(code, signal)
  );

  this.databaseProcess.on(
    'exit',
    (code, signal) => this._handleDatabaseProcessClose(code, signal)
  );

  UserSettings.get('projectDirectory')
    .then(projectDirectory => {
      if (!_.isString(projectDirectory)) {
        return Bluebird.reject();
      }

      return this.sendRequest({
        type: CONST.IPC.REQUEST.DB.SELECT,
        payload: {
          projectDirectory: projectDirectory
        }
      });
    })
    .catch(() => {
      UserSettings.set('projectDirectory', undefined);
    });

  return this.databaseProcess !== undefined;
};

/**
 * Safely send messages to the database process.
 * @param  {Object}   data Complete message data object
 * @return {Bluebird}      Resolved when the database's response is received
 */
Database.prototype.sendRequest = function(data) {
  _.defaults(data, {
    cmd: CONST.IPC.CMD.REQUEST
  });

  return this._generateRequestPromise(data);
};

/**
 * Determine whether the database has been loaded.
 * @return {bool} Whether the database has been loaded.
 */
Database.prototype.isLoaded = function() {
  return this.databaseProcess !== undefined;
};

/**
 * Private Methods
 */

/**
 * Request Helpers
 */

/**
 * Generate a promise and add it's resolve / reject functions to a local
 * array so that it they can be used once the database response is felt.
 * @param  {Object}   data Packaged payload data
 * @return {Bluebird}      Resolved by the various event handlers
 */
Database.prototype._generateRequestPromise = function(data) {
  if (!this.databaseProcess) {
    return Bluebird.reject(
      new DatabaseError(CONST.ERROR.DB.PROCESS.SEND.UNINITIALIZED)
    );
  }

  if (!this.databaseProcess.connected) {
    return Bluebird.reject(
      new DatabaseError(CONST.ERROR.DB.PROCESS.SEND.DISCONNECTED)
    );
  }

  data.requestId = this._requestIdGenerator.next().value;

  var requestPromise = new Bluebird((resolve, reject) => {
    this._requestPromises[data.requestId] = {
      resolve: resolve,
      reject: reject
    };
  });

  this.databaseProcess.send(data);

  return requestPromise;
};

/**
 * Handle Events
 */

/**
 * Handle message objects sent by the database
 * @param  {Object} m Message data
 */
Database.prototype._handleMessage = function(m) {
  if (!m) {
    return;
  }

  if (m.error && m.payload) {
    m.payload = Errio.parse(m.payload);
  }

  this._printIPCResponse(m);

  switch (m.cmd) {
    case CONST.IPC.CMD.RESPONSE:
      this._handleRequestResponse(m);
      break;
    case CONST.IPC.CMD.ALERT:
      this._handleAlert(m);
      break;
    default:
      break;
  }
};

/**
 * Handles a resolved request event.
 * Makes use of the promise functions stored under requestPromises to
 * provide feedback to the original request.
 *
 * @param {Object} data Data object from the database process
 */
Database.prototype._handleRequestResponse = function(data) {
  var requestPromiseResolvers;

  if (!data ||
    !_.has(data, 'requestId') ||
    !(requestPromiseResolvers = this._requestPromises[data.requestId])
  ) {
    log.error(CONST.ERROR.IPC.RESPONSE.NONEXISTENT_REQUEST);
    return;
  }

  if (data.error) {
    requestPromiseResolvers.reject(data);
  } else {
    requestPromiseResolvers.resolve(data);
  }

  delete this._requestPromises[data.requestId];
};

/**
 * Handles an alert event.
 * @param {Object} data Data object from the database process
 */
Database.prototype._handleAlert = function(data) {
  IPCService.sendAlertData(data)
    .catch(err => log.error(
      CONST.ERROR.DB.PROCESS.SEND.IPC.RENDERER,
      err
    ));
};

/**
 * Prints information about an IPC Response to the console.
 * @param  {Object} data Message data
 */
Database.prototype._printIPCResponse = function(data) {
  if (CONST.APP.DEBUG) {
    log.silly(
      'Main process received database message:',
      _.pick(data, [
        'cmd',
        'requestId',
        'error'
      ])
    );
  }
};

/**
 * Handle a database process closure, this should almost always be triggered by
 * an error.
 *
 * @param  {Number} code   Exit code of the database process if not external sig
 * @param  {Number} signal The external signal that killed the database process
 */
Database.prototype._handleDatabaseProcessClose = function(code, signal) {
  if (code !== null || (!signal && signal !== undefined)) {

    log.error('Database failure: code', code, 'signal', signal);

    dialog.showErrorBox(
      'Database Failure',
      'Database Process Stopped Unexpectedly.\nThis is a Fatal Error.\n' +
      'Code: ' + code + '\nSignal: ' + signal
    );

    // Shut down the app
    app.quit();
  } else {
    this.databaseProcess = undefined;
  }
};
