(function() {
  'use strict';

  /**
   * A Service which handles interactions with the main process.
   */
  let IPCService = function(
    PubSub, Notification, CONST
  ) {
    var ipcRenderer = require('electron').ipcRenderer;

    // Unresolved Query Promises
    // This allows us to asyncronously handle responses from the main
    // process.
    this._requestPromises = {};

    // Request identifier generator
    // This increments each time a request is made, and is used to identify
    // which request the message from the main process matches.
    //
    // Usage: let requestId = this._requestIdGenerator.next().value
    this._requestIdGenerator = (function*() {
      var requestId = 1;

      while (true) {
        yield requestId++;
      }
    })();

    /**
     * Request Helpers
     */

    /**
     * Generate a promise and add it's resolve / reject functions to a local
     * array so that it they can be used once the database response is felt.
     * @param  {String}   type    Request type
     * @param  {Object}   payload Request payload
     * @return {Bluebird}         Resolved on response from database
     */
    this.sendRequest = (type, payload) => {
      var requestId = this._requestIdGenerator.next().value;

      payload = payload || {};

      var requestPromise = new Promise((resolve, reject) => {
        this._requestPromises[requestId] = {
          resolve: resolve,
          reject: reject
        };
      });

      let data = {
        type: type,
        requestId: requestId,
        payload: payload
      };

      // TODO: Remove debug message
      console.log('IPC Message Sending:', data);

      ipcRenderer.send(CONST.IPC.CMD.REQUEST, data);

      return requestPromise;
    };

    /**
     * Notify the app of a successful request.
     * This involves publishing the event and displaying a success notification.
     *
     * @param  {*}      payload        Payload of the response
     * @param  {String} defaultMessage Message to use if not contained in
     *                                 payload
     * @param  {String} event          PubSub event identifier
     */
    this.notifyOfSuccessfulRequest = (payload, defaultMessage, event) => {
      if (event) {
        PubSub.publish(event, payload);
      }

      let notificationObject = {
        message: _.get(payload, 'message') || defaultMessage
      };

      Notification.success(notificationObject);
    };

    /**
     * Notify the app of a failed request.
     * This involves publishing the event and displaying an error notification.
     *
     * @param  {*}      payload        Payload of the response
     * @param  {String} defaultMessage Message to use if not contained in
     *                                 payload
     * @param  {String} event          PubSub event identifier
     */
    this.notifyOfFailedRequest = (payload, defaultMessage, event) => {
      if (event) {
        PubSub.publish(event, payload);
      }

      let notificationObject = {
        message: _.get(payload, 'message') || defaultMessage
      };

      Notification.error(notificationObject);
    };

    /**
     * Handle Events
     */

    /**
     * Handles a resolved request event.
     * Makes use of the promise functions stored under requestPromises to
     * provide feedback to the original request.
     *
     * @param  {Object} event Contains sender EventEmitter
     * @param  {Object} data  Data object from the main process
     */
    this._handleRequestResponse = data => {
      if (CONST.APP.DEBUG) {
        console.log('IPC Request Response:', data);
      }

      let requestPromiseResolvers;

      if (!data || !_.has(data, 'requestId') ||
        !(requestPromiseResolvers = this._requestPromises[data.requestId])
      ) {
        console.error(
          CONST.ERROR.IPC.RESPONSE.NONEXISTENT_REQUEST
        );
        Notification.error(
          CONST.ERROR.IPC.RESPONSE.NONEXISTENT_REQUEST
        );
        return;
      }

      if (data.status) {
        PubSub.publish(CONST.NG.EVENT.DB.STATUS.DATA, data.status);
      }

      if (_.isString(data.name) && data.name.indexOf('Error') !== -1) {
        requestPromiseResolvers.reject(data);
      } else if (data.error) {
        requestPromiseResolvers.reject(data.payload);
      } else {
        requestPromiseResolvers.resolve(data.payload);
      }

      delete this._requestPromises[data.requestId];
    };

    /**
     * Handles an alert event.
     * @param {Object} data Data object from the database process
     */
    this._handleAlert = data => {
      if (CONST.APP.DEBUG) {
        console.log('IPC Alert:', data);
      }

      let payload = data.payload;

      if (data.status) {
        PubSub.publish(CONST.NG.EVENT.DB.STATUS.DATA, data.status);
      }

      if (!_.isString(data.type)) {
        return console.error('Alert did not include a type.');
      }

      let notificationObject;

      switch (data.type) {
        case CONST.IPC.ALERT.DB.STATUS:
          // Status update event is broadcast above, don't re-send it
          return;
        case CONST.IPC.ALERT.DB.ERROR:
          notificationObject = {
            message: payload.message || (payload.err || {}).message
          };

          if (notificationObject.message) {
            notificationObject.title = CONST.ERROR.DB.TITLE;
          } else {
            notificationObject.message = CONST.ERROR.DB.TITLE;
          }

          Notification.error(notificationObject);

          break;
        case CONST.IPC.ALERT.APP.UPDATE_ERROR:
          PubSub.publish(CONST.NG.EVENT.APP.UPDATE.INTERNAL_CHANGE, payload);

          notificationObject = {
            message: payload.message || (payload.err || {}).message
          };

          if (notificationObject.message) {
            notificationObject.title = CONST.ERROR.APP.UPDATE.TITLE;
          } else {
            notificationObject.message = CONST.ERROR.APP.UPDATE.TITLE;
          }

          Notification.error(notificationObject);

          break;
        default:

      }

      let eventName = data.type.replace('alert-', '');
      PubSub.publish(eventName, payload);
    };

    /**
     * Listen for IPC Messages
     */
    ipcRenderer.on(
      CONST.IPC.CMD.RESPONSE,
      (event, m) => this._handleRequestResponse(m)
    );

    ipcRenderer.on(
      CONST.IPC.CMD.ALERT,
      (event, m) => this._handleAlert(m)
    );
  };

  angular.module('app.core.services')
    .service('IPCService', IPCService);
}());
