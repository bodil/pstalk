var websock = require("websocket-driver");
var repl = require("./repl");
var compile = require("./compile");
var http = require("http");

var server = http.createServer();

server.on("upgrade", function(req, socket, body) {
  if (!websock.isWebSocket(req)) return;
  var driver = websock.http(req);
  driver.io.write(body);
  socket.pipe(driver.io).pipe(socket);

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
      driver.messages.on("data", function(data) {
        var msg = JSON.parse(data), respond = function(err, response) {
          if (err) response = { error: err.toString() };
          response.messageId = msg.messageId;
          console.log("sending response");
          driver.messages.write(JSON.stringify(response));
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
      driver.messages.write(JSON.stringify({ready: true}));
    }
  });

  driver.start();
});

server.listen(31336);
