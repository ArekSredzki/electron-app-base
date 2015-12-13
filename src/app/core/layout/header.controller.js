(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:HeaderController
   * @description
   * # HeaderController
   * Adds functionality to the header via state buttons such as load/save.
   */
  function HeaderController(
    DataService
  ) {
    /**
     * Manually reload the database from disk.
     * @param  {Boolean} force Whether the database should drop any changes.
     */
    this.reloadDatabase = function(force) {
      DataService.loadDatabase(null, force);
    };

    /**
     * Save the database to disk.
     */
    this.saveDatabase = function() {
      DataService.saveDatabase();
    };
  }

  angular.module('app.core.layout')
    .controller('HeaderController', HeaderController);

}());
