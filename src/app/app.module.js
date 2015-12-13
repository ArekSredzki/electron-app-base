(function() {
  'use strict';

  /**
   * @ngdoc overview
   * @name Electron App Base
   * @description A base project for creating interactive desktop application with Electron.
   *
   * Root module of the application.
   */
  function config(
    $compileProvider, $urlRouterProvider, $stateProvider, NotificationProvider
  ) {
    $stateProvider
      .state('app', {
        url: '/',
        abstract: true,
        views: {
          footer: {
            templateUrl: 'app/core/layout/partials/footer.html',
            controller: 'FooterController',
            controllerAs: 'footer'
          }
        }
      });

    // For any unmatched url, redirect to workspace
    $urlRouterProvider.otherwise($injector => {
      let $state = $injector.get('$state');
      $state.go('workspace.project');
    });

    NotificationProvider.setOptions({
      positionX: 'left',
      positionY: 'bottom'
    });

    // Disable debug info for significant performance boost
    $compileProvider.debugInfoEnabled(false);
  }

  function configureThemes(editableOptions, editableThemes) {
    // Use Bootstrap 3 styling for angular-xeditable & customize it
    editableThemes.bs3.inputClass = 'input-sm';
    editableThemes.bs3.buttonsClass = 'btn-sm';
    editableThemes.bs3.controlsTpl = '<div class="editable-controls"></div>';
    editableOptions.theme = 'bs3';
    editableOptions.icon_set = 'font-awesome'; // jscs:ignore requireCamelCaseOrUpperCaseIdentifiers
  }

  angular
    .module('app', [
      'app.core',
      'app.workspace',
      'app.product'
    ])
    .config(config)
    .run(configureThemes);
})();
