'use strict';
/**
 * Utilities
 * General purpose data manipulation tools
 */

const _ = require('lodash');
// const memoize = require('memoizee');
// const memProfile = require('memoizee/profile');

const CONST = require('./constants');

const Utils = exports;

/**
 * Converts each key-value pair of an object to an array of objects.
 * @param  {Object} object Target object
 * @return {Array}         Array of key-value pair objects
 */
Utils.objectToArray = function (object) {
  return _.map(object, (value, key) => {
    return {
      key: key,
      value: value
    };
  });
};

/**
 * Aggregates an array of key-value pair objects to a single object.
 * @param  {Array}  array Array of key-value pair objects
 * @return {Object}       Object with a property for each array element
 */
Utils.arrayToObject = function (array) {
  let object = {};

  _.forEach(array, pair => {
    object[pair.key] = pair.value;
  });

  return object;
};

/**
 * Sort and object based on it's keys.
 * Since ES6 JS objects *are* in fact ordered by spec (many implementations
 * had this behaviour beforehand anyway).
 * @param  {Object} unordered The object to sort
 * @param  {Boolean} recursive (optional) Whether or not to perform the sort recursively
 * @return {Object}           The sorted object
 */
Utils.sortObject = function(unordered, recursive) {
  if (!_.isPlainObject(unordered)) {
    if (_.isArray(unordered)) {
      return Utils.sortArray(unordered, recursive);
    } else {
      return unordered;
    }
  }

  var ordered = {};

  _.forEach(Object.keys(unordered).sort(), key => {
    ordered[key] = recursive ?
      Utils.sortObject(unordered[key], recursive) :
      unordered[key];
  });

  return ordered;
};

/**
 * Recursively sort an array of elements. If they are objects then they will be
 * sorted as well.
 * @param  {Array}  unordered The array to sort
 * @param  {Boolean} recursive (optional) Whether or not to perform the sort recursively
 * @return {Array}            The sorted array
 */
Utils.sortArray = function(unordered, recursive) {
  if (!_.isArray(unordered)) {
    if (_.isPlainObject(unordered)) {
      return Utils.sortObject(unordered, recursive);
    } else {
      return unordered;
    }
  }

  return _(unordered)
    .sortBy()
    .map(element =>
      recursive ? Utils.sortArray(element, recursive) : element
    )
    .value();
};

/**
 * Performs a deep matching operation in comparing an source object to any
 * subobject of another.
 * @param  {Object}  object Object on whose subobjects the matching operation
 *                          is to be performed
 * @param  {Object}  source The object to look for
 * @return {Boolean}        Whether a match was found
 */
Utils.deepIsMatch = function(object, source) {
  if (!_.isObject(object) || !_.isObject(source)) {
    return false;
  }

  return !!_.find(object, subobject =>
    _.isMatch(subobject, source) || Utils.deepIsMatch(subobject, source)
  );
};

/**
 * Performs a deep forEach on every leaf string in the provided object.
 * @param  {Object}   elem  Object to iterate through or leaf string
 * @param  {Function} fun   A function to run on every leaf string in the object
 *                          Iteratee functions may exit iteration early by
 *                          explicitly returning `false`
 * @param  {String}   key   Optional: name of parent key
 */
Utils.deepForEachString = function(object, fun, key) {
  let shouldEarlyExit;

  if (!_.isFunction(fun)) {
    return shouldEarlyExit;
  }

  if (!_.isPlainObject(object)) {
    if (_.isString(object)) {
      shouldEarlyExit = fun(object, key);
    }
  } else {
    _.forEach(object, (subObject, subKey) => {
      shouldEarlyExit = Utils.deepForEachString(subObject, fun, subKey);
      return shouldEarlyExit;
    });
  }

  return shouldEarlyExit;
};

/**
 * Performs a deep forEach on every leaf string in the provided object.
 * @param  {Object}   elem  Object to iterate through or leaf string
 * @param  {String}   key   Name of the key to search for
 * @param  {Function} fun   A function to run on every matching child
 *                          Iteratee functions may exit iteration early by
 *                          explicitly returning `false`
 */
Utils.deepForEachWithKey = function(object, key, fun) {
  let shouldEarlyExit;

  if (!_.isFunction(fun) || !_.isPlainObject(object)) {
    return shouldEarlyExit;
  }

  if (_.has(object, key)) {
    shouldEarlyExit = fun(object);
  } else {
    _.forEach(object, subObject => {
      shouldEarlyExit = Utils.deepForEachWithKey(subObject, key, fun);
      return shouldEarlyExit;
    });
  }

  return shouldEarlyExit;
};

/**
 * DB Helpers
 */

/**
 * A helper function that retrieves the grouping key given collection info.
 * @param  {String} collectionInfo Collection info object
 * @return {String}                Grouping key for the collection
 */
Utils.groupingKeyForCollection = function(collectionInfo) {
  if (_.isString(collectionInfo.GROUPING_KEY)) {
    return collectionInfo.GROUPING_KEY;
  } else {
    return CONST.DB.FIELDS.DEFAULT.GROUPING_KEY;
  }
};

/**
 * A helper function that retrieves the collection name given collection info.
 * @param  {Object|String} collectionInfo Collection info object or name
 * @return {String}                       Name of the collection
 */
Utils.collectionName = function(collectionInfo) {
  switch (typeof collectionInfo) {
    case 'string':
      return collectionInfo;
    case 'object':
      switch (typeof collectionInfo.COLLECTION) {
        case 'string':
          return collectionInfo.COLLECTION;
        case 'object':
          if (_.isArray(collectionInfo.COLLECTION)) {
            return collectionInfo.COLLECTION.join(CONST.DB.COLLECTION.SEPARATOR);
          }
      }
  }
};

/**
 * A helper function that abstracts getting a collection name from a collection
 * info object and grouping name.
 * @param  {Object|String} collectionInfo Collection info object or name
 * @param  {String}        groupingName   Name of the grouping
 * @return {String}                       Name of the collection
 */
Utils.collectionNameForGrouping = function(collectionInfo, groupingName) {
  let collectionName = Utils.collectionName(collectionInfo);

  if (!collectionName) {
    return;
  }

  return collectionName.split('$').join(groupingName);
};

/**
 * A helper function that retrieves the collection name given collection info.
 * @param  {Object|String} collectionInfo Collection info object or name
 * @return {String}                       Name of the collection
 */
Utils.pathName = function(collectionInfo) {
  switch (typeof collectionInfo) {
    case 'string':
      return collectionInfo;
    case 'object':
      switch (typeof collectionInfo.PATH) {
        case 'string':
          return collectionInfo.PATH;
        case 'object':
          if (_.isArray(collectionInfo.PATH)) {
            return collectionInfo.PATH.join(CONST.DB.COLLECTION.SEPARATOR);
          }
      }
  }
};

/**
 * A helper function that retrieves the collection RegExp given collection info.
 * @param  {Object|String} collectionInfo Collection info object or name
 * @return {String}                       RegExp string for a collection that
 *                                        can be used to identify it's grouping
 */
Utils.pathRegExp = function(collectionInfo) {
  let pathName = Utils.pathName(collectionInfo);

  if (!pathName) {
    return;
  }

  return _.map(pathName.split('$'), _.escapeRegExp)
    .join(CONST.DB.COLLECTION.GROUPING_REGEXP);
};

/**
 * A helper function that abstracts getting a path name from a collection info
 * object and grouping name.
 * @param  {Object|String} collectionInfo Collection info object or name
 * @param  {String}        groupingName   Name of the grouping
 * @return {String}                       Path for file
 */
Utils.pathForGrouping = function(collectionInfo, groupingName) {
  let pathName = Utils.pathName(collectionInfo);

  if (!pathName) {
    return;
  }

  return pathName.split('$').join(groupingName);
};

/**
 * A helper that generates all expected multi-file collection names.
 * @return {Array}       Array of collection name strings
 */
Utils.generateMultiFileCollectionNames = function() {
  let multiFileCollectionNames = [];

  Utils.deepForEachWithKey(
    CONST.DB.COLLECTION.MULTIFILE,
    'COLLECTION', collectionInfo => {
      let collectionName = Utils.collectionName(collectionInfo);

      if (!collectionName) {
        return;
      }

      multiFileCollectionNames.push(collectionName);
    });

  // Ensure that all elements are truthy and unique
  return _(multiFileCollectionNames)
    .compact()
    .uniq()
    .value();
};

/**
 * A helper that generates all expected single file collection names, given a
 * set of grouping names.
 * @param  {Array} groupings Array of grouping names
 * @return {Array}           Array of collection name strings
 */
Utils.generateSingleFileCollectionNames = function(groupings) {
  let singleFileCollectionNames = [];

  Utils.deepForEachWithKey(
    CONST.DB.COLLECTION.SINGLEFILE,
    'COLLECTION', collectionInfo => {
      for (var i = 0; i < groupings.length; i++) {
        let groupingName = groupings[i];

        singleFileCollectionNames.push(
          Utils.collectionNameForGrouping(
            collectionInfo,
            groupingName
          )
        );
      }
    });

  // Ensure that all elements are truthy and unique
  return _(singleFileCollectionNames)
    .compact()
    .uniq()
    .value();
};

/**
 * A helper that generates all expected computed collection names.
 * @return {Array}       Array of collection name strings
 */
Utils.generateComputedCollectionNames = function() {
  let computedCollectionNames = [];

  Utils.deepForEachWithKey(
    CONST.DB.COLLECTION.COMPUTED,
    'COLLECTION', collectionInfo => {
      computedCollectionNames.push(Utils.collectionName(collectionInfo));
    });

  return _.uniq(computedCollectionNames);
};

Utils.showMemoizeStats = function() {
  // console.log(memProfile.log());
};
