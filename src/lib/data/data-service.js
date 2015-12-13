'use strict';
/**
 * Data Service
 * This module handles all in-memory databases used by the application as an
 * intermediate working format for holding data.
 *
 * The Angular UI uses IPC to send queries to this data service.
 */

const _ = require('lodash');
const Bluebird = require('bluebird');
const Loki = require('lokijs');
const log = require('winston');

const DataService = function() {
  this._db = undefined;
  this._projectDirectory = null;
  this._availableProducts = [];

  this._initialize = () => {
    this._selectedProduct = null;

    this._isModified = false;
    this._isLoading = false;
    this._isSaving = false;

    // Here we genereate an internal availability promise, which is used to
    // ensure that queries are postponed until the database has loaded, and that
    // they do not execute during atomic db operations such as loading or saving.
    // Note: we set the completion to true in order to force generation of the
    // promise.
    this._availabilityPromiseCompleted = true;
    process.nextTick(() => {
      this._generateAvailabilityPromise();
    });
  };

  this._initialize();
};

module.exports = new DataService();

const CONST = require('../common/constants');
// const Utils = require('../common/utils');
const DataIPCService = require('./data-ipc-service');

const DatabaseError = require('../common/errors/database-error');
const ConcurrentDatabaseError = require('../common/errors/concurrent-database-error');
const LoadDatabaseError = require('../common/errors/load-database-error');

const IOService = require('./io-service');
const LokiAdapter = require('./loki-adapter');

DataService.prototype.getProjectDirectory = function() {
  return this._projectDirectory;
};

DataService.prototype.getSelectedProduct = function() {
  return this._selectedProduct;
};

DataService.prototype.getStatus = function() {
  return {
    timestamp: new Date().getTime(),
    projectDirectory: this._projectDirectory,
    availableProducts: this._availableProducts,
    selectedProduct: this._selectedProduct,
    isLoading: this._isLoading,
    isSaving: this._isSaving
  };
};

DataService.prototype.getAvailabilityPromise = function() {
  return this._availabilityPromise;
};

/**
 * Ensures that a project directory is valid and selects it if the basic criteria
 * are met. It will also check what products are available.
 *
 * This will fail if the schema version of the directory is of a different major
 * release and is thus unsupported.
 *
 * @param  {String}  projectDirectory Absolute path of the desired project directory
 * @return {Promise}                 Resolved once the directory and it's products
 *                                   have been accepted and recorded
 */
DataService.prototype.selectProjectDirectory = function(projectDirectory) {
  if (this._selectedProduct) {
    return Bluebird.reject(new DatabaseError(
      CONST.ERROR.DB.PROJECT.SELECT.ACTIVE
    ));
  }

  if (!_.isString(projectDirectory)) {
    return Bluebird.reject(new DatabaseError(
      CONST.ERROR.DB.PROJECT.SELECT.INVALID
    ));
  }

  return IOService.getProducts(projectDirectory)
    .then(products => {
      this._projectDirectory = projectDirectory;

      this._availableProducts = products;

      this._sendStatus();
    })
    .catch(err => {
      if (err.code === 'ENOENT') {
        err = new DatabaseError(
          CONST.ERROR.DB.PROJECT.SELECT.INVALID
        );
      }

      return Bluebird.reject(err);
    });
};

/**
 * Attempt to select a product by name, first checking if it is valid.
 *
 * Note: A project directory must have been selected first.
 *
 * @param  {String}  product Name of the target product (case sensitive)
 * @return {Boolean}         Whether the product was successfuly selected
 */
DataService.prototype.selectProduct = function(product) {
  if (this._selectedProduct && !product) {
    return true;
  }

  if (
    (this._availableProducts.indexOf(product) !== -1)
  ) {
    // Valid product
    this._selectedProduct = product;
    return true;
  } else {
    // Invalid product
    return false;
  }
};

DataService.prototype.unloadDatabase = function() {
  this._initialize();

  this._sendStatus();
};

/**
 * Loads the data from the disk.
 *
 * @param  {String}  product          Name of the desired product
 * @param  {Boolean} force            Optional: Whether to force database load,
 *                                    ignoring whether the data has been mutated
 * @return {Promise}                  Resolved on availability (database load
 *                                    and computation complation if enabled)
 */
DataService.prototype.loadDatabase = function(product, force) {
  // Keep a temporary reference to the old database so that we can recover it
  // if something goes amiss.
  let dbBackup = this._db;

  return new Bluebird((resolve, reject) => {
      if (this._isLoading) {
        return reject(new ConcurrentDatabaseError(
          CONST.ERROR.DB.LOAD.CONCURRENT.LOAD
        ));
      }

      if (this._isSaving) {
        return reject(new ConcurrentDatabaseError(
          CONST.ERROR.DB.LOAD.CONCURRENT.SAVE
        ));
      }

      if (this._isModified && !force) {
        return reject(new LoadDatabaseError(
          CONST.ERROR.DB.LOAD.MODIFIED
        ));
      }

      if (!this.selectProduct(product)) {
        return reject(new LoadDatabaseError(
          CONST.ERROR.DB.LOAD.PRODUCT.INVALID
        ));
      }

      // Reject any other db operations that might try to start before this one
      // is complete.
      // Important: Ensure to set this to false when you are done!
      this._isLoading = true;

      this._generateAvailabilityPromise();

      log.debug(CONST.INFO.DB.LOAD.START);

      this._sendStatus();

      DataIPCService.sendStatusAlert(CONST.INFO.DB.LOAD.STATUS.START);

      // Initialize database
      this._db = new Loki(CONST.DB.NAME, {
        // The custom adapter is used to load and save data for the selected project.
        adapter: new LokiAdapter()
      });

      this._db.loadDatabase(CONST.DB.OPTIONS, err => {
        if (err) {
          // Restore previous db.
          // Note that it might be null, but still better than nothing.
          this._db = dbBackup;

          this._isLoading = false;
          return reject(err);
        }

        DataIPCService.sendStatusAlert(CONST.INFO.DB.LOAD.STATUS.CLEANUP);

        this._isModified = false;
        this._isLoading = false;

        // At this point the load operation can be considered as complete
        resolve();
      });
    })
    .then(() => {
      log.info(CONST.INFO.DB.LOAD.SUCCESS);

      this._sendStatus({
        message: CONST.INFO.DB.LOAD.SUCCESS
      });

      this._availabilityPromiseResolve();
    });
};

DataService.prototype.saveDatabase = function() {
  return new Bluebird((resolve, reject) => {
      if (this._isLoading) {
        return reject(new ConcurrentDatabaseError(
          CONST.ERROR.DB.SAVE.CONCURRENT.LOAD
        ));
      }

      if (this._isSaving) {
        return reject(new ConcurrentDatabaseError(
          CONST.ERROR.DB.SAVE.CONCURRENT.SAVE
        ));
      }

      // Reject any other db operations that might try to start before this one
      // is complete.
      // Important: Ensure to set this to false when you are done!
      this._isSaving = true;
      this._generateAvailabilityPromise();

      log.debug(CONST.INFO.DB.SAVE.START);

      DataIPCService.sendStatusAlert(CONST.INFO.DB.SAVE.STATUS.START);

      this._sendStatus();

      if (!this._isModified) {
        log.warn(CONST.WARNING.DB.SAVE.UNMODIFIED);
      }

      this._db.saveDatabase(err => {
        if (err) {
          this._isSaving = false;
          return reject(err);
        }

        DataIPCService.sendStatusAlert(CONST.INFO.DB.SAVE.STATUS.CLEANUP);

        this._isModified = false;
        this._isSaving = false;
        resolve();

      });
    })
    .then(() => {
      log.info(CONST.INFO.DB.SAVE.SUCCESS);

      this._sendStatus({
        message: CONST.INFO.DB.SAVE.SUCCESS
      });

      this._availabilityPromiseResolve();
    });
};

/**
 * Retrieve the object for a given collection.
 * @param  {String}    collectionName Name of the desired collection
 * @return {Collection}               Collection object
 */
DataService.prototype.getCollection = function(collectionName) {
  return this._db.getCollection(collectionName);
};

/**
 * Retrieve a chainable ResultSet object for a given collection.
 * @param  {String}    collectionName Name of the desired collection
 * @return {ResultSet}                Chainable ResultSet object
 */
DataService.prototype.getResultSet = function(collectionName) {
  let collection = this.getCollection(collectionName);

  if (collection) {
    return collection.chain();
  } else {
    return null;
  }
};

/**
 * Removes all data from a collection if it exists or creates it if non-existent.
 * @param  {String} collectionName Name of the target collection
 * @return {Object}                The resultant collection
 */
DataService.prototype.resetCollection = function(collectionName) {
  let collection = this.getCollection(collectionName);

  if (collection) {
    collection.removeDataOnly();
    return collection;
  } else {
    return this._db.addCollection(collectionName, {
      indices: [CONST.DB.FIELDS.IDENTIFIER]
    });
  }

  // TODO: Run content-aware computations if the following criteria are met:
  //  - This is a product collection
  //    - Not Schema
  //    - Not a Warning
  //  - This operation is not part of a computation
};

/**
 * Private Methods
 */

/**
 * Sends status data to the renderer window.
 *
 * @param  {Object}  payload Additional data for the message
 * @return {Promise}         Resolved once the message has been sent
 */
DataService.prototype._sendStatus = function(payload) {
  return DataIPCService.sendAlert(
    CONST.IPC.ALERT.DB.STATUS,
    payload
  );
};

/**
 * An internal availability promise will be generated as necessary. The resolver
 * functions will be made available as parameters of the data service.
 * This is determined by whether the previous availabiility promise has already
 * been completed.
 */
DataService.prototype._generateAvailabilityPromise = function() {
  if (!this._availabilityPromiseCompleted) {
    return;
  }

  this._availabilityPromiseCompleted = false;

  let self = this;
  this._availabilityPromise = new Bluebird((resolve, reject) => {
    self._availabilityPromiseResolve = () => {
      resolve();
      this._availabilityPromiseCompleted = true;
    };
    self._availabilityPromiseReject = () => {
      reject();
      this._availabilityPromiseCompleted = true;
    };
  });

  this._availabilityPromise.catch(() => {});
};
