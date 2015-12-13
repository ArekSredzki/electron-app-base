'use strict';
/**
 * User Settings
 * This module keeps global reference to project directory & any other persistent
 * user settings
 */

const _ = require('lodash');
const log = require('winston');
const Bluebird = require('bluebird');
const storage = Bluebird.promisifyAll(require('electron-json-storage'));

function UserSettings() {
  this.data = {};
  this.loadPromise = undefined;
  this.savePromise = undefined;
}

/**
 * Retrieve any saved user settings and save a promise for doing so to the
 * loadPromise attribute
 * @return {Bluebird} Resolved once the settings have been loaded from disk
 */
UserSettings.prototype.load = function() {
  this.loadPromise = storage.getAsync('UserSettings')
    .then(restoredUserSettings => {
      _.extend(this.data, restoredUserSettings);
    })
    .catch(err => {
      log.error(
        'An error occured while reading user settings.',
        err
      );

      return this.save();
    });

  return this.loadPromise;
};
/**
 * Save all defined user settings and save a promise for doing so to the
 * savePromise attribute
 * @return {Bluebird} Resolved once settings have been saved
 */
UserSettings.prototype.save = function() {
  return (this.savePromise = storage.setAsync('UserSettings', this.data)
    .then(() => log.info('Saved user settings.')));
};


/**
 * Gets the value of a parameter from user settings.
 * Warning: This does not account for when the settings have not yet been loaded
 * @param  {String} parameterName The path of the property to get
 * @return {*}                    Returns the resolved value or undefined
 */
UserSettings.prototype.getSync = function(parameterName) {
  return _.get(this.data, parameterName);
};

/**
 * A promisified version of getSync, which returns a promise which is resolved
 * with the desired parameter. Will load from disk if this hasn't been done.
 * Enables safe usage when the loading state of settings from disk is unknown.
 * @param  {String}   parameterName The path of the property to get
 * @return {Bluebird}               A promise that's resolved with the parameter
 */
UserSettings.prototype.get = function(parameterName) {
  var promise = !!this.loadPromise ? this.loadPromise : this.load();
  return promise
    .then(() => {
      return this.getSync(parameterName);
    });
};


/**
 * Sets the value of a parameter in user settings.
 *
 * Warning: This does not save the value to disk. Do so only when needed, but
 * don't forget to!
 *
 * @param  {String} parameterName The path of the property to get
 * @param  {*}      value         The value to set.
 */
UserSettings.prototype.set = function(parameterName, value) {
  return _.set(this.data, parameterName, value);
};

module.exports = new UserSettings();
