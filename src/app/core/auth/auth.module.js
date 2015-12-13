(function() {
  'use strict';

  function configurePermissions(PermPermissionStore, DataService) {
    PermPermissionStore
      .definePermission('directorySelected', DataService.isDirectorySelected);

    PermPermissionStore
      .definePermission('productSelected', DataService.isProductSelected);
  }

  angular.module('app.core.auth', [])
    .run(configurePermissions);
}());
