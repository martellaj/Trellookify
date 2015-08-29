(function () {
  angular
    .module('app')
    .controller('MainController', MainController);

  /**
   * The MainController code.
   */
  MainController.$inject = ['$log', '$scope', '$timeout', '$q', 'trelloFactory'];

  function MainController($log, $scope, $timeout, $q, trello) {
    var vm = this;

    // Properties
    vm.isConnected;
    vm.trelloBoards;
    vm.error;

    // Methods
    vm.buildReport = buildReport;
    vm.listChecked = listChecked;

    /////////////////////////////////////////
    // End of exposed properties and methods.

    // Private members
    var includedLists = []; // Lists to build report from.
    var inclusion = 0; // An indexer to sort includedLists by (FIFO).

    /**
     * This function does any initialization work the 
     * controller needs.
     */
    (function activate() {
      $log.debug('Activated MainController.');

      angular.element(document).ready(function () {
        trello.checkIfConnected();
      });
    })();

    /**
     * Gets open Trello boards for connected user.
     */
    function getTrelloBoards() {
      trello.getBoards()
        .then(function (boards) {
          _.map(boards, function(board) {
            board.isOpen = false; 
          });
          
          vm.trelloBoards = boards;
        });
    };

    /**
     * Build report from included lists.
     */
    function buildReport() {
      if (includedLists.length === 0) {
        vm.error = 'You have to pick at least 1 list.';
      } else {
        vm.error = null;
      }
      
      // Close all accordion groups. 
      _.map(vm.trelloBoards, function(board) {
        board.isOpen = false;
      });

      getCards()
        .then(function (lists) {
          var data = formatData(lists);

          var item = Office.context.mailbox.item;
          item.body.getTypeAsync(
            function (result) {
              if (result.status == Office.AsyncResultStatus.Failed) {
                vm.error = 'Unable to write report to email body.';
              } else {
                // Successfully got the type of item body.
                // Prepend data of the appropriate type in body.
                if (result.value == Office.MailboxEnums.BodyType.Html) {
                  // Body is of HTML type.
                  // Specify HTML in the coercionType parameter
                  // of prependAsync.
                  $log.debug('HTML type email detected.');
                  var htmlBodyContent = getHtmlBodyContent(data);
                  item.body.prependAsync(
                    htmlBodyContent, {
                      coercionType: Office.CoercionType.Html,
                      asyncContext: {
                        var3: 1,
                        var4: 2
                      }
                    },
                    function (asyncResult) {
                      if (asyncResult.status ==
                        Office.AsyncResultStatus.Failed) {
                        vm.error = asyncResult.error.message;
                      } else {
                        // Successfully prepended data in item body.
                        // Do whatever appropriate for your scenario,
                        // using the arguments var3 and var4 as applicable.
                      }
                    });
                } else {
                  // Body is of text type. 
                  $log.debug('Text type email detected.');                  
                  var textBodyContent = getTextBodyContent(data);
                  item.body.prependAsync(
                    textBodyContent, {
                      coercionType: Office.CoercionType.Text,
                      asyncContext: {
                        var3: 1,
                        var4: 2
                      }
                    },
                    function (asyncResult) {
                      if (asyncResult.status ==
                        Office.AsyncResultStatus.Failed) {
                        vm.error = asyncResult.error.message;
                      } else {
                        // Successfully prepended data in item body.
                        // Do whatever appropriate for your scenario,
                        // using the arguments var3 and var4 as applicable.
                      }
                    });
                }
              }
            });
        });
    };
    
    /**
     * Builds out our report in HTML so it's nice and styled.
     */
    function getHtmlBodyContent(data) {
      var htmlBodyContent = '';
      
      _.forEach(data.boards, function(board) {
        htmlBodyContent += '<strong>' + board.name + '</strong><br />';
        
        _.forEach(board.lists, function(list) {
          htmlBodyContent += '<em>' + list.name + '</em>';
          
          if (list.cards.length > 0) {
            htmlBodyContent += '<ul>';
          }
          
          _.forEach(list.cards, function(card) {
            htmlBodyContent += '<li>';
            
            _.forEach(card.labels, function(label) {
              htmlBodyContent += '[' + label.name + '] ';
            });
            
            htmlBodyContent += card.name + '</li>';            
          });
          
          if (list.cards.length > 0) {
            htmlBodyContent += '</ul>';
          }
        });
      });
      
      return htmlBodyContent;
    };
    
    /**
     * Builds out our report in boring plaintext. 
     */
    function getTextBodyContent(data) {
      var textBodyContent = '';
      
      _.forEach(data.boards, function(board) {
        textBodyContent += board.name + '\n';
        
        _.forEach(board.lists, function(list) {
          textBodyContent += '  * ' + list.name + '\n';
          
          _.forEach(list.cards, function(card) {
            textBodyContent += '    - ' + card.name + '\n';            
          });
        });
      });
      
      return textBodyContent;
    };

    /**
     * This function gets the cards for all of the lists the user wants to include in the report. 
     * When this function completes, the object returned will be an array of list objects with 
     * a "cards" property with card information and a "board" property with the name of the 
     * list's parent board.
     */
    function getCards() {
      var deferred = $q.defer();
      var lists = [];
      var listsGotten = 0;

      _.forEach(includedLists, function (list) {
        trello.getCards(list)
          .then(function (list) {
            listsGotten++;

            // Add a "list" property to make clearer the name of the list.
            list.list = list.name;
            lists.push(list);

            // Once we get cards for all lists, return.
            if (listsGotten === includedLists.length) {
              // Sort lists by order they were checked.
              lists = _.sortBy(lists, 'rank');
              deferred.resolve(lists);
            }
          });
      });

      return deferred.promise;
    };

    /**
     * Add or remove lists from the list of lists that the report
     * will be built from.
     */
    function listChecked(board, list) {
      // User interacting with app, clear messages.
      vm.error = null;

      // Add board name to list object so we don't lose it.
      list.board = board;

      // If checked, add it to includedLists (with its priority).
      if (list.include) {
        list.rank = inclusion++;
        includedLists.push(list);
      } else {
        _.pull(includedLists, list);
      }
    };

    /**
     * Transforms data into a more easily consumable form.
     */
    function formatData(data) {
      var formattedData = {
        boards: []
      };
      var boardIndex = 0;

      _.forEach(data, function (list) {
        var index = _.result(_.find(formattedData.boards, {
          'name': list.board
        }), 'index');

        /**
         * Add a new list to an already existing board.
         */
        if (index || index === 0) {
          formattedData.boards[index].lists.push({
            name: list.name,
            cards: list.cards
          });
        }
        /**
         * Add a new list to a new board.
         */
        else {
          formattedData.boards.push({
            name: list.board,
            index: boardIndex++,
            lists: [{
              name: list.name,
              cards: list.cards
            }]
          });
        }
      });

      return formattedData;
    };

    /**
     * Listens for changes in isConnected so app knows if user
     * is connected or not.
     */
    $scope.$on('trello:isConnected', function (event, data) {
      if (data) {
        $timeout(function () {
          vm.isConnected = true;
          getTrelloBoards();
        }, 10);
      } else {
        $timeout(function() {
          vm.connectionAttempted = true;
          vm.isConnected = false;
        }, 10);  
      }
    });
  };
})();