var socketIoClient = require("socket.io-client");
var text = require("pink/lib/text");
module.exports = (CodeMirror, languages) => {
  CodeMirror.defineMIME("text/x-purescript", "haskell");

  function PureScript() {
    var socket = new socketIoClient("ws://localhost:31336");
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

    this.compile = function compile(code, callback) {
      send({compile: code, type: "text/x-purescript"}, (msg) => {
        if (msg.error.trim().length) {
          let m = msg.error.match(/line +(\d+), column (\d+)/m);
          if (m) {
            let line = parseInt(m[1], 10) - 1, col = parseInt(m[2], 10) - 1;
            let errmsg = msg.error.split("\n").slice(1, -1).join("\n");
            console.log(line, col, errmsg);
            callback(null, {errors: [{message: errmsg, pos: {line: line, col: col}}],
                            code: null})
          } else {
            callback("Unknown error output: " + msg.error);
          }
        } else {
          callback(null, {code: msg.result, errors: []});
        }
      });
    }

    this.evalCode = function evalCode(form, callback) {
      send({eval: form, type: "text/x-purescript"}, callback);
    }

    this.comment = function comment(code) {
      return "-- " + code;
    }
  }

  var out = Object.create(languages);
  out["text/x-purescript"] = PureScript;
  return out;
};
