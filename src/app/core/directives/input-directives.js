/**
 * Applies css classes to form groups based on the statuses of their children.
 */
(function() {
  'use strict';

  var FormGroupController,
    __bind = function(fn, me) {
      return function() {
        return fn.apply(me, arguments);
      };
    };

  FormGroupController = (function() {
    function FormGroupController($scope, $timeout) {
      var self = this;
      var unref;
      self.$scope = $scope;
      self.$timeout = $timeout;
      self.update = __bind(self.update, self);
      self.status = null;
      self.disabled = false;
      self.input = null;
      unref = self.$scope.$watch(self.update);
      self.$scope.$on("$destroy", unref);
    }

    FormGroupController.prototype.update = function() {
      var self = this;
      self.status = null;

      if (!self.input) {
        return;
      }

      self.status = self.input.$valid ? "success" : "error";

      // self.$timeout(function() {
      //   return self.$scope.$digest();
      // }, 0);
    };

    FormGroupController.prototype.setInput = function(ctrl) {
      var self = this;
      self.input = ctrl;
    };

    return FormGroupController;

  })();

  function formGroup() {
    return {
      restrict: "C",
      require: "formGroup",
      controller: 'FormGroupController',
      link: function(scope, el, attrs, ctrl) {
        var dereg;
        dereg = scope.$watch((function() {
          return ctrl.status;
        }), function(status) {
          el.removeClass("has-error has-success");
          if (status) {
            return el.addClass("has-" + status);
          }
        });
        return scope.$on('$destroy', dereg);
      }
    };
  }

  function formControl() {
    return {
      restrict: "C",
      require: ["?ngModel", "?^formGroup"],
      link: function(scope, element, attrs, ctrls) {
        var formGroupCtrl, ngModelCtrl;
        ngModelCtrl = ctrls[0];
        formGroupCtrl = ctrls[1];

        if (!formGroupCtrl || formGroupCtrl.disabled) {
          return;
        }

        if (ngModelCtrl && formGroupCtrl) {
          return formGroupCtrl.setInput(ngModelCtrl);
        }
      }
    };
  }

  angular.module('app.core.directives')
    .controller('FormGroupController', FormGroupController)
    .directive("formGroup", formGroup)
    .directive("formControl", formControl);

})();
