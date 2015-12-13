(function() {
  'use strict';

  function config($stateProvider) {
    $stateProvider
      .state('workspace.help', {
        url: '/help',
        templateUrl: 'app/workspace/help/help.html'
      });
  }

  angular.module('app.workspace.help', [])
    .config(config);
}());
