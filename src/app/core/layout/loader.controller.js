(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:LoaderController
   * @description
   * # LoaderController
   * Controls app-wide features like the load/save buttons in the navbar
   */
  function LoaderController(
    $scope, $location, PubSub, CONST, DataService
  ) {

    this.loadingStatusText = '';
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

    // Whether a spinner should be active on the page, preventing the user
    // from accessing the content.
    //  - This is tied to whether the database is loading / saving
    this.spinnerActive = true;
    var updateHandler = () => {
      this.spinnerActive = DataService.isBusy();
      this.loadingStatusText = '';
    };

    // Watch for changes to database status.
    let uid2 = PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.STATE,
      updateHandler
    );
    updateHandler();

    $scope.$on('$destroy', function () {
      PubSub.unsubscribe(uid1);
      PubSub.unsubscribe(uid2);
    });
  }

  angular.module('app.core.layout')
    .controller('LoaderController', LoaderController);

}());
