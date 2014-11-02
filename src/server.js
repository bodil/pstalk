var repl = require("./repl");
var compile = require("./compile");

var server = require("socket.io")(31336);

server.on("connection", function(socket) {
  console.log("** CONNECT");
  repl(function(err, repl) {
    if (err) {
      socket.send({error: "REPL did not start."});
      socket.close();
    } else {
      socket.on("close", function() {
        console.log("** CLOSE");
        repl.close();
      });
      socket.on("message", function(data) {
        var msg = JSON.parse(data);
        var respond = function(err, response) {
          if (err) response = { error: err.toString() };
          response.messageId = msg.messageId;
          console.log("sending response");
          socket.send(JSON.stringify(response));
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
      repl.sendCommand("unit", function(err, res) {
        if (!err) socket.send(JSON.stringify({ready: true}));
      });
    }
  });
});
