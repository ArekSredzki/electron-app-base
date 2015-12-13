(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:ProjectProductController
   * @description
   * # ProjectProductController
   * Allows the user to select a product from those available in the selected
   * project directory.
   */
  function ProjectProductController(
    $scope, $state, PubSub, CONST, DataService
  ) {
    this.availableNames = [];

    let updateAvailableName = () => {
      this.availableNames = _.filter(
        DataService.getAvailableProducts(),
        name => name !== this.selected
      );
    };

    let handleStateChange = () => {
      $scope.$apply(() => {
        this.selected = DataService.databaseStatus.selectedProduct;

        if (this.selected !== null) {
          $state.go('product');
        } else {
          updateAvailableName();
        }
      });
    };

    // Watch for the data directory being selected.
    let uid1 = PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.STATE,
      () => handleStateChange()
    );

    // Initialize selected value
    this.selected = DataService.databaseStatus.selectedProduct;
    updateAvailableName();

    this.select = productName => DataService.loadDatabase(productName, true);
    this.unload = () => DataService.unloadDatabase(true);

    $scope.$on('$destroy', () => {
      PubSub.unsubscribe(uid1);
    });
  }

  angular.module('app.workspace.project')
    .controller('ProjectProductController', ProjectProductController);
}());
