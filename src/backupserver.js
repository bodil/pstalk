var websock = require("websock");
var repl = require("./repl");
var compile = require("./compile");

websock.listen(31336, function(socket) {
  console.log("** CONNECT");
  repl(function(err, repl) {
    if (err) {
      socket.send(JSON.stringify({error: "REPL did not start."}));
      socket.close();
    } else {
      socket.on("close", function() {
        console.log("** CLOSE");
        repl.close();
      });
      socket.on("message", function(data) {
        var msg = JSON.parse(data), respond = function(err, response) {
          if (err) response = { error: err.toString() };
          response.messageId = msg.messageId;
          console.log("sending response");
          socket.on("error", function(err) {
            console.log("socket error", err);
          });
          socket.send(JSON.stringify(response), function(err) {
            console.log("response sent", err);
          });
        };
        console.log("** MSG", msg);
        if (msg.eval) {
          repl.sendCommand(msg.eval, function(err, res) {
            respond(err, {result: res});
          });
        } else if (msg.loadFile) {
          repl.loadFile(msg.loadFile, msg.import, respond);
        } else if (msg.compile) {
          compile(msg.compile, respond);
        } else {
          respond("unknown message");
        }
      });
      socket.send(JSON.stringify({ready: true}));
    }
  });
});
