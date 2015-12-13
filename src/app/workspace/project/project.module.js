(function() {
  'use strict';

  function config($urlRouterProvider, $stateProvider) {
    $stateProvider
      .state('workspace.project', {
        url: '',
        template: '<ui-view/>',
        redirectTo: trans => {
          let DataService = trans.injector().get('DataService');
          if (DataService.isDirectorySelected()) {
            return 'workspace.project.product';
          } else {
            return {
              state: 'workspace.project.directory',
              params: {
                redirectIfSelected: true
              }
            };
          }
        }
      })
      .state('workspace.project.directory', {
        url: '/project/directory',
        templateUrl: 'app/workspace/project/directory/directory.html',
        controller: 'ProjectDirectoryController as directory'
      })
      .state('workspace.project.product', {
        url: '/project/product',
        templateUrl: 'app/workspace/project/product/product.html',
        controller: 'ProjectProductController as product',
        data: {
          permissions: {
            only: ['directorySelected'],
            redirectTo: 'workspace.project.directory'
          }
        }
      });
  }

  angular.module('app.workspace.project', [])
    .config(config);

}());
