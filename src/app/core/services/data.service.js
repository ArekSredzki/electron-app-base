(function() {
  'use strict';

  /**
   * A Service which interacts with the in-memory database, through IPC to
   * retrieve the latest data and presist changes.
   */
  let DataService = function(
    $rootScope, PubSub, CacheFactory, Notification, CONST, Utils, IPCService
  ) {
    $rootScope.stateInitialized = false;

    // Cache for request results to avoid IPC RRT
    // This is reset everytime the database changes
    this.requestCache = CacheFactory('cache', CONST.NG.CACHE_SETTINGS);

    // Database State
    //
    // Note: The first database load is triggered by the main process and thus
    // we know that it loading until we get an IPC event saying otherwise.
    this.databaseStatus = {
      timestamp: 0,
      projectDirectory: null,
      availableProducts: [],
      selectedProduct: null,
      isLoading: true,
      isSaving: false
    };

    /**
     * Update the database status object if valid and emit an event if a change
     * occurred.
     * @param {Object} status Status data
     */
    this.setDatabaseStatus = status => {
      let desiredKeys = _.keys(this.databaseStatus);

      // Filter out extra properties
      status = _.pick(status, desiredKeys);

      // Ensure that all expected fields are present
      if (_.keys(status).length !== desiredKeys.length) {
        return;
      }

      // Check if the content has state has changed more than the timestamp
      if (!_.isMatch(
          status,
          _.omit(this.databaseStatus, 'timestamp')
        )) {
        PubSub.publish(CONST.NG.EVENT.DB.STATUS.STATE);
      }

      this.databaseStatus = status;
    };

    /**
     * Cache helpers
     */
    this.resetCache = () => {
      console.log('CACHE RESET');
      this.requestCache.removeAll();
    };

    /**
     * Database state helpers
     */

    /**
     * Check whether a project directory is currently selected
     * @returns {Boolean} Whether a project directory is selected
     */
    this.isDirectorySelected = () =>
      this.databaseStatus.projectDirectory !== null;

    /**
     * Check whether a product is currently selected
     * @returns {Boolean} Whether a product is selected
     */
    this.isProductSelected = () =>
      this.databaseStatus.selectedProduct !== null;

    /**
     * Check whether the databse is currently running atomic state operations.
     * @returns {Boolean} Whether the database is busy
     */
    this.isBusy = () =>
      this.databaseStatus.isLoading || this.databaseStatus.isSaving;

    /**
     * Get avaialble product names for the selected directory
     * @returns {Array} Collection of available product names
     */
    this.getAvailableProducts = () =>
      this.databaseStatus.availableProducts;

    /**
     * Database Queries
     */

    /**
     * Performs a compound action the LokiJS database with an action type.
     *
     * The available action types are:
     *  - CONST.DB.COMPOUND.*
     *
     * For more information on these action types see the methods that implement
     * them as shown below.
     *
     * @param  {String}  type    Compound action that should be performed
     * @param  {Object}  options Options for given action
     * @return {Promise}         Resolved with the results of the action
     */
    this.compound = (type, options) => {
      let requestKey = JSON.stringify(['compound', type, options]);
      let cacheHit = this.requestCache.get(requestKey);

      if (cacheHit) {
        return Promise.resolve(cacheHit);
      }

      return IPCService.sendRequest(
          CONST.IPC.REQUEST.CONTENT.COMPOUND, {
            type: type,
            options: options
          })
        .then(data => {
          this.requestCache.put(requestKey, data);
          return data;
        });
    };

    /**
     * Get a specific document by its id and avail of the faster binary
     * search algorithm used on the id index.
     *
     * Note: This index is the one set by LokiJS, it does not persist past a
     * database reload.
     *
     * @param  {Object}   collection Info object of target collection
     * @param  {Value}    id         ID of the document to be retrieved
     * @return {Bluebird}            Resolved with result, document or null
     */
    this.get = (collection, id) => {
      return this.query(
        CONST.DB.QUERY.GET,
        collection, {
          id: id
        });
    };

    /**
     * Returns the record whose field matches value, if a UniqueIndex for
     * this collection has been created. If value is omitted, it returns a
     * curried function, which you can use to supply only values. This is by
     * far the fastest retrieval method.
     *
     * The only indexed and thus valid entries for field are:
     *  - CONST.DB.FIELDS.IDENTIFIER (name)
     *
     * @param  {Object}   collection Info object of target collection
     * @param  {String}   field      Uniquely indexed field
     * @param  {Value}    value      Value of the uniquely indexed field
     * @return {Bluebird}            Resolved with result, document or null
     */
    this.by = (collection, field, value) => {
      return this.query(
        CONST.DB.QUERY.BY,
        collection, {
          field: field,
          value: value
        });
    };

    /**
     * Queries the LokiJS database with a given search method.
     *
     * The available query types are:
     *  - CONST.DB.QUERY.GET
     *  - CONST.DB.QUERY.BY
     *  - CONST.DB.QUERY.FIND
     *  - CONST.DB.QUERY.FIND_OBJECT
     *  - CONST.DB.QUERY.FIND_OBJECTS
     *  - CONST.DB.QUERY.FIND_ONE
     *
     * For more information on these query types, please see the following:
     * http://lokijs.org/#/docs#find
     *
     * @param  {String}  type         Query type to be performed
     * @param  {Object}  collection   Info object of target collection
     * @param  {Object}  options      The input parameter for said query
     * @return {Promise}              Resolved with the results of the query
     */
    this.query = (type, collection, options) => {
      let requestKey = JSON.stringify(['query', type, collection, options]);
      let cacheHit = this.requestCache.get(requestKey);

      if (cacheHit) {
        return Promise.resolve(cacheHit);
      }

      let collectionName = Utils.collectionName(collection);

      return IPCService.sendRequest(
          CONST.IPC.REQUEST.CONTENT.QUERY, {
            collection: collectionName,
            type: type,
            options: options
          })
        .then(data => {
          this.requestCache.put(requestKey, data);
          return data;
        });
    };

    /**
     * Runs a set of actions on a collection from the LokiJS database.
     *
     * Format for actions:
     * 	[{
     * 		type: CONST.DB.RESULT_SET.FIND,
     * 		args: [{'_computedProperties.cycleTimeMs':{ '$lt' : 100 }}]
     * 	}, {
     * 		type: CONST.DB.RESULT_SET.OFFSET,
     * 		args: [10]
     * 	}, {
     * 		type: CONST.DB.RESULT_SET.LIMIT,
     * 		args: [5]
     * 	}]
     *
     * The available action types are:
     *  - CONST.DB.RESULT_SET.FIND           (query)
     *  X CONST.DB.RESULT_SET.WHERE          (fun)
     *  X CONST.DB.RESULT_SET.SORT           (comparefun)
     *  - CONST.DB.RESULT_SET.SIMPLE_SORT    (propname [, isdesc])
     *  - CONST.DB.RESULT_SET.COMPOUND_SORT  (properties)
     *  X CONST.DB.RESULT_SET.UPDATE         (fun)
     *  - CONST.DB.RESULT_SET.REMOVE         ()
     *  - CONST.DB.RESULT_SET.LIMIT          (qty)
     *  - CONST.DB.RESULT_SET.OFFSET         (pos)
     *
     * Note: those actions listed with an X are not yet supported
     *
     * For more information on these action types, please see the following:
     * http://lokijs.org/#/docs#resultset
     *
     * @param  {Object}  collection Info object of target collection
     * @param  {Array}   actions    Set of actions to be performed
     * @return {Promise}            Resolved with the results
     */
    this.resultSet = (collection, actions) => {
      let requestKey = JSON.stringify(['resultSet', collection, actions]);
      let cacheHit = this.requestCache.get(requestKey);

      if (cacheHit) {
        return Promise.resolve(cacheHit);
      }

      let collectionName = Utils.collectionName(collection);

      return IPCService.sendRequest(
          CONST.IPC.REQUEST.CONTENT.RESULT_SET, {
            collection: collectionName,
            actions: actions
          })
        .then(data => {
          this.requestCache.put(requestKey, data);
          return data;
        });
    };

    /**
     * Content Modifiers
     */

    /**
     * Inserts a document into a collection.
     *
     * Document cannot have already been added to the
     * collection (have a $loki key) and must have a unique name.
     *
     * @param  {Object}  collection Info object of target collection
     * @param  {Object}  document   Document to insert
     * @return {Promise}            Resolved with the result of the insertion
     */
    this.insert = (collection, document) => {
      let collectionName = Utils.collectionName(collection);

      return IPCService.sendRequest(
          CONST.IPC.REQUEST.CONTENT.INSERT, {
            collection: collectionName,
            document: document
          })
        .then(payload => {
          PubSub.publish(CONST.NG.EVENT.CONTENT.INTERNAL_CHANGE);
          return payload;
        });
    };

    /**
     * Updates a document in a collection.
     *
     * Document must have already been added to the collection (have a $loki
     * key) and must have a unique name.
     *
     * @param  {Object}  collection Info object of target collection
     * @param  {Object}  document   Document to update
     * @return {Promise}            Resolved with the result of the update
     */
    this.update = (collection, document) => {
      let collectionName = Utils.collectionName(collection);

      return IPCService.sendRequest(
          CONST.IPC.REQUEST.CONTENT.UPDATE, {
            collection: collectionName,
            document: document
          })
        .then(payload => {
          PubSub.publish(CONST.NG.EVENT.CONTENT.INTERNAL_CHANGE);
          return payload;
        });
    };

    /**
     * Removes a document from a collection.
     *
     * Document must have already been added to the collection (have a $loki
     * key).
     *
     * For a find
     *
     * @param  {Object}  collection Info object of target collection
     * @param  {Object}  document   Document to remove
     * @return {Promise}            Resolved with the result of the removal
     */
    this.remove = (collection, document) => {
      let collectionName = Utils.collectionName(collection);

      return IPCService.sendRequest(
          CONST.IPC.REQUEST.CONTENT.REMOVE, {
            collection: collectionName,
            document: document
          })
        .then(payload => {
          PubSub.publish(CONST.NG.EVENT.CONTENT.INTERNAL_CHANGE);
          return payload;
        });
    };

    /**
     * Database Methods
     */

    /**
     * Database State Persistence (Interactions with Disk)
     */

    /**
     * Selects a project directory.
     *
     * @return {Bluebird} Resolved once the project directory has been selected
     */
    this.selectProjectDirectory = projectDirectory => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.DB.SELECT, {
            projectDirectory: projectDirectory
          }
        )
        .then(payload => {
          IPCService.notifyOfSuccessfulRequest(
            payload,
            CONST.INFO.DB.SELECT.SUCCESS,
            CONST.NG.EVENT.DB.SELECT.SUCCESS
          );
        })
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.DB.PROJECT.SELECT.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Unloads the in-memory database, deselecting the product.
     *
     * @return {Bluebird} Resolved once unloaded
     */
    this.unloadDatabase = () => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.DB.UNLOAD
        )
        .then(payload => {
          IPCService.notifyOfSuccessfulRequest(
            payload,
            CONST.INFO.DB.UNLOAD.SUCCESS,
            CONST.NG.EVENT.DB.UNLOAD.SUCCESS
          );

          PubSub.publish(CONST.NG.EVENT.CONTENT.INTERNAL_CHANGE);
        })
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.DB.UNLOAD.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Loads the in-memory database from disk.
     *
     * @param  {String}   product Name of the target product (can be null)
     * @param  {Boolean}  force   Whether or not to overwrite modified data
     * @return {Bluebird}         Resolved once loaded
     */
    this.loadDatabase = (product, force) => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.DB.LOAD, {
            product: product,
            force: force
          }
        )
        .then(payload => {
          IPCService.notifyOfSuccessfulRequest(
            payload,
            CONST.INFO.DB.LOAD.SUCCESS,
            CONST.NG.EVENT.DB.LOAD.SUCCESS
          );

          PubSub.publish(CONST.NG.EVENT.CONTENT.INTERNAL_CHANGE);
        })
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.DB.LOAD.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Saves the in-memory database to disk.
     *
     * @return {Bluebird} Resolved once saved
     */
    this.saveDatabase = () => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.DB.SAVE
        )
        .then(payload => {
          IPCService.notifyOfSuccessfulRequest(
            payload,
            CONST.INFO.DB.SAVE.SUCCESS,
            CONST.NG.EVENT.DB.SAVE.SUCCESS
          );
        })
        .catch(err => {
          IPCService.notifyOfFailedRequest(
            err,
            CONST.ERROR.DB.SAVE.GENERAL
          );

          return Promise.reject(err);
        });
    };

    /**
     * Retreives the database status and updates the internal knowledge of of it
     * on receipt.
     * @return {Promise} Resolved with the return of the request result
     */
    this.getDatabaseStatus = () => {
      return IPCService.sendRequest(
          CONST.IPC.REQUEST.DB.STATUS
        )
        .then(() => this.databaseStatus);
    };

    /**
     * Private Methods
     */

    /**
     * Request database status.
     */
    this.getDatabaseStatus()
      .then(() => {
        $rootScope.$apply(() => {
          $rootScope.stateInitialized = true;
        });
      })
      .catch(err => {
        console.log('Unable to retrieve database status.', err);
        Notification.error('Unable to retrieve database status.');
      });

    /**
     * Subscibe to Events
     */
    PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.DATA, (payload) => {
        this.setDatabaseStatus(payload);
      });
    PubSub.subscribe(
      CONST.NG.EVENT.CONTENT.INTERNAL_CHANGE, (payload) => {
        this.resetCache();
        PubSub.publish(CONST.NG.EVENT.CONTENT.CHANGE, payload);
      });
  };

  angular.module('app.core.services')
    .service('DataService', DataService);
}());
