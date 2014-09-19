/*global setTimeout, Audio */

let CodeMirror = require("codemirror/lib/codemirror.js");
require("codemirror/lib/codemirror.css");

require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/addon/edit/closebrackets.js");
require("codemirror/addon/hint/show-hint.js");
require("codemirror/addon/hint/show-hint.css");
require("codemirror/addon/hint/anyword-hint.js");
require("codemirror/addon/selection/active-line.js");
require("codemirror/addon/comment/comment.js");

require("codemirror/mode/javascript/javascript.js");
require("codemirror/mode/haskell/haskell.js");

require("./psrepl/theme.less");

// bleh jquery for console
var $ = window.jQuery = require("jquery");
require("./psrepl/jquery.console");

var events = require("pink/lib/events");
var text = require("pink/lib/text");
var emacs = require("pink/modules/editor/emacs");
var seq = require("pink/lib/seq");

function factory() {

  function REPL(slide, mode) {
    const args = slide.dataset;
    const target = slide.querySelector(".slideContainer");
    const initialCode = target.innerHTML;
    const imports = (args.import || "").split(" ").filter((s) => s.trim().length);

    this.onTabClose = () => {
      if (!this.cm.isClean()) {
        return "The current buffer has modifications.";
      }
    };

    // --- Comms

    this.evalCommand = ((line, report) => {
      this.language.evalCode(line, (msg) => {
        let out = msg.result.value;
        if (out.slice(-1) === "\n") out = out.slice(0, -1);
        report(out);
      });
    }).bind(this);

    this.loadBuffer = (() => {
      let console = this.console, cm = this.cm;
      console.report("Compiling...");
      cm.clearGutter("cm-errors");
      this.language.compile(this.cm.getDoc().getValue(), imports, (res) => {
        if (res.error) {
          let m = res.error.match(/Error at \S+ line (\d+), column (\d+):/m);
          if (m) {
            let line = parseInt(m[1], 10) - 1, col = parseInt(m[2], 10) - 1;
            let msg = res.error.split("\n").slice(1, -1);
            let marker = document.createElement("img");
            marker.title = msg;
            marker.classList.add("cm-error");
            cm.setGutterMarker(line, "cm-errors", marker);
            msg.forEach((l) => console.report(l));
            cm.getDoc().setCursor(line, col);
          } else {
            console.report(res.error);
          }
        } else {
          console.report("Module " + res.module + " compiled OK.");
        }
      });
    }).bind(this);

    this.focusConsole = () => {
      this.console.focus();
      this.console.scrollToBottom();
    };

    this.focusEditor = () => {
      this.cm.focus();
    };

    // --- keybindings

    const keymap = {};
    keymap["Ctrl-O"] = this.focusConsole.bind(this);
    // keymap["Ctrl-S"] = this.loadBuffer.bind(this);
    keymap["Ctrl-K"] = emacs.kill;
    keymap["Ctrl-Y"] = emacs.yank;
    keymap["Ctrl-A"] = "goLineStartSmart";
    keymap["Ctrl-E"] = "goLineEnd";
    keymap["Ctrl-,"] = "toggleComment";
    keymap.Tab = (cm) => cm.indentLine(cm.getDoc().getCursor().line);
    keymap["Ctrl-\\"] = (cm) => CodeMirror.showHint(cm);
    keymap["Ctrl-'"] = (cm) => {
      const cur = cm.getDoc().getCursor();
      const token = cm.getTokenAt(cur, true);
      cm.getDoc().extendSelection({line: cur.line, ch: token.start},
                                  {line: cur.line, ch: token.end});
    }
    keymap.Esc = (cm) => {
      // wow, much hack
      const input = document.createElement("input");
      input.setAttribute("type", "text");
      document.body.appendChild(input);
      input.focus();
      input.parentNode.removeChild(input);
    };

    // --- CodeMirror config

    const options = {
      value: text.cleanText(initialCode, "html"),
      mode: "text/x-haskell",
      extraKeys: keymap,
      gutters: ["cm-errors"],
      // lineNumbers: true,
      lineWrapping: false,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      theme: "haskellwiki"
    };

    // --- activate

    this.activate = () => {
      slide.classList.add("psrepl");
      target.innerHTML = "";

      this.editorFrame = document.createElement("div");
      this.editorFrame.classList.add("editorFrame");
      target.appendChild(this.editorFrame);

      this.replFrame = document.createElement("div");
      this.replFrame.classList.add("replFrame");
      target.appendChild(this.replFrame);

      this.console = $("<div class='console'>").appendTo(this.replFrame).console({
        promptLabel: "λ ",
        promptHistory: true,
        historyPreserveColumn: true,
        commandHandle: this.evalCommand,
        animateScroll: true
      });
      this.console.typer.keydown(((e) => {
        if (e.keyCode === 79 && e.ctrlKey) {
          this.focusEditor();
          e.stopPropagation();
          e.preventDefault();
        } else if (e.keyCode === 83 && e.ctrlKey) {
          this.loadBuffer();
          e.stopPropagation();
          e.preventDefault();
        }
      }).bind(this));

      this.language = new (require("./psrepl/language/purescript"))();

      this.cm = CodeMirror(this.editorFrame, options);
      this.cm.setSize("100%", "100%");
    }

    // --- stabilise

    this.stabilise = () => {
      this.cm.refresh();
      this.cleanupHandler = events.on(window, "beforeunload", this.onTabClose, this);
      this.focusKeyHandler = events.on(window, "keydown", (e) => {
        if (e.keyCode === 79 && e.ctrlKey) {
          this.focusConsole();
          e.stopPropagation();
          e.preventDefault();
        } else if (e.keyCode === 83 && e.ctrlKey) {
          this.loadBuffer();
          e.stopPropagation();
          e.preventDefault();
        }
      }, this);
    }

    // --- cleanup

    this.cleanup = () => {
      if (this.cleanupHandler) {
        events.off(window, "beforeunload", this.cleanupHandler);
        this.cleanupHandler = null;
      }
      if (this.focusKeyHandler) {
        events.off(window, "keydown", this.focusKeyHandler);
        this.focusKeyHandler = null;
      }
      this.cm = null;
      this.language.cleanup();
      this.language = null;
      target.innerHTML = initialCode;
      target.classList.remove("psrepl");
    }
  }

  return REPL;
}

module.exports = factory;
