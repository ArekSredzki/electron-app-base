(function() {
  'use strict';

  angular.module('app.core', [
    'app.core.constants',
    // Must be loaded before any custom modules
    'app.core.dependencies',
    'app.core.filters',
    'app.core.directives',
    'app.core.layout',
    'app.core.services',
    'app.core.auth'
  ]);
}());
