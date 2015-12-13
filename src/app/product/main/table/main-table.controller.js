(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name app.controller:MainTableController
   * @description
   * # MainTableController
   * The main view, in which users can browse the data in a tabular form.
   */
  let MainTableController = function(
    $scope, $localStorage, PubSub, CONST, DataService, Notification //, $uibModal
  ) {
    // Persistent setting storage
    this.$storage = $localStorage;

    // Temporary copy of data
    this.data = [];

    // Search object, this is used for filtering the data array before
    // showing data in the table. Properties of this object correlate to
    // the properties of a datum object. The '$' property will match to any of the
    // datum properties.
    this.search = {};

    this.currentPage = 1;

    if (!this.$storage.pageSize) {
      this.$storage.pageSize = 15;
    }

    this.sortOptions = {
      key: 'name',
      reverse: false,
      undefinedLast: true,
      falsyLast: true
    };

    // Called when the content of the database has changed, and thus when the
    // knowledge of available data should be updated
    this.updateData = () => {
      DataService.query(
          CONST.DB.QUERY.FIND,
          CONST.DB.COLLECTION.EXAMPLE, {}
        )
        .then(payload => {
          let data = payload || [];

          $scope.$apply(() => {
            this.currentPage = 1;
            this.data = data;
          });
        })
        .catch(payload => {
          console.log(
            'An error occurred when retrieving data.',
            payload
          );

          Notification.error(
            _.get(payload, 'message') ||
            'An error occurred when retrieving data.'
          );
        });
    };

    // Watch for changes to database content and update data accordingly.
    let uid1 = PubSub.subscribe(
      CONST.NG.EVENT.CONTENT.CHANGE,
      () => this.updateData()
    );
    this.updateData();

    $scope.$on('$destroy', function() {
      PubSub.unsubscribe(uid1);
    });

  };

  angular.module('app.product.main')
    .controller('MainTableController', MainTableController);
}());
