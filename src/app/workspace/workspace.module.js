(function() {
  'use strict';

  function config($urlRouterProvider, $stateProvider) {

    $stateProvider
      .state('workspace', {
        url: '',
        abstract: true,
        parent: 'app',
        views: {
          'contentLayout@': {
            templateUrl: 'app/workspace/workspace.html',
            controller: 'WorkspaceController as workspace'
          },
          // 'loader@': false,
          // 'header@': false
        }
      });
  }

  angular.module('app.workspace', [
    'app.workspace.project',
    'app.workspace.about',
    'app.workspace.help'
  ])
  .config(config);

}());
