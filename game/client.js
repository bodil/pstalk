/*global setTimeout */

(function() {
  var preservedState = {};
  function evalCode(code) {
    setTimeout(function() {
      var module = preservedState;
      eval(code);
    }, 1);
  }

  function onMessage(e) {
    var message;
    try {
      message = JSON.parse(e.data);
    } catch(e) {
      return;
    }

    if (message.hasOwnProperty("key") && window.Mousetrap) {
      Mousetrap.trigger(message.key);
    }

    if (message.hasOwnProperty("code")) {
      document.body.style.visibility = "visible";
      evalCode(message.code);
    }

    if (message.hasOwnProperty("hide")) {
      document.body.style.visibility = message.hide ? "hidden" : "visible";
    }
  }

  window.addEventListener("message", onMessage);
  setTimeout(function() {
    window.postMessage("rdy lol", "*");
  }, 100);
})();
