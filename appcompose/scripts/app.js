(function () {
  angular
    .module('app', [
      'ngRoute',
      'ui.bootstrap'
    ])
    .config(config);

  function config($routeProvider) {
    // Configure the routes. 
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainController',
        controllerAs: 'main'
      })
      .otherwise({
        redirectTo: '/'
      });
  };
})();

