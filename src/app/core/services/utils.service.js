(function() {
  'use strict';

  /**
   * A Service which makes the project-common utilities available throughout
   * the angular application.
   */
  let Utils = function() {
    return require('./lib/common/utils');
  };

  angular.module('app.core.services')
    .factory('Utils', Utils);

}());
