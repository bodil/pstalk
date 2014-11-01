var Terminal = require("./term");
var events = require("events");
var util = require("util");

function left(n) {
  return n ? ("\x1b[" + n + "D") : "";
}

function right(n) {
  return n ? ("\x1b[" + n + "C") : "";
}

function save() {
  return "\x1b[s";
}

function restore() {
  return "\x1b[u";
}

function ReadLine(opts) {
  opts = opts || {};
  opts.screenKeys = false;

  this.prompt = opts.prompt || "> ";

  this.caret = 0;
  this.line = "";
  this.history = [];
  this.histPos = -1;

  this.term = new Terminal(opts);
  this.term.open();
  this.term.write(this.prompt);

  let clear = () => {
    this.term.write(left(this.caret) + " ".repeat(this.line.length) +
                    left(this.line.length));
    this.caret = 0;
    this.line = "";
  };

  let replace = (line) => {
    clear();
    this.line = line;
    this.caret = line.length;
    this.term.write(line);
  };

  this.term.on("key", (key, e) => {
    const char = key.charCodeAt(0);
    console.log("termKey", e);
    if (e.charCode >= 32) {
      this.line = this.line.slice(0, this.caret) + key
        + this.line.slice(this.caret);
      this.term.write(this.line.slice(this.caret));
      this.caret++;
      const back = (this.line.length - this.caret);
      if (back > 0) {
        this.term.write(left(back));
      }
    } else if (e.keyCode === 79 && e.ctrlKey) {
      this.emit("focusOut", null);
      e.stopPropagation();
      e.preventDefault();
    } else if (e.keyCode === 83 && e.ctrlKey) {
      this.emit("loadBuffer", null);
      e.stopPropagation();
      e.preventDefault();
    } else if (e.keyCode === 13 && !e.ctrlKey) { // enter
      this.term.write("\r\n");
      if (this.histPos !== -1) this.history.shift();
      if (this.line.trim().length) this.history.unshift(this.line);
      this.histPos = -1;
      this.emit("command", this.line);
      this.line = ""; this.caret = 0;
      this.term.write(this.prompt);
    } else if (e.keyCode == 8) { // backspace
      if (this.caret > 0) {
        const dist = this.line.length - this.caret;
        this.term.write(left(1) + this.line.slice(this.caret) +
                        " " + left(1 + dist));
        this.line = this.line.slice(0, this.caret - 1) +
          this.line.slice(this.caret);
        this.caret--;
      }
    } else if (e.keyCode == 46) { // delete
      const dist = this.line.length - this.caret;
      if (dist) {
        this.term.write(this.line.slice(this.caret + 1) +
                        " " + left(dist));
        this.line = this.line.slice(0, this.caret) +
          this.line.slice(this.caret + 1);
      }
    } else if (e.keyCode === 37 && !e.shiftKey) { // left arrow
      const caret = Math.max(0, this.caret - 1);
      if (caret !== this.caret) this.term.write(left(1));
      this.caret = caret;
    } else if (e.keyCode === 39 && !e.shiftKey) { // right arrow
      const caret = Math.min(this.line.length, this.caret + 1);
      if (caret !== this.caret) this.term.write(right(1));
      this.caret = caret;
    } else if (e.keyCode === 67 && e.ctrlKey) { // C-c
      clear();
    } else if ((e.keyCode === 65 && e.ctrlKey) || (e.keyCode === 36 && !e.shiftKey)) { // C-a / home
      this.term.write(left(this.caret));
      this.caret = 0;
    } else if ((e.keyCode === 69 && e.ctrlKey) || (e.keyCode === 35 && !e.shiftKey)) { // C-e / end
      this.term.write(right(this.line.length - this.caret));
      this.caret = this.line.length;
    } else if (e.keyCode === 75 && e.ctrlKey) { // C-k
      const dist = this.line.length - this.caret;
      this.term.write(" ".repeat(dist) + left(dist));
      this.line = this.line.slice(0, this.caret);
    } else if (e.keyCode === 38 && !e.shiftKey) { // up arrow
      if (this.histPos === -1) {
        this.history.unshift(this.line);
        this.histPos = 0;
      }
      if (this.histPos < (this.history.length - 1)) {
        this.histPos++;
        replace(this.history[this.histPos]);
      }
    } else if (e.keyCode === 40 && !e.shiftKey) { // down arrow
      if (this.histPos === 1) {
        replace(this.history.shift());
        this.histPos = -1;
      } else if (this.histPos > 1) {
        this.histPos--;
        replace(this.history[this.histPos]);
      }
    }
  });

  this.write = (data) => {
    this.term.write(left(this.caret + this.prompt.length) +
                    save() +
                    " ".repeat(this.line.length + this.prompt.length) +
                    restore());
    let lines = data.split("\n");
    if (lines[lines.length - 1].trim().length > 0) lines = lines.concat([""]);
    this.term.write(lines.join("\r\n"));
    const dist = this.line.length - this.caret;
    this.term.write(this.prompt + this.line);
    if (dist > 0) {
      this.term.write(left(dist));
    }
  };

  this.focus = () => this.term.focus();
  this.blur = () => this.term.blur();
  this.cleanup = () => this.term.destroy();
}

util.inherits(ReadLine, events.EventEmitter);

module.exports = ReadLine;
