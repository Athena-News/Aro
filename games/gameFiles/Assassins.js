
module.exports.gameInfo = {
  // Fill out the following info for your game:
  name: 'Assassins'
  ,
  minPlayers: 4
  ,
  maxPlayers: 4 //for now for simplicity set both to 4
  ,
  // Note: use backslash (\) at the end of each line. For new lines
  // or paragraphs, do not use the newline (\n) as it wil not work.
  // Instead, make each paragraph a separate string in the array
  instructions: [""]
};

module.exports.play = Assassins; // for now. will change to a generic name

function Assassins(lib) {
  console.log('Assasins got run');

  lib.startGame();

  lib.whenPlayerOut(function(outPlayerName, outPlayerInfo, done) {
    lib.setCurrentLocationOfAllAsHome(function() {
      var remainingPlayers = lib.listRemainingPlayers();
      var numPlayers = remainingPlayers.length;
      if (numPlayers > 1) {
        var targetsObj = {};
        for (var i = 0; i < numPlayers; i++) {
          var playerName = remainingPlayers[i];
          if (playerName === outPlayerInfo.isTargetOf[0]) {
            targetsObj[playerName] = outPlayerInfo.target;
          } else {
            targetsObj[playerName] = lib.getTargetOf(playerName);
          }
        }
        console.log('about to assign real new targets');
        lib.assignNewTargets(targetsObj);
      } else {
        lib.playerWins(remainingPlayers[0]);
      }
      done();
    });
  });

  lib.whenTargetAcquired(lib.listRemainingPlayers(), function(playerName, targetName) {
    lib.playerOut(targetName);
  });

  // start
  lib.setCurrentLocationOfAllAsHome(function() {
    var players = lib.listRemainingPlayersInRandomOrder();
    var numPlayers = players.length;
    var targetsObj = {};
    targetsObj[players[0]] = players[numPlayers - 1];
    for (var i = 1; i < numPlayers; i++) {
      targetsObj[players[i]] = players[i-1];
    }
    lib.assignNewTargets(targetsObj);
  });

};
