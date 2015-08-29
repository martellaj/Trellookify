(function () {
	angular
		.module('app')
		.factory('trelloFactory', trelloFactory);

	function trelloFactory($log, $http, $timeout, $q, $rootScope) {
		var trello = {}; 
 
		// Properties
		trello.isConnected = false; 
 
		// Methods
		trello.connect = connect;
		trello.connectSilently = connectSilently;
		trello.disconnect = disconnect;
		trello.checkIfConnected = checkIfConnected;
		trello.getBoards = getBoards;
		trello.getCards = getCards;
		
		/////////////////////////////////////////
		// End of exposed properties and methods.
		
		/**
		 * Connect to Trello by popping up a login
		 * screen to the user.
		 */
		function connect() {
			Trello.authorize({
        type: 'popup',
				persist: true,
        success: function () {
					trello.isConnected = Trello.authorized();
					$rootScope.$broadcast('trello:isConnected', trello.isConnected);
					$log.debug('Connected to Trello.');
				}
			});
		};
		
		/**
		 * Disconnect from Trello (clears the authentication
		 * token). 
		 */
		function disconnect() {
			Trello.deauthorize();
			trello.isConnected = Trello.authorized();
			$rootScope.$broadcast('trello:isConnected', trello.isConnected);
			$log.debug('Disconnected from Trello.');
		};

		/**
		 * Attempts to connect to Trello using cached information.
		 */
		function connectSilently() {
			Trello.authorize({
				type: 'redirect',
				interactive: false,
				persist: true,
				success: function () {
					trello.isConnected = Trello.authorized();
					$rootScope.$broadcast('trello:isConnected', trello.isConnected);
					$log.debug('Silently connected to Trello.');
				}
			});
		};

		/**
		 * Broadcasts an event to all controllers with connection status.
		 */
		function checkIfConnected(task) {
			$rootScope.$broadcast('trello:isConnected', trello.isConnected);
		};

		/**
		 * Gets all the boards (with their lists) for the connected user.
		 */
		function getBoards() {
			var deferred = $q.defer();
			var boards = [];
			var boardsCount = 0;
			var boardsGotten = 0;

			Trello.get('members/me/boards', function (res) {
				for (var i = 0; i < res.length; i++) {
					if (res[i].closed === false) {
						var board = res[i];
						boardsCount++;
						
						getLists(board)
							.then(function(boardWithLists) {
								boardsGotten++;
								boards.push(boardWithLists);
								
								if (boardsCount === boardsGotten) {
									boards = _.sortBy(boards, 'name');								
									deferred.resolve(boards);
								}
							});
					}
				}
			});

			return deferred.promise;
		};

		/**
		 * Gets all of the lists for the given board, attaches them to
		 * the board object, and returns it.
		 * 
		 * @private
		 */
		function getLists(board) {
			var deferred = $q.defer();

			Trello.get('boards/' + board.id + '/lists', function (lists) {
				board.lists = lists;
				deferred.resolve(board);
			});
			
			return deferred.promise;
		};
		
		/**
		 * Gets cards for a given list, attached them to the list
		 * object, and returns the list.
		 */
		function getCards(list) {
			var deferred = $q.defer();
			
			Trello.get('lists/' + list.id + '/cards', function (cards) {
				list.cards = cards;
				deferred.resolve(list);
			});
			
			return deferred.promise;
		};

		return trello;
	};
})();