(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:FooterController
   * @description
   * # FooterController
   * Adds functionality to the footer.
   *  - Shows database status message
   *  - Shows selected product name
   *    - With link to return to workspace view
   */
  function FooterController(
    $scope, $location, PubSub, CONST, DataService
  ) {
    this.loadingStatusText = '';
    this.selectedDirectory = '';
    this.selectedProduct = '';

    // Watch for changes to database status.
    let uid1 = PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.TEXT,
      (payload) => {
        let newLoadingStatusText = _.get(payload, 'message');
        if (_.isString(newLoadingStatusText)) {
          this.loadingStatusText = newLoadingStatusText;
        }
      }
    );

    // Watch for changes to database status.
    let uid2 = PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.STATE,
      () => {
        this.loadingStatusText = '';
        this.selectedDirectory = DataService.databaseStatus.projectDirectory;
        this.selectedProduct = DataService.databaseStatus.selectedProduct;
      }
    );

    $scope.$on('$destroy', function () {
      PubSub.unsubscribe(uid1);
      PubSub.unsubscribe(uid2);
    });
  }

  angular.module('app.core.layout')
    .controller('FooterController', FooterController);

}());
