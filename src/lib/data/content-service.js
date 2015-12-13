'use strict';
/**
 * Content Service
 * This module handles all content query operations built on top of the
 * Data Service.
 */

const _ = require('lodash');

const ContentService = function() {};

module.exports = new ContentService();

const CONST = require('../common/constants');
// const Utils = require('../common/utils');
const DataService = require('./data-service');

const DatabaseError = require('../common/errors/database-error');

/**
 * Performs a compound action the LokiJS database with an action type.
 *
 * The available action types are:
 *  - CONST.DB.COMPOUND.*
 *
 * For more information on these action types see the methods that implement
 * them as shown below.
 *
 * @param  {String}        type    Compound action that should be performed
 * @param  {Object}        options Options for given action
 * @return {Array|Object}          Result of the action
 * @throws {DatabaseError}         Thrown on invalid arguments
 */
ContentService.prototype.compound = function(type, options) {
  if (!_.isObject(options)) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.COMPOUND.OPTIONS.INVALID
    );
  }

  switch (type) {
    default:
      throw new DatabaseError(
        CONST.ERROR.CONTENT.COMPOUND.TYPE.INVALID
      );
  }
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
 * @param  {String}        collectionName Target collection name
 * @param  {String}        type           Query type to be performed
 * @param  {Object}        options        The input parameter for said query
 * @return {Array|Object}                 Result of the query
 * @throws {DatabaseError}                Thrown on invalid arguments
 */
ContentService.prototype.query = function(collectionName, type, options) {
  if (!_.isObject(options)) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.QUERY.QUERY.INVALID
    );
  }

  if (!_.isString(collectionName)) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.QUERY.COLLECTION.INVALID
    );
  }

  let collection = DataService.getCollection(collectionName);

  if (!collection) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.QUERY.COLLECTION.NONEXISTENT
    );
  }

  switch (type) {
    case CONST.DB.QUERY.GET:
      if (!_.has(options, 'id')) {
        throw new DatabaseError(
          CONST.ERROR.CONTENT.QUERY.QUERY.INVALID
        );
      }

      return collection.get(options.id);
    case CONST.DB.QUERY.BY:
      if (!_.has(options, 'field') || !_.has(options, 'value')) {
        throw new DatabaseError(
          CONST.ERROR.CONTENT.QUERY.QUERY.INVALID
        );
      }

      return collection.by(options.field, options.value);
    case CONST.DB.QUERY.FIND:
      return collection.find(options);
    case CONST.DB.QUERY.FIND_OBJECT:
      return collection.findObject(options);
    case CONST.DB.QUERY.FIND_OBJECTS:
      return collection.findObjects(options);
    case CONST.DB.QUERY.FIND_ONE:
      return collection.findOne(options);
    default:
      throw new DatabaseError(
        CONST.ERROR.CONTENT.QUERY.TYPE.INVALID
      );
  }
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
 * @param  {String}  collection Name of the collection to run the actions for
 * @param  {Array}   actions    Set of actions to be performed on the result set
 * @return {Array|Object}       Results of the evaluated actions
 * @throws {DatabaseError}      Thrown on invalid arguments
 */
ContentService.prototype.runResultSetActions = function(collection, actions) {
  if (!_.isArray(actions)) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.RESULT_SET.ACTIONS.INVALID
    );
  }

  if (!_.isString(collection)) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.RESULT_SET.COLLECTION.INVALID
    );
  }

  let resultSet = DataService.getResultSet(collection);

  if (!resultSet) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.RESULT_SET.COLLECTION.NONEXISTENT,
      collection
    );
  }

  for (let action of actions) {
    if (!_.isArray(action.args)) {
      throw new DatabaseError(
        CONST.ERROR.CONTENT.RESULT_SET.ARGS.INVALID
      );
    }

    switch (action.type) {
      case CONST.DB.RESULT_SET.FIND:
      case CONST.DB.RESULT_SET.SIMPLE_SORT:
      case CONST.DB.RESULT_SET.COMPOUND_SORT:
      case CONST.DB.RESULT_SET.LIMIT:
      case CONST.DB.RESULT_SET.OFFSET:
        resultSet = resultSet[action.type](...action.args);
        break;
      case CONST.DB.RESULT_SET.REMOVE:
        resultSet = resultSet[action.type](...action.args);
        // TODO: Run content-aware computations if the following criteria are met:
        //  - This is a product collection
        //    - Not Schema
        //    - Not a Warning
        //  - This operation is not part of a computation
        break;
      case CONST.DB.RESULT_SET.WHERE:
      case CONST.DB.RESULT_SET.SORT:
      case CONST.DB.RESULT_SET.UPDATE:
        throw new DatabaseError(
          CONST.ERROR.CONTENT.RESULT_SET.TYPE.UNSUPPORTED
        );
      default:
        throw new DatabaseError(
          CONST.ERROR.CONTENT.RESULT_SET.TYPE.INVALID
        );
    }
  }

  return resultSet.data();
};

/**
 * Insert the provided document(s) to a given collection.
 * @param  {String}        collectionName Name of the target collection
 * @param  {Array|Object}  data           An array of documents to insert or the
 *                                        single document
 * @return {Array|Object}                 Inserted document(s)
 * @throws {DatabaseError}                Thrown on invalid arguments
 */
ContentService.prototype.insert = function(collectionName, data) {
  if (!(_.isArray(data) || _.isObject(data))) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.INSERT.DATA.INVALID
    );
  }

  let collection = DataService.getCollection(collectionName);

  if (!collection) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.INSERT.COLLECTION.NONEXISTENT,
      collectionName
    );
  }

  return collection.insert(data);

  // TODO: Run content-aware computations if the following criteria are met:
  //  - This is a product collection
  //    - Not Schema
  //    - Not a Warning
  //  - This operation is not part of a computation
};

/**
 * Update the provided document(s) to a given collection.
 * @param  {String}        collectionName Name of the target collection
 * @param  {Array|Object}  data           An array of documents to update or the
 *                                        single document
 * @return {Array|Object}                 Updated document(s)
 * @throws {DatabaseError}                Thrown on invalid arguments
 */
ContentService.prototype.update = function(collectionName, data) {
  if (!(_.isArray(data) || _.isObject(data))) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.UPDATE.DATA.INVALID
    );
  }

  let collection = DataService.getCollection(collectionName);

  if (!collection) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.UPDATE.COLLECTION.NONEXISTENT,
      collectionName
    );
  }

  collection.update(data);

  // TODO: Run content-aware computations if the following criteria are met:
  //  - This is a product collection
  //    - Not Schema
  //    - Not a Warning
  //  - This operation is not part of a computation
};

/**
 * Remove all documents matching the provided query.
 * @param  {String}        collectionName Name of the target collection
 * @param  {Object}        filter         A LokiJS filter object like for find()
 * @return {Array|Object}                 Removed document(s)
 * @throws {DatabaseError}                Thrown on invalid arguments
 */
ContentService.prototype.remove = function(collectionName, filter) {
  if (!(_.isObject(filter))) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.REMOVE.FILTER.INVALID
    );
  }

  let collection = DataService.getCollection(collectionName);

  if (!collection) {
    throw new DatabaseError(
      CONST.ERROR.CONTENT.REMOVE.COLLECTION.NONEXISTENT,
      collectionName
    );
  }

  return collection.removeWhere(filter);

  // TODO: Run content-aware computations if the following criteria are met:
  //  - This is a product collection
  //    - Not Schema
  //    - Not a Warning
  //  - This operation is not part of a computation
};

/**
 * Private Methods
 */
