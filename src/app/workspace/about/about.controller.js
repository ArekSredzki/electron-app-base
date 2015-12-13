(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:AboutController
   * @description
   * # AboutController
   * Displays general application information such as:
   *  1) Application version
   *  2) Available updates
   *     - Restart & install available update
   *     - See last update check time
   *     - Manually check for updates
   *     - Select release channel
   *  3) TODO: Change notes
   *  4) TODO: Supported schema versions
   */
  function AboutController(
    $scope, PubSub, CONST, AppService
  ) {
    this.availableChannels = CONST.APP.UPDATE.CHANNELS;
    this.isDebug = CONST.APP.DEBUG;
    this.updateStatus = null;

    let handleUpdateStatus = updateStatus => {
      this.updateStatus = updateStatus;
    };
    handleUpdateStatus(AppService.updateStatus);

    // Watch for changes to update state.
    let uid1 = PubSub.subscribe(
      CONST.NG.EVENT.APP.UPDATE.STATUS, (payload) =>
      $scope.$apply(() => {
        handleUpdateStatus(payload);
      })
    );

    /**
     * Select a release channel for the next boot.
     * @param  {String} channel Target release channel
     */
    this.selectChannel = channel => {
      AppService.selectChannel(channel);
    };

    /**
     * Check for updates.
     */
    this.checkForUpdates = () => {
      AppService.checkForUpdates();
    };

    /**
     * Restart the app and install the available update
     */
    this.installUpdate = () => {
      AppService.installUpdate();
    };

    $scope.$on('$destroy', () => {
      PubSub.unsubscribe(uid1);
    });
  }

  angular.module('app.workspace.about')
    .controller('AboutController', AboutController);
}());
