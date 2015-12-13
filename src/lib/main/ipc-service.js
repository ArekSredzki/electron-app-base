'use strict';
/**
 * IPC Service
 * An interface for interacting with the renderer process.
 */
const _ = require('lodash');
const log = require('winston');
const Bluebird = require('bluebird');
const ipcMain = require('electron').ipcMain;

const CONST = require('../common/constants');

const IPCService = function() {
  this.rendererLoadPromise = undefined;
  this._listenersInitialized = false;
};
module.exports = new IPCService();

// const Utils = require('../common/utils');
const UserSettings = require('./user-settings');
const Database = require('./database');
const AutoUpdateManager = require('./auto-update-manager');
const IPCError = require('../common/errors/ipc-error.js');

/**
 * Initializes the IPC Service.
 * This will add the appropriate listeners & setup the internal renderer load
 * promise.
 *
 * Important: Implementer MUST set the internal webContents object reference
 * so that we can send alert messages. This is done by calling:
 *  - IPCService.setWebContents(webContents);
 */
IPCService.prototype.initialize = function() {
  this._webContents = undefined;

  this.rendererLoadPromise = new Bluebird((resolve, reject) => {
    /**
     * Used to notify the IPC Service that it can safely send to webContents.
     * @param  {Object} webContents The main window's webContents object.
     */
    this._rendererLoadPromiseResolve = resolve;
    this._rendererLoadPromiseReject = reject;
  });

  this._initializeListeners();
};

/**
 * Listen to webContents, and upon the page loading, resolve the internal
 * promise, notifying that we can start sending.
 *
 * @param  {Object} webContents The main window's webContents object.
 */
IPCService.prototype.setWebContents = function(webContents) {
  webContents.on('did-finish-load', () => {
    this._webContents = webContents;
    this._rendererLoadPromiseResolve();
  });

  webContents.on('destroyed', () => {
    // It's important to check that the webcontents reference hasn't been
    // replaced by re-initializing.
    if (this._webContents === webContents) {
      this._rendererLoadPromiseReject();
      this.initialize();
    }
  });
};

/**
 * Safely send an alert message to the renderer process.
 * The message will only be sent once the browser window has been opened.
 *
 * Note: An alert message is NOT tied to any particular request.
 *
 * @param  {String}  type    Type of alert
 * @param  {*}       payload Payload of the alert
 * @param  {Boolean} isError Whether the payload is an error object
 */
IPCService.prototype.sendAlert = function(type, payload, isError) {
  const data = {
    cmd: CONST.IPC.CMD.ALERT,
    error: !!isError,
    type: type,
    payload: payload
  };

  return this.sendAlertData(data);
};

/**
 * Safely send a composed alert message data object to the renderer process.
 * The message will only be sent once the browser window has been opened.
 *
 * Note: An alert message is NOT tied to any particular request.
 *
 * @param   {*}       data Message data object
 * @returns {Promise}      Resolved once the alert has been sent
 */
IPCService.prototype.sendAlertData = function(data) {
  if (!this.rendererLoadPromise) {
    return Bluebird.reject(new IPCError(CONST.ERROR.IPC.SEND.EARLY));
  }

  return this.rendererLoadPromise
    .then(() => {
      if (!this._webContents) {
        return Bluebird.reject(
          new IPCError(CONST.ERROR.IPC.SEND.NO_WEBCONTENTS)
        );
      }

      this._webContents.send(CONST.IPC.CMD.ALERT, data);
    });
};

/**
 * Private Methods
 */

/**
 * Safely send an response message to the renderer process.
 * The message will only be sent once the browser window has been opened.
 *
 * Note: A response message IS tied to any particular request.
 *
 * @param  {Integer} requestId Identifier for the request
 * @param  {*}       data      Message data object
 */
IPCService.prototype._sendResponse = function(requestId, data) {
  if (!this.rendererLoadPromise) {
    return Bluebird.reject(new IPCError(CONST.ERROR.IPC.SEND.EARLY));
  }

  if (!_.isObject(data)) {
    data = {};
  }

  data.requestId = requestId;

  return this.rendererLoadPromise
    .then(() => {
      if (!this._webContents) {
        return Bluebird.reject(
          new IPCError(CONST.ERROR.IPC.SEND.NO_WEBCONTENTS)
        );
      }

      this._webContents.send(CONST.IPC.CMD.RESPONSE, data);
    });
};

/**
 * Given a request message, attempt to run the appropriate task.
 * Send an associated response once the operation has concluded.
 * @param  {Object} m Message data
 */
IPCService.prototype._handleRequest = function(m) {
  if (CONST.APP.DEBUG) {
    log.silly(
      'Main process received renderer message:',
      m
    );
  }

  if (!m) {
    return;
  }

  let requestId = _.get(m, 'requestId');

  if (!requestId) {
    return;
  }

  let type = _.get(m, 'type');

  let promise, errorMessage;

  switch (type) {
    /**
     * App state messages
     */
    case CONST.IPC.REQUEST.APP.UPDATE.INSTALL:
      promise = Bluebird.resolve(AutoUpdateManager.installUpdate());
      errorMessage = CONST.ERROR.APP.UPDATE.INSTALL.GENERAL;
      break;

    case CONST.IPC.REQUEST.APP.UPDATE.CHECK:
      promise = Bluebird.resolve(AutoUpdateManager.checkForUpdates());
      errorMessage = CONST.ERROR.APP.UPDATE.CHECK.GENERAL;
      break;

    case CONST.IPC.REQUEST.APP.UPDATE.CHANNEL_SELECT:
      promise = Bluebird.resolve(AutoUpdateManager.selectChannel(m.payload));
      errorMessage = CONST.ERROR.APP.UPDATE.CHANNEL_SELECT.GENERAL;
      break;

    case CONST.IPC.REQUEST.APP.UPDATE.STATUS:
      promise = Bluebird.resolve({
        payload: AutoUpdateManager.getStatus()
      });
      errorMessage = CONST.ERROR.APP.UPDATE.STATUS.GENERAL;
      break;

      /**
       * Database state messages
       */
    case CONST.IPC.REQUEST.DB.SELECT:
      promise = Database.sendRequest(m)
        .then(data => {
          // Memorize our choice for the next time we open the app.
          UserSettings.set('projectDirectory', m.payload.projectDirectory);

          return data;
        })
        .catch(err => {
          UserSettings.get('projectDirectory')
            .then(currentProjectDirectory => {
              // If the currently saved project directory was the one that failed
              // to load, remove it from persistence.
              if (currentProjectDirectory === m.payload.projectDirectory) {
                UserSettings.set('projectDirectory', null);
              }
            });

          return Bluebird.reject(err);
        });
      errorMessage = CONST.ERROR.DB.PROJECT.SELECT.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.UNLOAD:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.DB.UNLOAD.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.LOAD:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.DB.LOAD.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.SAVE:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.DB.SAVE.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.STATUS:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.DB.STATUS.GENERAL;
      break;

      /**
       * DB Content Messages
       * Queries or mutations
       */
    case CONST.IPC.REQUEST.CONTENT.COMPOUND:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.CONTENT.COMPOUND.GENERAL;
      break;

    case CONST.IPC.REQUEST.CONTENT.QUERY:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.CONTENT.QUERY.GENERAL;
      break;

    case CONST.IPC.REQUEST.CONTENT.RESULT_SET:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.CONTENT.RESULT_SET.GENERAL;
      break;

    case CONST.IPC.REQUEST.CONTENT.INSERT:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.CONTENT.INSERT.GENERAL;
      break;

    case CONST.IPC.REQUEST.CONTENT.UPDATE:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.CONTENT.UPDATE.GENERAL;
      break;

    case CONST.IPC.REQUEST.CONTENT.REMOVE:
      promise = Database.sendRequest(m);
      errorMessage = CONST.ERROR.CONTENT.REMOVE.GENERAL;
      break;

    default:
      return this._sendResponse(
        requestId, {
          error: true,
          payload: new Error('Invalid Payload.')
        }
      );
  }

  promise
    .then(data => {
      this._sendResponse(requestId, data)
        .catch(err => log.error(
          CONST.ERROR.DB.PROCESS.SEND.IPC.DB,
          err
        ));
    })
    .catch(data => {
      this._sendResponse(requestId, data);

      log.error(
        errorMessage,
        _.get(data, 'payload.message') || data
      );
    });
};

/**
 * These two methods are overwritten once the the service is initialized
 */
IPCService.prototype._rendererLoadPromiseResolve = function() {
  throw new IPCError(CONST.ERROR.IPC.RESOLVE.EARLY);
};
IPCService.prototype._rendererLoadPromiseReject = function() {
  throw new IPCError(CONST.ERROR.IPC.REJECT.EARLY);
};

/**
 * Initializes IPC listeners which handle messages from the browser.
 */
IPCService.prototype._initializeListeners = function() {
  if (this._listenersInitialized) {
    return;
  }
  this._listenersInitialized = true;

  ipcMain.on(
    CONST.IPC.CMD.REQUEST,
    (event, m) => this._handleRequest(m)
  );
};
