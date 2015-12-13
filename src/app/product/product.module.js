(function() {
  'use strict';

  function config($stateProvider) {
    $stateProvider
      .state('product', {
        url: '/product',
        parent: 'app',
        redirectTo: 'product.main',
        data: {
          permissions: {
            only: ['productSelected'],
            redirectTo: 'workspace.project'
          }
        },
        views: {
          'contentLayout@': {
            templateUrl: 'app/product/product.html'
          },
          'loader@': {
            templateUrl: 'app/core/layout/partials/loader.html',
            controller: 'LoaderController as loader',
          },
          'header@': {
            templateUrl: 'app/core/layout/partials/header-product.html',
            controller: 'HeaderController as header'
          }
        }
      });
  }

  angular.module('app.product', [
      'app.product.main'
    ])
    .config(config);

}());
