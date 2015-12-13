'use strict';
/**
 * Loki Adapter
 * This module acts as an interface between the filesystem format and the
 * in-memory LokiJS adtabase.
 *
 * NOTE: This file will likely require heavy modification by any user of the electron app base since it is highly
 * specific to each use case.
 *
 * The Angular UI uses IPC to send queries to this data service.
 */

const _ = require('lodash');
// const path = require('path');
const Loki = require('lokijs');
const Bluebird = require('bluebird');
const log = require('winston');

/**
 * Tells Loki that this is adapter requires a reference to the db object to
 * export.
 * @constructor
 */
const LokiAdapter = module.exports = function() {
  this.mode = 'reference';
};

const CONST = require('../common/constants');
const Utils = require('../common/utils');
// const IOService = require('./io-service');
// const DataService = require('./data-service');
const DataIPCService = require('./data-ipc-service');
// const DatabaseError = require('../common/errors/database-error');
const LoadDatabaseError = require('../common/errors/load-database-error');
// const SaveDatabaseError = require('../errors/save-database-error');

/**
 * Used by the LokiJS database to populate the database on creation.
 * @param  {String}   dbname   Name of the database. Must be CONST.DB.NAME
 * @param  {Function} callback Used to notify LokiJS of loading completion
 *                             Is called with either an (err) or (null, db)
 */
LokiAdapter.prototype.loadDatabase = function(dbname, callback) {
  if (!dbname || dbname !== CONST.DB.NAME) {
    return callback(
      new LoadDatabaseError('The requested database `' + dbname + '` is not valid.')
    );
  }

  // let projectDirectory = DataService.getProjectDirectory();
  // let selectedProduct = DataService.getSelectedProduct();

  DataIPCService.sendStatusAlert(CONST.INFO.DB.LOAD.STATUS.FILE_SYSTEM);

  // Database object to use for constructing a new LokiJS database
  let db = new Loki(dbname);

  return Bluebird.resolve()
    .then(() => {

      // Create collection with placeholder database
      this._createCollection(db, [{
        name: 'Jane'
      }, {
        name: 'Steve'
      }, {
        name: 'Alex'
      }, {
        name: 'Susie'
      }, {
        name: 'Charles'
      }, {
        name: 'Brit'
      }], Utils.collectionName(CONST.DB.COLLECTION.EXAMPLE));


      // Resolve after 500ms of latency.
      setTimeout(() => callback(db), 500);
    })
    .catch(callback);
};

/**
 * Used by the LokiJS database to save the database to disk for persistence.
 *
 * Note: This will currently only save product specific data, the rest is
 * considered read-only by the app.
 *
 * @param  {String}   dbname   Name of the database.
 * @param  {Object}   dbRef    Direct reference to the LokiJS databse object
 * @param  {Function} callback Used to notify LokiJS of saving completion
 *                             Is called with either an (err) or (null, db)
 */
LokiAdapter.prototype.exportDatabase = function(dbname, dbRef, callback) {
  DataIPCService.sendStatusAlert(CONST.INFO.DB.SAVE.STATUS.DATABASE);

  // Continue after 500ms of latency (giving time for the fake message to be read).
  setTimeout(() => {
    DataIPCService.sendStatusAlert(CONST.INFO.DB.SAVE.STATUS.FILE_SYSTEM);

    // Resolve after 500ms of latency.
    setTimeout(callback, 500);
  }, 500);
};

/**
 * Private Methods
 */

 LokiAdapter.prototype._createCollection = function(db, collectionArray, fullyQualifiedName) {
   // Create an indexed collection for the data set
   var collection = db.addCollection(fullyQualifiedName, {
     unique: [CONST.DB.FIELDS.IDENTIFIER]
   });
   collection.insert(collectionArray);

   var result = db.getCollection(fullyQualifiedName);

   log.info(
     'Loaded collection ' + fullyQualifiedName +
     ' with ' + _.get(result, 'data.length') + ' documents.'
   );
 };
