(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:ProjectDirectoryController
   * @description
   * # ProjectDirectoryController
   * Allows the user to select a project directory.
   */
  function ProjectDirectoryController(
    $scope, $state, $stateParams, PubSub, CONST, DataService
  ) {
    const remote = require('electron').remote;
    const dialog = remote.dialog;

    let updateSelected = () => {
      this.selected = DataService.databaseStatus.projectDirectory;
    };

    let handleStateChange = () => {
      updateSelected();

      if (this.selected !== null) {
        $state.go('workspace.project.product');
      }
    };

    // Watch for the data directory being selected.
    let uid1 = PubSub.subscribe(
      CONST.NG.EVENT.DB.STATUS.STATE,
      () => $scope.$apply(() => {
        handleStateChange();
      })
    );

    // Initialize selected value
    if ($stateParams.redirectIfSelected === true) {
      handleStateChange();
    } else {
      updateSelected();
    }

    // Allow the user to select a project directory
    this.select = () => {
      dialog.showOpenDialog(
        remote.getCurrentWindow(), {
          properties: ['openDirectory']
        }, fileNames => {
          if (!fileNames || !fileNames.length) {
            return;
          }

          let directory = fileNames[0];

          DataService.selectProjectDirectory(directory);
        });
    };

    $scope.$on('$destroy', () => {
      PubSub.unsubscribe(uid1);
    });
  }

  angular.module('app.workspace.project')
    .controller('ProjectDirectoryController', ProjectDirectoryController);
}());
