(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:WorkspaceController
   * @description
   * # WorkspaceController
   * General purpose controller for the workspace view
   */
  function WorkspaceController(
    $scope, $state, PubSub, CONST, DataService
  ) {
    this.$state = $state;

    let updateData = () => {
      this.directorySelected = DataService.isDirectorySelected();
      this.productSelected = DataService.isProductSelected();
    };
    updateData();

    let handleStateChange = () => {
      $scope.$apply(() => {
        updateData();
      });
    };

    // Watch for database state changes
    let sub = PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.STATE,
      () => handleStateChange()
    );

    $scope.$on('$destroy', function() {
      PubSub.unsubscribe(sub);
    });
  }

  angular.module('app.workspace')
    .controller('WorkspaceController', WorkspaceController);
}());
