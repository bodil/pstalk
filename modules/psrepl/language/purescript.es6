var engineIoClient = require("engine.io-client");
var text = require("pink/lib/text");
require("codemirror").defineMIME("text/x-purescript", "haskell");

module.exports = function PureScript() {

  var socket = new engineIoClient("ws://localhost:31336");
  var queue = {};
  var counter = 0;

  socket.on("message", (data) => {
    let msg = JSON.parse(data);
    let id = msg.messageId;
    let callback = queue[id];
    if (callback) {
      delete queue[id];
      callback(msg);
    }
  });

  function send(obj, callback) {
    obj.messageId = "" + (++counter);
    queue[obj.messageId] = callback;
    socket.send(JSON.stringify(obj));
  }

  this.cleanup = function cleanup() {
    socket.close();
  }

  this.compile = function compile(code, imports, callback) {
    send({loadFile: code, import: imports, type: "text/x-purescript"}, callback);
  }

  this.evalCode = function evalCode(form, callback) {
    send({eval: form, type: "text/x-purescript"}, callback);
  }

  this.comment = function comment(code) {
    return "-- " + code;
  }
};
