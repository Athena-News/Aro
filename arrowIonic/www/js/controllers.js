angular.module('starter.controllers', [])

// .controller('MapCtrl', function($rootScope, $scope, $cordovaGeolocation) {

//   // Get geolocation of user's current position and initialize map
//   $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: true})
//     .then(function(currentPosition) {

//       $rootScope.currentPosition = new google.maps.LatLng(currentPosition.coords.latitude, currentPosition.coords.longitude);
//       $scope.geocoder = new google.maps.Geocoder();
//       initializeMap($rootScope.currentPosition);

//     }, function(error) {
//       console.log("Could not get current location");
//     }); // end cordovaGeolocation

//   var initializeMap = function(currentPosition) {

//     var mapOptions = {
//       center: currentPosition,
//       zoom: 15,
//       mapTypeId: google.maps.MapTypeId.ROADMAP,
//       disableDefaultUI: true,
//     };

//     $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

//     google.maps.event.addDomListener($scope.map, 'mousedown', function(e){
//       $scope.mousePosition = e.latLng;
//       if (document.getElementById('deleteMarkerButton').style.display === 'block') {
//         document.getElementById('setArrowButton').style.display = 'none';
//         document.getElementById('deleteMarkerButton').style.display = 'none';
//         document.getElementById('currentLocButton').style.display = 'block';
//       }
//       infowindow.close();
//     });

//   }; // end initializeMap

//   var infowindow = new google.maps.InfoWindow({ content: 'Selected' });

//   $scope.currentLocation = function() {
//     $scope.map.setCenter($rootScope.currentPosition);
//   };

//   var markers = [];
//   var markerID = 0;
//   $scope.createMarker = function(position) {

//     // Save the location of where the marker is created
//     // to access from the compass
//     $rootScope.markerPosition = position;

//     var marker = new google.maps.Marker({
//       map: $scope.map,
//       animation: google.maps.Animation.DROP,
//       draggable: true,
//       position: position
//     });

//     marker.id = markerID;
//     markerID++;
//     markers.push(marker);

//     marker.addListener('click', function() {
//       $scope.markerID = this.id;
//       if (document.getElementById('deleteMarkerButton').style.display === 'block') {
//         document.getElementById('setArrowButton').style.display = 'none';
//         document.getElementById('deleteMarkerButton').style.display = 'none';
//         document.getElementById('currentLocButton').style.display = 'block';
//       } else {
//         document.getElementById('setArrowButton').style.display = 'block';
//         document.getElementById('deleteMarkerButton').style.display = 'block';
//         document.getElementById('currentLocButton').style.display = 'none';
//       }
//       infowindow.open($scope.map, marker);
//     });

//     if (position === $rootScope.currentPosition) $scope.map.setCenter(position);

//   }; // end createMarker

//   $scope.deleteMarker = function(markerID) {
//     for (var i = 0; i < markers.length; i++) {
//       if (markers[i].id === markerID) {
//         markers[i].setMap(null);
//         markers.splice(i, 1);
//         document.getElementById('deleteMarkerButton').style.display = 'none';
//         document.getElementById('setArrowButton').style.display = 'none';
//         document.getElementById('currentLocButton').style.display = 'block';
//         return;
//       }
//     }
//   }; // end deleteMarker

//   // geocodes a human readable address & stores long/lat in var coordsResult
//   $scope.geocodeAddress = function(geocoder, map) {

//     var address = document.getElementById('address').value;

//     $scope.geocoder.geocode({'address': address}, function(results, status) {
//       if (status === google.maps.GeocoderStatus.OK) {
//         $scope.map.setCenter(results[0].geometry.location);
//         var coordsResult = results[0].geometry.location;
//         console.log(coordsResult);
//       } else {
//         alert('Geocode was not successful for the following reason: ' + status);
//       }
//     });

//   }; // end geocodeAddress

// })

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});


.controller('CompassCtrl', function($rootScope, $scope, $state, $cordovaDeviceOrientation, $cordovaGeolocation, $ionicScrollDelegate, socket, options) {

  var demo = options.demo;
  var demoStartDistance = options.demoStartDistance;
  //var demoDistanceAdd = 0;

  $rootScope.$watch('hasJoinedGame', function() {
    $scope.hasJoinedGame = $rootScope.hasJoinedGame || ($scope.winnerMessage = false);
  });
  $rootScope.$watch('playerName', function() {
    $scope.playerName = $rootScope.playerName;
  });
  $rootScope.$watch('gameID', function() {
    $scope.gameID = $rootScope.gameID;
  });
  $rootScope.$watch('playerIsOut', function() {
    $scope.playerIsOut = $rootScope.playerIsOut;
  });
  $rootScope.$watch('gameInSession', function() {
    console.log('gameInSession', $rootScope.gameInSession);
    $scope.gameInSession = $rootScope.gameInSession;
  });

  socket.on('gameStart', function() {
    console.log('gameStart triggered');
    $rootScope.gameInSession = true;
  });

  socket.on('getCurrLocation', function(playerNames) {
    if (playerNames[$rootScope.playerName]) {
      socket.emit('currLocation', $rootScope.location);
    }
  });

  socket.on('newTarget', function(targetsObj) {
    // using rootScope instead of scope just in case
    // the scope has not been updated yet
    var target = targetsObj[$rootScope.playerName];
    if (target) {
      $scope.targetHasBeenUpdated = true;
      $scope.targetName = target.playerName;
      $scope.targetLocation = target.location;
      console.log('new target is ' + target.playerName);
      if (demo) {
        $scope.distance = demoStartDistance;
        var decrementDistance = function() {
          $scope.distance -= Math.random();
          console.log($scope.distance);
          if (!$scope.playerIsOut && $scope.distance < options.targetRadius) {
            $scope.distance = 0;
            $scope.targetAcquired = true;
            socket.emit('acquiredTarget', $scope.targetName);
            console.log('acquiredTarget emitted');
          } else if (!$scope.playerIsOut){
            setTimeout(decrementDistance, 3000)
          }
        }
        decrementDistance();
      }
      setTimeout(function() {
        $scope.targetHasBeenUpdated = false;
        $scope.targetAcquired = false;
      }, 1000);
    }
  });

  socket.on('playerOut', function(playerName) {
    if (playerName === $rootScope.playerName) {
      console.log(playerName + ' is out!');
      $rootScope.playerIsOut = $scope.playerIsOut = true;
      console.log('playerIsOut', $scope.playerIsOut);
    }
  });

  socket.on('gameEnd', function(winnerName) {
    if ($rootScope.playerName === winnerName) {
      $scope.winnerMessage = 'Game over. You win!'
    } else {
      $scope.winnerMessage = 'Game over. ' + winnerName + ' wins!'
    }
    setTimeout(function() {
      $scope.targetAcquired = false;
    }, 1000);
  });

  document.addEventListener("deviceready", function () {
  // will need to test if waiting for deviceready may cause
  // a problem if the server emits 'newTarget' before deviceready

    console.log('deviceready ran');
    var here, there, heading, bearing;

    $scope.targetLocation = {};

    // see http://ngcordova.com/docs/plugins/geolocation
    var locationOptions = {
      timeout: 3000,
      maximumAge: 10000,
      enableHighAccuracy: false // may cause errors if true
    };


    $cordovaGeolocation.watchPosition(locationOptions)
    .then(
    null,
    function(err) {
      console.log(err);
    },
    function(position) {
      $rootScope.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      here = turf.point([position.coords.latitude, position.coords.longitude]);
      there = turf.point([$scope.targetLocation.latitude, $scope.targetLocation.longitude]);

      if (!demo) {
        $scope.distance = Number(turf.distance(here, there, 'miles')).toFixed(4);
        if ($scope.distance < options.targetRadius && !$scope.targetAcquired && !$scope.playerIsOut) {
          $scope.distance = 0;
          $scope.targetAcquired = true;
          socket.emit('acquiredTarget', $scope.targetName);
          console.log('acquiredTarget emitted');
        }
      }
    });



    // see http://ngcordova.com/docs/plugins/deviceOrientation
    var orientationOptions = { frequency: 250 };   // how often the watch updates

    $scope.watch = $cordovaDeviceOrientation.watchHeading(orientationOptions).then(
      null,
      function(error) {
        //$scope.heading = err;
      },
      function(result) {
        heading = ionic.Platform.isIOS() ? result.magneticHeading : result.trueHeading;
        //$scope.compass = 'transform: rotate(-'+ heading +'deg)';
        //$scope.heading = heading;
        bearing = Math.floor(turf.bearing(here, there) - heading + 90);
        $scope.rotation = '-webkit-transform: rotate('+ bearing +'deg);transform: rotate('+ bearing +'deg);';
    });

  }, false);

})


.controller('HomeCtrl', function($rootScope, $scope, $state, $cordovaGeolocation, socket, options) {

  var codeOptions = options.codeOptions;
  var chars = codeOptions.chars;
  var privateGameCodes = {};

  // $scope.gameTypes = options.gameTypes;
  $scope.publicGames = {noGames: true};
  $scope.createdGame = {isPrivate: false};
  $scope.register = {};
  $scope.game = {};
  // $scope.now = new Date();
  // setTimeout(function() { $scope.now = new Date(); }, 1000);

  $scope.registerName = function() {
    $scope.playerName = $scope.register.name + Math.ceil(Math.random()*9999);
  };

  socket.on('updateLobby', function(newLobby) {
    console.log('updateLobby received');
    console.log(newLobby);
    // completing list first before assiging it
    // to scope variable, so that the user does
    // not visually see list get populated
    var publicGames = {noGames: true};
    var privateGames = {};
    for (var gameID in newLobby) {
      if (newLobby[gameID].isPrivate) {
        privateGames[gameID] = true;
      } else {
        if (publicGames.noGames) {
          delete publicGames.noGames;
        }
        publicGames[gameID] = newLobby[gameID];
      }
    }

    $scope.publicGames = publicGames;
    privateGameCodes = privateGames;
    console.log($scope.publicGames);
  });

  socket.on('gamesInfo', function(gamesInfo) {
    console.log(gamesInfo);
    $scope.gamesInfo = gamesInfo;
    $scope.createdGame.gameType = Object.keys(gamesInfo)[0];
  });

  socket.on('gameJoinSuccess', function() {
    $rootScope.hasJoinedGame = true;
    $scope.hasJoinedGame = true;
    $scope.joining = false;
    // switch tabs to game tab
    $state.go('tab.compass');
  });

  socket.on('gameJoinFailure', function() {
    $scope.joining = false;
    $scope.game.notExist = true;
  });

  $scope.selectCreate = function() {
    if (!$scope.gamesInfo) {
      socket.emit('requestGamesInfo');
    }
    $scope.selectedJoin = false;
    $scope.selectedCreate = true;
  };

  $scope.selectJoin = function() {
    $scope.game.notExist = false;
    $scope.selectedCreate = false;
    $scope.selectedJoin = true;
  };

  $scope.joinGame = function (createNew, gameID) { //gameID only required for existing
    $scope.game.notExist = false;
    $scope.joining = true;
    if (createNew) {
      do {
        gameID = '';
        for (var j = 0; j < codeOptions[$scope.createdGame.isPrivate?'privateLen':'publicLen']; j++) {
          gameID += chars[Math.floor(Math.random()*chars.length)];
        }
      } while (privateGameCodes[gameID] || $scope.publicGames[gameID]);
      // checks if already exists
    } else {
      gameID = gameID.toUpperCase();
      console.log('gameID', gameID);
      if (!(privateGameCodes[gameID] || $scope.publicGames[gameID])) {
        $scope.joining = false;
        $scope.game.notExist = true;
      }
    }

    if (!$scope.game.notExist) {
      $rootScope.gameID = gameID;
      $rootScope.playerName = $scope.playerName;

      $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: true})
      .then(function(currentPosition) {
        $rootScope.location = {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude
        };
        console.log('$scope.createdGame', $scope.createdGame);
        $scope.playerObj = {
          location: $rootScope.location,
          playerName: $scope.playerName,
          gameID: gameID
        };

        if (createNew) {
          $scope.playerObj.newGame = {
            isPrivate: $scope.createdGame.isPrivate,
            gameType: $scope.createdGame.gameType
          };
        }
        // assume that the server will join the client to the gameID room
        // when the client emits a 'gameEnter'
        socket.emit('gameEnter', $scope.playerObj);
      });
    }
  };

  // change name to 'quit' to avoid confusion with 'gameEnd'?
  $scope.endGame = function() { // delete parameter in html
    $rootScope.hasJoinedGame = false;
    $rootScope.gameInSession = false;
    $rootScope.playerIsOut = false;
    $scope.hasJoinedGame = false;
    $scope.selectedJoin = false;
    $scope.selectedCreate = false;
    // here, must communicate to server so server can take that
    // player out from the players list for that game
    // (and can notify a player if they are the only one remaining)
    // assume server will do socket.leave(gameID)
    socket.emit('playerQuit', {
      playerName: $scope.playerName,
      gameID: $rootScope.gameID
    });

  };

});
