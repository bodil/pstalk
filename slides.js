require("pink/css/themes/dijkstra.less");
require("./haskell.less");

var Pink = require("pink");

new Pink("#slides", {
  "background": require("pink/modules/background"),
  "image": require("pink/modules/image"),
  "psrepl": require("./modules/psrepl")(),
  "editor": require("pink/modules/editor")([
    require("pink/modules/editor/language/purescript")
  ])
});
