angular.module('starter.controllers', [])

.controller('MapCtrl', function($rootScope, $scope, $cordovaGeolocation) {

  // Get geolocation of user's current position and initialize map
  $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: true})
    .then(function(currentPosition) {

      $rootScope.currentPosition = new google.maps.LatLng(currentPosition.coords.latitude, currentPosition.coords.longitude);
      $scope.geocoder = new google.maps.Geocoder();
      initializeMap($rootScope.currentPosition);

    }, function(error) {
      console.log("Could not get current location");
    }); // end cordovaGeolocation

  var initializeMap = function(currentPosition) {

    var mapOptions = {
      center: currentPosition,
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
    };

    $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);

    google.maps.event.addDomListener($scope.map, 'mousedown', function(e){
      $scope.mousePosition = e.latLng;
      if (document.getElementById('deleteMarkerButton').style.display === 'block') {
        document.getElementById('setArrowButton').style.display = 'none';
        document.getElementById('deleteMarkerButton').style.display = 'none';
        document.getElementById('currentLocButton').style.display = 'block';
      }
      infowindow.close();
    });

  }; // end initializeMap

  var infowindow = new google.maps.InfoWindow({ content: 'Selected' });

  $scope.currentLocation = function() {
    $scope.map.setCenter($rootScope.currentPosition);
  };

  var markers = [];
  var markerID = 0;
  $scope.createMarker = function(position) {

    // Save the location of where the marker is created
    // to access from the compass
    $rootScope.markerPosition = position;

    var marker = new google.maps.Marker({
      map: $scope.map,
      animation: google.maps.Animation.DROP,
      draggable: true,
      position: position
    });

    marker.id = markerID;
    markerID++;
    markers.push(marker);

    marker.addListener('click', function() {
      $scope.markerID = this.id;
      if (document.getElementById('deleteMarkerButton').style.display === 'block') {
        document.getElementById('setArrowButton').style.display = 'none';
        document.getElementById('deleteMarkerButton').style.display = 'none';
        document.getElementById('currentLocButton').style.display = 'block';
      } else {
        document.getElementById('setArrowButton').style.display = 'block';
        document.getElementById('deleteMarkerButton').style.display = 'block';
        document.getElementById('currentLocButton').style.display = 'none';
      }
      infowindow.open($scope.map, marker);
    });

    if (position === $rootScope.currentPosition) $scope.map.setCenter(position);

  }; // end createMarker

  $scope.deleteMarker = function(markerID) {
    for (var i = 0; i < markers.length; i++) {
      if (markers[i].id === markerID) {
        markers[i].setMap(null);
        markers.splice(i, 1);
        document.getElementById('deleteMarkerButton').style.display = 'none';
        document.getElementById('setArrowButton').style.display = 'none';
        document.getElementById('currentLocButton').style.display = 'block';
        return;
      }
    }
  }; // end deleteMarker

  // geocodes a human readable address & stores long/lat in var coordsResult
  $scope.geocodeAddress = function(geocoder, map) {

    var address = document.getElementById('address').value;

    $scope.geocoder.geocode({'address': address}, function(results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        $scope.map.setCenter(results[0].geometry.location);
        var coordsResult = results[0].geometry.location;
        console.log(coordsResult);
      } else {
        alert('Geocode was not successful for the following reason: ' + status);
      }
    });

  }; // end geocodeAddress

})

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});


.controller('CompassCtrl', function($rootScope, $scope, $state, $cordovaDeviceOrientation, $cordovaGeolocation, $ionicScrollDelegate, socket) {

  // This was used to test the socket
  // socket.on('chat message', function(message) {
  //   console.log('successfully received chat message');
  //   console.log(message);
  //   $scope.receivedmessage = message;
  // });

  // socket.emit('chat message', 'This is the emitted message from client');

  $rootScope.$watch('hasJoinedGame', function() {
    $scope.hasJoinedGame = $rootScope.hasJoinedGame;
  });
  $rootScope.$watch('playerName', function() {
    $scope.playerName = $rootScope.playerName;
  });
  $rootScope.$watch('gameID', function() {
    $scope.gameID = $rootScope.gameID;
  });

  socket.on('game start', function() {
    $scope.gameInSession = true;
  });

  document.addEventListener("deviceready", function () {

    var here, there, heading, bearing;

    $scope.targetLocation = {};

    socket.on('newTarget', function(tuple) {
      if ($scope.playerName === tuple[0]) {
        $scope.targetName = tuple[1].playerName;
        $scope.targetLocation = tuple[1].location;
      }
    })

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
        here = turf.point([position.coords.latitude, position.coords.longitude]);
        there = turf.point([$scope.targetLocation.latitude, $scope.targetLocation.longitude]);
        // $scope.bearing = Math.floor(turf.bearing(here, there) - $scope.heading + 90);
        // $scope.rotation = '-webkit-transform: rotate('+ $scope.bearing +'deg);transform: rotate('+ $scope.bearing +'deg);';
        $scope.distance = Number(turf.distance(here, there, 'miles')).toFixed(6);
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

  $scope.gameTypes = options.gameTypes;
  $scope.publicGames = [];
  $scope.createdGame = {};
  $scope.gameInSession = false;
  $scope.register = {};
  // $scope.now = new Date();
  // setTimeout(function() { $scope.now = new Date(); }, 1000);

  $scope.registerName = function() {
    $scope.playerName = $scope.register.name;
  };

  socket.on('updateLobby', function(newLobby) {
    $scope.publicGames = newLobby;
  });

  $scope.selectCreate = function() {
    $scope.selectedJoin = false;
    $scope.selectedCreate = true;
  };

  $scope.selectJoin = function() {
    $scope.selectedCreate = false;
    $scope.selectedJoin = true;
  };

  $scope.joinGame = function (createNew, gameID) { //gameID only required for existing
    $scope.joining = true;
    if (createNew) {
      gameID = '';
      for (var j = 0; j < codeOptions[$scope.createdGame.isPrivate?'privateLen':'publicLen']; j++) {
        gameID += chars[Math.floor(Math.random()*chars.length)];
      }
      // for now, does not check if this game code already exists
      // can add that in future
    }

    $cordovaGeolocation.getCurrentPosition({timeout: 10000, enableHighAccuracy: true})
    .then(function(currentPosition) {
      $scope.location = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude
      };

      $scope.playerObj = {
        location: $scope.location,
        playerName: $scope.playerName,
        gameID: gameID
      };

      if (createNew) {
        $scope.playerObj.newGame = {
          isPrivate: $scope.createdGame.isPrivate,
          gameType: options.gameTypes[$scope.createdGame.gameTypeIndex].name
        }
      }
      // assume that the server will join the client to the gameID room
      // when the client emits a 'gameEnter'
      socket.emit('gameEnter', $scope.playerObj);

      // for now, set to async, but if we change to having any checks
      // on whether gameID exists, then will need to move into callback
      // function for socket.
      console.log($scope.playerName);
      $rootScope.gameID = gameID;
      $rootScope.playerName = $scope.playerName;
      $rootScope.hasJoinedGame = true;
      $scope.hasJoinedGame = true;
      $scope.joining = false;
      $state.go('tab.compass');
      // switch tabs to game tab
    });
  };

  $scope.endGame = function() {
    $rootScope.hasJoinedGame = false;
    $scope.hasJoinedGame = false;
    $scope.selectedJoin = false;
    $scope.selectedCreate = false;
    // here, must communicate to server so server can take that
    // player out from the players list for that game
    // (and can notify a player if they are the only one remaining)
    // assume server will do socket.leave(gameID)
    socket.emit('playerQuit', $scope.playerName);

  };

});
