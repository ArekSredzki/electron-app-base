(function() {
  'use strict';

  /**
   * @ngdoc filter
   * @name orderByValue
   * @kind function
   *
   * @description
   * Orders a specified `array` by the `expression` predicate. It is ordered alphabetically
   * for strings and numerically for numbers. Note: if you notice numbers are not being sorted
   * as expected, make sure they are actually being saved as numbers and not strings.
   * Array-like values (e.g. NodeLists, jQuery objects, TypedArrays, Strings, etc) are also supported.
   *
   * @param {Array} array        The array (or array-like object) to sort.
   * @param {Object} sortOptions An object containing the options to perform the
   *                             sort with.
   *  - {String} key             A key to be used by the comparator to
   *                             determine the order of elements.
   *  - {boolean} undefinedLast  Whether to push falsy values to the end
   *  - {boolean=} reverse       Reverse the order of the array.
   *
   * @returns {Array}           Sorted copy of the source array.
   */

  function orderByValue() {
    return function(array, sortOptions) {
      if (array === undefined || array === null) {
        return array;
      }

      let reverseFactor = sortOptions.reverse ? -1 : 1;

      let lastEvaluator;

      if (sortOptions.undefinedLast) {
        lastEvaluator = _.isNil;
      } else if (sortOptions.falsyLast) {
        lastEvaluator = val => !val;
      } else {
        lastEvaluator = () => false;
      }

      function getSortableValue(item) {
        let value = _.get(item, sortOptions.key);

        if (_.isArray(value)) {
          value = JSON.stringify(value);
        }

        let type = typeof value;

        if (type === 'string') {
          value = value.toLowerCase();
        }

        let last = lastEvaluator(value);

        return {
          value: value,
          type: type,
          // If value is undefined, then we want to suppress it to the bottom of
          // the list.
          last: last
        };
      }

      function _compare(v1, v2) {
        if (v1.type === v2.type) {
          if (v1.value !== v2.value) {
            return v1.value < v2.value ? -reverseFactor : reverseFactor;
          } else {
            return 0;
          }
        } else {
          return v1.type < v2.type ? -reverseFactor : reverseFactor;
        }
      }

      function compare(v1, v2) {
        let result = 0;
        v1 = v1.sortable;
        v2 = v2.sortable;

        if (v1.last) {
          result = v2.last ? _compare(v1, v2) : 1;
        } else if (v2.last) {
          result = -1;
        } else {
          result = _compare(v1, v2);
        }

        return result;
      }

      array = array.map(item => {
        return {
          value: item,
          sortable: getSortableValue(item)
        };
      });

      array.sort(compare);

      return array.map(item => item.value);
    };
  }

  angular.module('app.core.filters')
    .filter('orderByValue', orderByValue);
}());
