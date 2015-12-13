'use strict';
/**
 * Data IPC Service
 * An interface for interacting with the main process from the database.
 */
const _ = require('lodash');
const Bluebird = require('bluebird');
const log = require('winston');
const Errio = require('errio');

const DataIPCService = function() {};
module.exports = new DataIPCService();

const CONST = require('../common/constants');
// const Utils = require('../common/utils');
const DataService = require('./data-service');
const ContentService = require('./content-service');
// const IPCError = require('../common/errors/ipc-error.js');

/**
 * Initializes the listener for messages coming from the main process.
 */
DataIPCService.prototype.initialize = function() {
  process.on('message', (m) => {
    this._handleMessage(m);
  });
};

/**
 * Send an alert message, that is not tied to any particular request, to the
 * main process.
 * @param  {String}  type       Type of alert
 * @param  {*}       payload    Payload of the alert
 * @param  {Boolean} isError    Whether the payload is an error object
 * @param  {Boolean} omitStatus Whether to omit attaching status data
 */
DataIPCService.prototype.sendAlert = function(
  type, payload, isError, omitStatus
) {
  if (isError && payload) {
    payload = Errio.stringify(payload);
  }

  process.send({
    cmd: CONST.IPC.CMD.ALERT,
    error: !!isError,
    status: omitStatus ? null : DataService.getStatus(),
    type: type,
    payload: payload
  }, undefined, (err) => {
    if (err) {
      log.error(
        'An error occurred when sending an alert to the main process.',
        err
      );
    }
  });
};

/**
 * Send a status text message to the renderer.
 * @param  {String} message Status text to send to the renderer
 */
DataIPCService.prototype.sendStatusAlert = function(message) {
  this.sendAlert(CONST.IPC.ALERT.DB.STATUS_TEXT, {
    message: message
  }, false, true);
};

/**
 * Private Methods
 */

/**
 * Send a response message to a given requestId.
 * @param  {Integer} requestId Identifier for the request
 * @param  {*}       payload   Payload of the response
 * @param  {Boolean} isError   Whether the payload is an error object
 * @param  {Boolean} omitStatus Whether to omit attaching status data
 */
DataIPCService.prototype._sendResponse = function(
  requestId, payload, isError, omitStatus
) {
  if (isError && payload) {
    payload = Errio.stringify(payload);
  }

  process.send({
    cmd: CONST.IPC.CMD.RESPONSE,
    requestId: requestId,
    status: omitStatus ? null : DataService.getStatus(),
    error: !!isError,
    payload: payload
  }, undefined, (err) => {
    if (err) {
      log.error(
        'An error occurred when sending a response to the main process.',
        err
      );
    }
  });
};

/**
 * Given a request message, attempt to run the appropriate task.
 * Send an associated response once the operation has concluded.
 * @param  {Object} m Message data
 */
DataIPCService.prototype._handleRequest = function(m) {
  let requestId = m.requestId;

  if (!requestId) {
    return;
  }

  let type = _.get(m, 'type');
  let payload = _.get(m, 'payload');

  let promise, errorMessage, omitStatus;

  switch (type) {
    /**
     * Database state messages
     */
    case CONST.IPC.REQUEST.DB.SELECT:
      promise = DataService.selectProjectDirectory(
        payload.projectDirectory
      );
      errorMessage = CONST.ERROR.DB.PROJECT.SELECT.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.UNLOAD:
      promise = DataService.getAvailabilityPromise()
        .then(() => {
          DataService.unloadDatabase();
        });
      errorMessage = CONST.ERROR.DB.UNLOAD.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.LOAD:
      promise = DataService.loadDatabase(
        payload.product,
        payload.force || false
      );
      errorMessage = CONST.ERROR.DB.LOAD.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.SAVE:
      promise = DataService.saveDatabase(
        payload.projectDirectory
      );
      errorMessage = CONST.ERROR.DB.SAVE.GENERAL;
      break;

    case CONST.IPC.REQUEST.DB.STATUS:
      promise = Bluebird.resolve({});
      break;

      /**
       * DB Content Messages
       * Queries or mutations
       */
    case CONST.IPC.REQUEST.CONTENT.COMPOUND:
      promise = DataService.getAvailabilityPromise()
        .then(() =>
          ContentService.compound(
            payload.type,
            payload.options
          ));
      errorMessage = CONST.ERROR.CONTENT.COMPOUND.GENERAL;
      omitStatus = true;
      break;

    case CONST.IPC.REQUEST.CONTENT.QUERY:
      promise = DataService.getAvailabilityPromise()
        .then(() =>
          ContentService.query(
            payload.collection,
            payload.type,
            payload.options
          ));
      errorMessage = CONST.ERROR.CONTENT.QUERY.GENERAL;
      omitStatus = true;
      break;

    case CONST.IPC.REQUEST.CONTENT.RESULT_SET:
      promise = DataService.getAvailabilityPromise()
        .then(() =>
          ContentService.runResultSetActions(
            payload.collection,
            payload.actions
          ));
      errorMessage = CONST.ERROR.CONTENT.RESULT_SET.GENERAL;
      omitStatus = true;
      break;

    case CONST.IPC.REQUEST.CONTENT.INSERT:
      promise = DataService.getAvailabilityPromise()
        .then(() =>
          ContentService.insert(
            payload.collection,
            payload.document
          ));
      errorMessage = CONST.ERROR.CONTENT.INSERT.GENERAL;
      omitStatus = true;
      break;

    case CONST.IPC.REQUEST.CONTENT.UPDATE:
      promise = DataService.getAvailabilityPromise()
        .then(() =>
          ContentService.update(
            payload.collection,
            payload.document
          ));
      errorMessage = CONST.ERROR.CONTENT.UPDATE.GENERAL;
      omitStatus = true;
      break;

    case CONST.IPC.REQUEST.CONTENT.REMOVE:
      promise = DataService.getAvailabilityPromise()
        .then(() =>
          ContentService.remove(
            payload.collection,
            payload.document
          ));
      errorMessage = CONST.ERROR.CONTENT.REMOVE.GENERAL;
      omitStatus = true;
      break;

    default:
      return this._sendResponse(
        requestId,
        new Error('Invalid Payload.'),
        true
      );
  }

  promise
    .then(payload => {
      this._sendResponse(requestId, payload);
    })
    .catch(err => {
      this._sendResponse(requestId, err, true);

      log.error(
        errorMessage,
        err
      );
    });

};

DataIPCService.prototype._handleMessage = function(m) {
  if (!m) {
    return;
  }

  if (CONST.APP.DEBUG) {
    log.silly(
      'Database received message:',
      m
    );
  }

  switch (m.cmd) {
    case CONST.IPC.CMD.REQUEST:
      this._handleRequest(m);
      break;
    default:
      log.warn(
        'Database received unknown request cmd.',
        m
      );
      break;
  }
};
