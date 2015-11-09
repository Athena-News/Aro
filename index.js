var app = require('express')();
var http = require('http').Server(app);
var io = exports.io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');

        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        next();
    }
);

var lobby = {};
var liveGames = exports.liveGames = {};
var sockets = exports.sockets = {};

var gameMenu = require('./games/gameMenu').gameMenu;
var GameLib = require('./games/gameDevelopmentLibrary').GameLib;

var gamesInfo = {};
for (var game in gameMenu) {
  gamesInfo[game] = gameMenu[game].gameInfo;
}

io.on('connection', function(socket){
  console.log('user connected');
  socket.emit('updateLobby', lobby);
  socket.emit('gamesInfo', gamesInfo);

  var gamePlayerInfo = {};

  var quitGame = function(playerInfo){
    // console.log('a player quit!');
    var quitter = playerInfo.playerName;
    console.log(quitter + ' quit!');
    var gameID = playerInfo.gameID;

    if (lobby[gameID]) {
      console.log('lobby[gameID] exists');
      var players = lobby[gameID].players;
      console.log(players);
      var playerNames = players.map(function(player) {
        return player.playerName;
      });
      var playerInd = playerNames.indexOf(quitter);
      console.log('playerInd: ', playerInd);
      if (playerInd !== -1) {
        players.splice(playerInd, 1);
        console.log(players);
        if (players.length === 0) {
          console.log('delete lobby[gameID] got run');
          delete lobby[gameID];
          delete sockets[gameID];
        }
        io.emit('updateLobby', lobby);
      }
    }
    socket.leave(gameID);
  };

  socket.on('playerQuit', quitGame);

  socket.on('gameEnter', function(player) {
    console.log('gameEnter received');
    var gameID = player.gameID;
    var newGame = player.newGame;
    var gameType;
    if (newGame) {
      gameType = player.newGame.gameType;
      if (gameMenu[gameType]) {
        lobby[gameID] = {players: [], gameType: gameType, isPrivate: player.newGame.isPrivate};
        sockets[gameID] = {};
      }
    }
    if (lobby[gameID]) {
      socket.emit('gameJoinSuccess');
      socket.join(gameID);
      // emit indicator that player successfully joined?
      var playerName = player.playerName;
      gamePlayerInfo = {gameID: gameID, playerName: playerName};

      var players = lobby[gameID].players;
      sockets[gameID][playerName] = socket;
      players.push(player);
      var gameType = lobby[gameID].gameType;

        console.log('gameType', gameType);
      if (gameMenu[gameType] && players.length === gameMenu[gameType].gameInfo.maxPlayers) {
        delete lobby[gameID];
        io.to(gameID).emit('gameStart', gameID);
        launchGame(gameType, gameID, players);
      }
    } else {
      // emit some kind of indicator that game is no longer available
      socket.emit('gameJoinFailure');
    }
    io.emit('updateLobby', lobby);

  });

  socket.on('requestGamesInfo', function() {
    socket.emit('gamesInfo', gamesInfo);
  });

  socket.on('disconnect', function() {
    console.log('player disconnected');
    quitGame(gamePlayerInfo);
    socket.removeAllListeners('playerQuit');
    socket.removeAllListeners('gameEnter');
    socket.removeAllListeners('targetAcquiredBy'); // not needed
    socket.removeAllListeners('acquiredTarget');
    socket.removeAllListeners('requestGamesInfo');
    socket.removeAllListeners('disconnect');
  });
});

var launchGame = function(gameType, gameID, players) {
  console.log('launchGame got run');
  var liveGame = liveGames[gameID] = {};
  var joinedPlayer;
  for (var j = 0; j < players.length; j++) {
    joinedPlayer = players[j];
    liveGame[joinedPlayer.playerName] = {
      target: false, // starts out with no target, must assign in game
      isTargetOf: [],
      home: joinedPlayer.location
    };
  }
  console.log('players', players);
  gameMenu[gameType].play(new GameLib(gameID));

}

http.listen(port, function(){
  console.log('listening on *:'+port);
});
