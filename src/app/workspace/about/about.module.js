(function() {
  'use strict';

  function config($stateProvider) {
    $stateProvider
      .state('workspace.about', {
        url: '/about',
        templateUrl: 'app/workspace/about/about.html',
        controller: 'AboutController as vm'
      });
  }

  angular.module('app.workspace.about', [])
    .config(config);
}());
