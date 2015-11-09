// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js

angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova', 'btford.socket-io'])

.config(function($ionicConfigProvider) {
  $ionicConfigProvider.tabs.position('bottom');
})

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleLightContent();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html'
  })

  // Each tab has its own nav history stack:

  .state('tab.compass', {
    url: '/compass',
    views: {
      'tab-compass': {
        templateUrl: 'templates/tab-compass.html',
        controller: 'CompassCtrl'
      }
    }
  })

  .state('tab.home', {
    url: '/home',
    views: {
      'tab-home': {
        templateUrl: 'templates/tab-home.html',
        controller: 'HomeCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/home');

})

.factory('socket', function(socketFactory) {
  // Create socket, connect to url (must change url here)
  // var myIoSocket = io.connect('https://arogames.herokuapp.com/');
  var myIoSocket = io.connect('https://immense-harbor-7864.herokuapp.com/');
  // var myIoSocket = io.connect('localhost:3000/');

  return socketFactory({
    ioSocket: myIoSocket
  });
})

.factory('options', function() {

  var codeOptions = {
    chars: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    publicLen: 4,
    privateLen: 3,
  };

  // # of miles from target player must be to acquire it
  var targetRadius = 0.03;
  // var targetRadius = 5;

  var demo = false;
  var demoStartDistance = 4;

  return {
    demo: demo,
    demoStartDistance: demoStartDistance,
    codeOptions: codeOptions,
    targetRadius: targetRadius,
  };
});
