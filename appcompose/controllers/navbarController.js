(function () {
	angular
		.module('app')
		.controller('NavbarController', NavbarController);

	/**
	 * The NavbarController code.
	 */
	NavbarController.$inject = ['$log', '$timeout', '$scope', 'trelloFactory'];
	function NavbarController($log, $timeout, $scope, trello) {
		var vm = this;
		
		// Properties
		vm.isCollapsed;
		vm.isConnected;		
		
		// Methods
		vm.connect = connect;
		vm.disconnect = disconnect;
		
		/////////////////////////////////////////
		// End of exposed properties and methods.
		
		/**
		 * This function does any initialization work the 
		 * controller needs.
		 */
		(function activate() {
			$log.debug('Activated NavbarController.');
			vm.isCollapsed = true;

			// Try to connect with stored data (wait for page to load, 
			// or listener won't update UI).
			angular.element(document).ready(function () {
				Office.initialize = function () {
      		$log.debug('Activated Office.js.');
    		};
				
        trello.connectSilently();
			});
		})();
		
		/**
		 * Connect to Trello.
		 */
		function connect() {
			trello.connect();
		};
		
		/**
		 * Disconnect from Trello.
		 */
		function disconnect() {
			trello.disconnect();
		};

		/**
		 * Listens for changes in isConnected so app knows if user
		 * is connected or not.
		 */
		$scope.$on('trello:isConnected', function (event, data) {
			if (data) {
				$timeout(function () {
					vm.isConnected = true;
				}, 10);
			}
			else {
				vm.isConnected = false;
			}
		});
	};
})();
