(function() {
  'use strict';

  function config($stateProvider) {
    $stateProvider
      .state('product.main', {
        url: '/main',
        template: '<ui-view/>',
        redirectTo: 'product.main.table'
      })
      .state('product.main.table', {
        url: '/table',
        templateUrl: 'app/product/main/table/main-table.html',
        controller: 'MainTableController as vm'
      });
  }

  angular.module('app.product.main', [])
    .config(config);
}());
