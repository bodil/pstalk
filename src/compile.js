var child = require("child_process");
var temp = require("temp").track();
var glob = require("glob");
var path = require("path");
var fs = require("fs");

function getModName(code) {
  var m = code.split("\n").join(" ").match(/module\s+(\S+)\s+where/);
  return m ? m[1] : null;
}

module.exports = function(code, cb) {
  var p = path.resolve(__dirname, "../{bower_components,purs}");
  var modName = getModName(code);
  glob(p + "/**/*.purs", {}, function(err, deps) {
    if (err) return cb(err);
    temp.mkdir("psc", function(err, codepath) {
      if (err) return cb(err);
      var fileName = path.join(codepath, "out.purs");
      fs.writeFile(fileName, code, function(err) {
        if (err) return cb(err);
        var out = "";
        err = "";
        var c = child.spawn("psc", ["--main=" + modName, fileName].concat(deps), {
          stdio: "pipe"
        });
        c.stdin.end(code);
        c.stdout.on("data", function(data) {
          out += data;
        });
        c.stderr.on("data", function(data) {
          err += data;
          console.log("ERR", data.toString("utf-8"));
        });
        c.stdout.on("end", function() {
          cb(null, {result: out, error: err});
        });
      });
    });
  });
};
