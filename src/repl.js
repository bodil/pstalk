/*global setTimeout */

var childProcess = require("child_process");
var temp = require("temp").track();
var events = require("events");
var fs = require("fs");
var path = require("path");
var glob = require("glob");

function getModName(code) {
  var m = code.split("\n").join(" ").match(/module\s+(\S+)\s+where/);
  return m ? m[1] : null;
}

function createRepl(cb) {
  var p = path.resolve(__dirname, "../{bower_components,purs}");
  glob(p + "/**/*.purs", {}, function(err, deps) {
    if (err) return cb(err);
    temp.mkdir("psrepl", function(err, codepath) {
      if (err) return cb(err);

      var repl = new events.EventEmitter();
      var out = "", err = "", prompt = "> ", errTimer = null;

      function spawnProc() {
        var proc = childProcess.spawn("psci", ["--single-line-mode"].concat(deps), {
          cwd: codepath,
          stdio: "pipe"
        });
        proc.stdin.setEncoding("utf-8");
        proc.stdout.setEncoding("utf-8");
        proc.stderr.setEncoding("utf-8");

        proc.stdout.on("close", function(code) {
          console.log("** PROCESS CLOSED", code);
        });

        function recvOut(buf) {
          var data = buf.toString("utf-8"), res;
          console.log("**** OUT", "'" + data + "'");
          out += data;
          if (out.slice(out.length - prompt.length) === prompt) {
            res = out.slice(0, out.length - prompt.length);
            repl.emit("output", {
              value: res
            });
            out = "";
          }
        }
        proc.stdout.on("data", recvOut);

        function errReport() {
          errTimer = null;
          repl.emit("output", {
            error: err
          });
          console.log("**** ERR", err);
          err = "";
        };
        proc.stderr.on("data", function(chunk) {
          err += chunk;
          if (errTimer === null) {
            errTimer = setTimeout(errReport, 100);
          }
        });
        return proc;
      }

      var proc = spawnProc();

      repl.reset = function(cb) {
        proc.kill("SIGTERM");
        proc = spawnProc();
        repl.once("output", function() {
          cb();
        });
      }

      repl.close = function() { proc.kill(); };

      repl.sendCommand = function(data, cb) {
        proc.stdin.write(data + "\n");
        repl.once("output", function(r) { cb(null, r); });
        console.log("**** IN", data);
      };

      function loadImports(imports, cb) {
        if (imports.length) {
          repl.sendCommand(":i " + imports[0], function(err, res) {
            if (err) return cb(err);
            loadImports(imports.slice(1), cb);
          });
        } else cb(null);
      }

      repl.loadFile = function(data, imports, cb) {
        var modName = getModName(data);
        if (!modName) return cb("Code does not contain a module declaration!");
        repl.reset(function() {
          fs.writeFile(path.join(codepath, "out.purs"), data, function(err) {
            if (err) return cb(err);
            repl.sendCommand(":r", function(err, res) {
              if (err) return cb(err);
              repl.sendCommand(":m out.purs", function(err, res) {
                if (err) return cb(err);
                loadImports(imports.concat([modName]), function(err, res) {
                  if (err) return cb(err);
                  repl.sendCommand("unit", function(err, res) {
                    if (err) {
                      cb(err);
                    } else if (res.value.match(/^Error at /m)) {
                      cb(null, {module: modName, error: res.value});
                    } else {
                      cb(null, {module: modName, success: true});
                    }
                  });
                });
              });
            });
          });
        });
      };

      // Wait for initial prompt, then signal readiness.
      repl.once("output", function() {
        cb(null, repl);
      });
    });
  });
}

module.exports = createRepl;
