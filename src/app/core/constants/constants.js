(function() {
  'use strict';

  /**
   * Application-wide constants originally defined in lib/CONST.js
   *
   * Loaded in as an angular constant to avoid redundant reloading.
   */
  angular.module('app.core.constants', [])
    .constant('CONST', require('./lib/common/constants'));
})();
