var server = require('../index');
var liveGames = server.liveGames;
var sockets = server.sockets;
var io = server.io;
var playerOutCallbacks = {};
var disconnectCallbacks = {};

var GameLib = exports.GameLib = function(gameID) {
  this._gameID = gameID;
};

/* Helper functions (not part of game dev library) */

// helper function only
var playerInGame = function(playerName, gameID) {
  // console.log('playerInGame got run', playerName);
  var liveGame = liveGames[gameID];
  if (typeof playerName === 'string' && liveGame && liveGame[playerName]) {
    return playerName;
  } else {
    return false;
  }
};

// must be run before game logic
var setUpPlayerQuitListeners = function(gameID, playerOut) {
  // console.log('setUpPlayerQuitListeners got run');
  disconnectCallbacks[gameID] = {};
  var playerSockets = sockets[gameID];
  var playerSocket;
  for (var playerName in playerSockets) {
    playerSocket = playerSockets[playerName];
    playerSocket.on('playerQuit', playerOut);
    setUpDisconnectListeners(playerName, gameID, playerOut);
  }
};

// helper function for setUpPlayerQuitListeners
var setUpDisconnectListeners = function(playerName, gameID, playerOut) {
  var playerDisconnectCallback = function() {
    // console.log(playerName + ' got disconnected');
    playerOut(playerName);
  };
  disconnectCallbacks[gameID][playerName] = playerDisconnectCallback;
  sockets[gameID][playerName].on('disconnect', playerDisconnectCallback);
};

// Only used as helper function for whenTargetAcquired
// can assume playerName is valid player still in game
var setUpAcquiredTargetListener = function(playerName, gameID, getTargetOf, callback) {
  // console.log('setUpAcquiredTargetListener got run', playerName);
  var playerSocket = sockets[gameID][playerName];
  playerSocket.removeAllListeners('acquiredTarget');
  playerSocket.on('acquiredTarget', function(targetName) {
    // due to async nature of sockets and possible slow connections
    // between server and client, check that the acquired target sent
    // by client is actually the current target. If not, don't trigger
    // callback, since player has not acquired the current target
    // console.log('acquiredTarget listener got triggered, player is ' + playerName + ', target is ' + targetName);
    if (targetName === getTargetOf(playerName)) {
      // console.log('and so did the callback');
      callback(playerName, targetName);
    }
  });
};

// helper function only
var setUpCurrLocationListener = function(playerName, gameID, callback) {
  // console.log('setUpCurrLocationListener got run', playerName);
  // need to set this up on the client side
  var playerSocket = sockets[gameID][playerName];
  playerSocket.removeAllListeners('currLocation');
  playerSocket.on('currLocation', function(location) {
    callback(playerName, location);
  });
};

// only a helper function for assignNewTarget and assignNewTargets
// can assume playerName is valid player still in game and that
// targetName is either valid player still in game or targetName === false
var updateTargets = function(playerName, targetName, gameID) {
  // console.log('updateTargets got run', playerName);
  var liveGame = liveGames[gameID];
  var oldTarget = liveGame[liveGame[playerName].target];
  // if player has a current target, will delete player from
  // the current target's isTargetOf list
  if (oldTarget) {
    var ind = oldTarget.isTargetOf.indexOf(playerName);
    if (ind !== -1) {
      oldTarget.isTargetOf.splice(ind, 1);
    }
  }

  liveGame[playerName].target = targetName;
  if (targetName) {
    liveGame[targetName].isTargetOf.push(playerName);
  }
};

// helper function
var disactivateGameplayListeners = function(playerNames, gameID, playerOut) {
  // console.log('disactivateGameplayListeners got run');
  var playerSocket;
  for (var i = 0; i < playerNames.length; i++) {
    var playerName = playerNames[i];
    playerSocket = sockets[gameID][playerName];
    if (playerSocket) {
      // console.log('listener removers run');
      playerSocket.removeAllListeners('acquiredTarget');
      playerSocket.removeAllListeners('currLocation');
      playerSocket.removeListener('playerQuit', playerOut);
      playerSocket.removeListener('disconnect', disconnectCallbacks[gameID][playerName]);
    }
  }
};

// not part of game developer interface
// only helper function for playerWins and gameOver
var gameEnd = function(winner, gameID, playerOut) {
  // console.log('gameEnd got run');
  io.to(gameID).emit('gameEnd', winner);
  var playerSockets = sockets[gameID];
  var liveGame = liveGames[gameID];
  if (liveGame) {
    disactivateGameplayListeners(Object.keys(liveGames[gameID]), gameID, playerOut);
  }
  for (var playerName in playerSockets) {
    playerSockets[playerName].leave(gameID);
  }
  delete liveGames[gameID];
  // delete playersByGame[gameID];
  delete sockets[gameID];
  delete playerOutCallbacks[gameID];
  delete disconnectCallbacks[gameID];
};

/* Game Dev Library */

GameLib.prototype.startGame = function() {
  // console.log('startGame got run');
  var gameID = this._gameID;
  var library = this;

  this.playerOut = function(playerName) {
    // console.log('playerOut got run', playerName);
    if (typeof playerName === 'object') {
      playerName = playerName.playerName;
    }
    // console.log('playerName', playerName);
    // console.log('gameID', gameID);
    // console.log(liveGames[gameID]);
    // console.log(liveGames[gameID][playerName]);
    if (playerInGame(playerName, gameID)) {
      // console.log('playerInGame(' + playerName + ')');
      disactivateGameplayListeners([playerName], gameID, library.playerOut);
      // may change to just socket.emit, but keeping this for now in case
      // the client may be changed to do something with this info even if
      // the client does not belong to the outPlayer
      io.to(gameID).emit('playerOut', playerName);
      var playerInfo = liveGames[gameID][playerName];
      var currTargetName = playerInfo.target;
      var currTargetIsTargetOf = liveGames[gameID][currTargetName].isTargetOf;
      for (var i = 0; i < currTargetIsTargetOf.length; i++) {
        if (currTargetIsTargetOf[i] === playerName) {
          currTargetIsTargetOf.splice(i, 1);
          break;
        }
      }

      delete liveGames[gameID][playerName];

      playerOutCallbacks[gameID](playerName, playerInfo);
    }

  };

  setUpPlayerQuitListeners(gameID, library.playerOut);

  // In case this function is not called later, this will set a default
  if (!playerOutCallbacks[gameID]) {
    this.whenPlayerOut();
  }
};

// Only one playerOutCallback for a game can be defined at a time,
// if whenPlayerOut is called again, playerOutCallback replaced
// callback(outPlayerName, outPlayerInfo, done)
// if at the end of the callback the game hasn't ended and there
// are players still targeting the outPlayer, those players will
// now get assigned no target
// may later add team or role as a parameter
GameLib.prototype.whenPlayerOut = function(callback) {
  // console.log('whenPlayerOut got run');
  callback = callback || function(name, info, done) {done();};
  var gameID = this._gameID;
  var library = this;
  var done = function() {
    // console.log('whenPlayerOut callback done got run');
    // if game hasn't already been ended in callback
    if (liveGames[gameID]) {
      var livePlayers = library.listRemainingPlayers();
      if (livePlayers.length === 0) {
        library.gameOver();
      } else {
        var targetsObj = {};
        for (var i = 0; i < livePlayers.length; i++) {
          var playerName = livePlayers[i];
          if (!playerInGame(liveGames[gameID][playerName].target, gameID)) {
            targetsObj[playerName] = false;
          }
        }
        if (Object.keys(targetsObj).length) {
          // console.log('player is about to get assigned to false target');
          library.assignNewTargets(targetsObj);
        }
      }
    }
  };
  playerOutCallbacks[gameID] = function(outPlayerName, outPlayerInfo) {
    // console.log('playerOutCallback got run');
    callback(outPlayerName, outPlayerInfo, done);
  };
};

// callback(playerName, targetName)
// playerName_s_ is either a playerName or array of playerNames
GameLib.prototype.whenTargetAcquired = function(playerName_s_, callback) {
  // console.log('whenTargetAcquired got run');
  if (typeof playerName_s_ === 'string') {
    playerName_s_ = [playerName_s_];
  }

  if (Array.isArray(playerName_s_)) {
    var gameID = this._gameID;
    var numPlayers = playerName_s_.length;
    var playerName;
    for (var ind = 0; ind < numPlayers; ind++) {
      playerName = playerName_s_[ind];
      if (playerInGame(playerName, gameID)) {
        setUpAcquiredTargetListener(playerName, gameID, this.getTargetOf.bind(this), callback);
      }
    }
  }
};

GameLib.prototype.listRemainingPlayers = function() {
  // console.log('listRemainingPlayers got run');
  // any changes made to the array will not affect
  // the object from which the keys are retrieved
  var liveGame = liveGames[this._gameID];
  if (liveGame) {
    // console.log(Object.keys(liveGames[this._gameID]));
    return Object.keys(liveGames[this._gameID]);
  } else {
    return [];
  }
};

GameLib.prototype.randomPlayer = function() {
  var liveGame = liveGames[this._gameID];
  if (liveGame) {
    var remainingPlayers = Object.keys(liveGame);
    var randInd = Math.floor(Math.random()*remainingPlayers.length);
    return remainingPlayers[randInd];
  }
};

GameLib.prototype.listRemainingPlayersInRandomOrder = function() {
  var randomizedList = [];
  var liveGame = liveGames[this._gameID];
  if (liveGame) {
    var remainingPlayers = Object.keys(liveGames[this._gameID]);
    var randInd;
    while (remainingPlayers.length) {
      randInd = Math.floor(Math.random()*remainingPlayers.length);
      randomizedList.push(remainingPlayers[randInd]);
      remainingPlayers.splice(randInd, 1);
    }
  }
  // console.log('randomizedList', randomizedList);
  return randomizedList;
};

GameLib.prototype.getTargetOf = function(playerName) {
  // console.log('getTargetOf got run', playerName);
  var gameID = this._gameID;
  if (playerInGame(playerName, gameID)) {
    return liveGames[gameID][playerName].target;
  }
};

GameLib.prototype.isTargeting = function(targetName) {
  // console.log('isTargeting got run', targetName);
  var gameID = this._gameID;
  if (playerInGame(targetName, gameID)) {
    return liveGames[gameID][targetName].isTargetOf.slice();
  }
};

GameLib.prototype.getHomeLocationOf = function(playerName) {
  // console.log('getHomeLocationOf got run', playerName);
  var gameID = this._gameID;
  if (playerInGame(playerName, gameID)) {
    var home = liveGames[gameID][playerName].home;
    return {
      latitude: home.latitude,
      longitude: home.longitude
    };
  }
};

GameLib.prototype.assignNewTarget = function(playerName, targetName) { // next-callback?
  // console.log('assignNewTarget got run');
  var targetsObj = {};
  targetsObj[playerName] = targetName;
  this.assignNewTargets(targetsObj); // next-callback?
  // because a check is built into the acquiredTarget listener
  // to ensure that client does not acquire an old target after
  // new targets have been emitted, this function can be treated
  // as if it is synchronous.
};

GameLib.prototype.assignNewTargets = function(targetsObj) { //next-callback?
  // console.log('assignNewTargets got run');
  // console.log(targetsObj);
  var emitObj = {};
  var gameID = this._gameID;
  for (var playerName in targetsObj) {
    // check if playerName is valid player still in game
    if (playerInGame(playerName, gameID)) {
      var targetName = playerInGame(targetsObj[playerName], gameID);
      updateTargets(playerName, targetName, gameID);
      if (targetName) {
        emitObj[playerName] = {
          playerName: targetName,
          location: this.getHomeLocationOf(targetName)
        };
      } else {
        // if you pass in false for a playerName in the targetsObj,
        // then the player will now have no target
        emitObj[playerName] = {
          location: {}
        };
      }
    }
  }
  io.to(gameID).emit('newTarget', emitObj); // next-callback?
  // because a check is built into the acquiredTarget listener
  // to ensure that client does not acquire an old target after
  // new targets have been emitted, this function can be treated
  // as if it is synchronous.
};

GameLib.prototype.setCurrentLocationAsHome = function(playerName_s_, next) {
  // console.log('setCurrentLocationAsHome got run');
  if (typeof playerName_s_ === 'string') {
    playerName_s_ = [playerName_s_];
  }

  if (Array.isArray(playerName_s_)) {
    var gameID = this._gameID;
    // setCurrLocationListener for each of the valid players in the array
    // once all players have emitted back location, next-callback will run
    var nextCallbackHasRun = false;
    var whenLocationReceived = function(playerName, location) {
      // console.log('whenLocationReceived got run');
      liveGames[gameID][playerName].home = location;
      delete remainingPlayers[playerName];
      // In case a player leaves game before sending location,
      // this will prevent gameplay from waiting for that location
      // Might be unnecessary now that setTimeout has been set below
      /*for (var remainingPlayer in remainingPlayers) {
        if (!playerInGame(remainingPlayer)) {
          delete remainingPlayers[remainingPlayer];
        }
      }*/

      if (Object.keys(remainingPlayers).length === 0 && !nextCallbackHasRun) {
        nextCallbackHasRun = true;
        next();
      }
    };

    var numPlayers = playerName_s_.length;
    var remainingPlayers = {};
    var playerName;
    for (var i = 0; i < numPlayers; i++) {
      playerName = playerName_s_[i];
      if (playerInGame(playerName, gameID)) {
        remainingPlayers[playerName] = 1;
        setUpCurrLocationListener(playerName, gameID, whenLocationReceived);
      }
    }
    io.to(gameID).emit('getCurrLocation', remainingPlayers); // need to set up on client
    // If a player's connection is slow, gameplay will just continue
    // after 5 seconds of waiting for location from client
    // Location will still update for a client that sends back a location
    // after 5 seconds, but no guarantee that any new pursuers will get
    // the new location as their next target location
    setTimeout(function() {
      if (!nextCallbackHasRun) {
        nextCallbackHasRun = true;
        next();
      }
    }, 5000);
  } else {
    // if playerName_s_ not an array, then no home locations will be
    // updated, and the next-callback just immediately executes
    next();
  }
};

GameLib.prototype.setCurrentLocationOfAllAsHome = function(next) {
  // console.log('setCurrentLocationOfAllAsHome got run');
  // Needs to be the first thing that runs when game starts
  // after setUpPlayerQuitListeners and whenTargetAcquired
  // have been set up
  this.setCurrentLocationAsHome(this.listRemainingPlayers(), next);
};

GameLib.prototype.playerWins = function(playerName) {
  // console.log('playerWins got run', playerName);
  var gameID = this._gameID;
  if (playerInGame(playerName, gameID)) {
    gameEnd(playerName, gameID, this.playerOut);
  } else {
    this.gameOver();
  }
};

GameLib.prototype.gameOver = function() {
  // console.log('gameOver got run');
  gameEnd('No one', this._gameID, this.playerOut);
};
