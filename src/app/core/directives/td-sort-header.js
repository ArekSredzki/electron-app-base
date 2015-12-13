(function() {
  'use strict';

  function tdSortHeader() {
    return {
      restrict: 'A',
      replace: true,
      transclude: true,
      scope: {
        sortOptions: '=',
        key: '=',
        undefinedLast: '=',
        falsyLast: '='
      },
      templateUrl: 'app/core/directives/partials/td-sort-header.html',
      link: ($scope) => {
        // Change sorting order
        $scope.sortBy = function() {
          let sortOptions = $scope.sortOptions;

          if (sortOptions.key === $scope.key) {
            sortOptions.reverse = !sortOptions.reverse;
          }

          sortOptions.key = $scope.key;
          sortOptions.undefinedLast = !!$scope.undefinedLast;
          sortOptions.falsyLast = !!$scope.falsyLast;
        };

        // Returns the icon class that is to be applied, dependent on the
        // current sorting options
        $scope.selectedClass = function() {
          let sortOptions = $scope.sortOptions;

          if (sortOptions.key === $scope.key) {
            return 'fa-chevron-' + (sortOptions.reverse ? 'down' : 'up');
          } else {
            return 'fa-sort';
          }
        };
      }
    };
  }

  angular.module('app.core.directives')
    .directive("tdSortHeader", tdSortHeader);
}());
