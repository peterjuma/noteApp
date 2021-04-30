import React, { Component, Fragment } from "react";
import NavbarSidebar from "./NavbarSidebar";
import NoteSort from "./NoteSort";
import NavbarMain from "./NavbarMain";
import NoteList from "./NoteList";
import NoteMain from "./NoteMain";
import readmePath from "./README.md";
import NoteEditor from "./NoteEditor";
import FooterBar from "./FooterBar";
import hljs from "highlight.js";
import keyCodes from "./KeyCodes";
import { openDB } from "idb/with-async-ittr.js";
import { html2md, md2html } from "./useMarkDown";
import marked from "marked";
import { saveAs } from "file-saver";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      noteid: "",
      notetitle: "",
      notebody: "",
      activepage: "viewnote", // editnote // previewnote // viewnote
      action: "", // addnote // updatenote
      sortby: "4", //"0" - Title: A-Z, "1" - Title: Z-A, "2" - Created: Newest, "3" - Created: Oldest, "4" - Modified: Newest, "5" - Modified: Oldest
      split: false, //
      allnotes: [],
    };
    this.handleNoteListItemClick = this.handleNoteListItemClick.bind(this);
    this.handleClickHomeBtn = this.handleClickHomeBtn.bind(this);
    this.handleNoteListItemMouseOver = this.handleNoteListItemMouseOver.bind(
      this
    );
    this.handleEditNoteBtn = this.handleEditNoteBtn.bind(this);
    this.handleSaveNote = this.handleSaveNote.bind(this);
    this.handleDeleteNote = this.handleDeleteNote.bind(this);
    this.handleDownloadNote = this.handleDownloadNote.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
    this.processInput = this.processInput.bind(this);
    this.handleKeyEvent = this.handleKeyEvent.bind(this);
    this.setSelectionRange = this.setSelectionRange.bind(this);
    this.handleSearchNotes = this.handleSearchNotes.bind(this);
    this.handleIndexedDB = this.handleIndexedDB.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleCopyNote = this.handleCopyNote.bind(this);
    this.handleCopyEvent = this.handleCopyEvent.bind(this);
    this.handleSortNotes = this.handleSortNotes.bind(this);
    this.updateCodeSyntaxHighlighting;
    this.addCopyButtons;
    this.handleCopyCodeButtonClick;
    this.handleSplitScreen = this.handleSplitScreen.bind(this);
    this.handleNoteEditor = this.handleNoteEditor.bind(this);
    this.handleNotesBackup = this.handleNotesBackup.bind(this);
  }

  async componentDidMount() {
    const getnotes = await this.handleIndexedDB("getall");
    if (getnotes.length == 0) {
      this.handleClickHomeBtn();
    } else {
      this.setState({
        allnotes: getnotes,
      });
      document.getElementById(getnotes[0].noteid).click();
    }
    this.updateCodeSyntaxHighlighting();
    this.handleCopyCodeButtonClick();
  }

  componentDidUpdate() {
    this.updateCodeSyntaxHighlighting();
    this.handleCopyCodeButtonClick();
  }

  updateCodeSyntaxHighlighting = () => {
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  };

  handleCopyCodeButtonClick = () => {
    if (navigator && navigator.clipboard) {
      this.addCopyButtons(navigator.clipboard);
    } else {
      var script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/clipboard-polyfill/2.7.0/clipboard-polyfill.promise.js";
      script.integrity = "sha256-waClS2re9NUbXRsryKoof+F9qc1gjjIhc2eT7ZbIv94=";
      script.crossOrigin = "anonymous";
      script.onload = function () {
        this.addCopyButtons(clipboard);
      };
      document.body.appendChild(script);
    }
  };

  addCopyButtons = (clipboard) => {
    const codeBlockElems = document.querySelectorAll("pre code");

    if (codeBlockElems.length === 0) {
      return;
    }
    codeBlockElems.forEach(function (codeBlock) {
      var pre = codeBlock.parentNode;
      var prevElem = pre.previousElementSibling;

      if (prevElem && prevElem.type === "button") {
        return;
      }
      var button = document.createElement("button");
      button.className = "copy-code-button";
      button.setAttribute("id", "copy-code-button");
      button.type = "button";
      button.innerText = "Copy";

      button.addEventListener("click", function () {
        clipboard.writeText(codeBlock.innerText).then(
          function () {
            /* Chrome doesn't seem to blur automatically,
                   leaving the button in a focused state. */
            button.blur();
            button.innerText = "Copied!";
            setTimeout(function () {
              button.innerText = "Copy";
            }, 2000);
          },
          function (error) {
            button.innerText = "Error";
          }
        );
      });

      if (pre.parentNode.classList.contains("highlight")) {
        var highlight = pre.parentNode;
        highlight.parentNode.insertBefore(button, highlight);
      } else {
        pre.parentNode.insertBefore(button, pre);
      }
    });
  };

  // Indexed DB class
  async handleIndexedDB(cmd = "", note = "") {
    const db = await openDB("notesdb", 1, {
      upgrade(db) {
        // Create a store of objects
        const store = db.createObjectStore("notes", {
          // The 'noteid' property of the object will be the key.
          keyPath: "noteid",
          // If it isn't explicitly set, create a value by auto incrementing.
          autoIncrement: true,
        });
        // Create an index on all fields of the objects.
        store.createIndex("created_at", "created_at");
        store.createIndex("noteid", "noteid");
      },
    });
    // 1. Create single note
    if (cmd === "addnote") {
      await db.add("notes", note);
    }
    // 2.1 Read all notes
    if (cmd === "getall") {
      let notes = await db.getAll("notes");
      return notes;
    }
    // 2.2 Read single note
    if (cmd === "getone") {
      const db = await openDB("notesdb", 1);
      const tx = db.transaction("notes");
      const idx = tx.store.index("noteid");
      let onenote = await idx.get(note);
      return onenote;
    }
    // 3. Update single note
    if (cmd === "update") {
      const db = await openDB("notesdb", 1);
      db.put("notes", note);
    }
    // 4. Delete single note
    if (cmd === "delete") {
      const db = await openDB("notesdb", 1);
      db.delete("notes", note.noteid);
    }
    db.close();
  }

  // Handle Click List Item
  handleNoteListItemClick = (e, note) => {
    this.setState({
      noteid: note.noteid,
      notetitle: note.title,
      notebody: note.body,
      activepage: "viewnote",
      action: "",
    });
    // Toggle note-clikced class
    var noteList = document.querySelectorAll(".note-list-item-clicked");
    noteList.length > 0
      ? noteList.forEach((b) => b.classList.remove("note-list-item-clicked"))
      : "";
    document
      .getElementById(note.noteid)
      .classList.add("note-list-item-clicked");
  };

  // Handle Mouse Hover on List item
  handleNoteListItemMouseOver = (e, note) => {
    var noteList = document.querySelectorAll(".note-list-item-hover");
    noteList.length > 0
      ? noteList.forEach((b) => b.classList.remove("note-list-item-hover"))
      : "";
    document.getElementById(note.noteid).classList.add("note-list-item-hover");
  };
  handleNoteListItemMouseOut = () => {
    var noteList = document.querySelectorAll(".note-list-item-hover");
    noteList.length > 0
      ? noteList.forEach((b) => b.classList.remove("note-list-item-hover"))
      : "";
  };

  // Handle click home button
  handleClickHomeBtn = (e) => {
    fetch(readmePath)
      .then((response) => {
        return response.text();
      })
      .then((readmetext) => {
        var readmetitle = readmetext.split("\n", 1)[0];
        var body = readmetext.split("\n");
        body.splice(0, 1);
        var readmebody = body.join("\n");
        this.setState({
          noteid: "00000000",
          notetitle: readmetitle,
          notebody: readmebody,
          activepage: "viewnote",
          action: "homepage",
        });
      });
  };

  handleSortNotes = (sortby) => {
    // "0" - Title: A-Z, "1" - Title: Z-A, "2" - Created: Newest, "3" - Created: Oldest, "4" - Modified: Newest, "5" - Modified: Oldest
    var notesArray = [...this.state.allnotes];
    var sortvalue = event ? event.target.value : sortby;
    switch (sortvalue) {
      case "0":
        notesArray.sort(function (a, b) {
          let x = a.title.toUpperCase(),
            y = b.title.toUpperCase();
          return x == y ? 0 : x > y ? 1 : -1;
        });
        break;
      case "1":
        notesArray.sort(function (a, b) {
          let x = a.title.toUpperCase(),
            y = b.title.toUpperCase();
          return x == y ? 0 : x > y ? -1 : 1;
        });
        break;
      case "2":
        notesArray.sort((a, b) => b.created_at - a.created_at);
        break;
      case "3":
        notesArray.sort((a, b) => a.created_at - b.created_at);
        break;
      case "4":
        notesArray.sort((a, b) => b.updated_at - a.updated_at);
        break;
      case "5":
        notesArray.sort((a, b) => a.updated_at - b.updated_at);
        break;
      default:
    }
    this.setState({
      sortby: sortvalue,
      allnotes: notesArray,
    });
    document.getElementById(notesArray[0].noteid).click();
  };

  handleCancel = (e, note) => {
    if (note.action === "updatenote") {
      return document.getElementById(note.noteid).click();
    }
    if (document.querySelectorAll(".note-list-item").length > 0) {
      return document.querySelectorAll(".note-list-item")[0].click();
    }
    return this.handleClickHomeBtn();
  };
  handleEditNoteBtn = (e, note) => {
    this.setState({
      noteid: note.noteid,
      notetitle: note.notetitle,
      notebody: note.notebody,
      activepage: "editnote",
      action: e.target.dataset.action,
    });
    if (e.target.dataset.action === "addnote") {
      var noteList = document.querySelector(".note-list-item-clicked");
      noteList && noteList.classList.remove("note-list-item-clicked");
    }
  };

  handleNoteEditor = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  };

  handleDeleteNote(e, note) {
    var index = this.state.allnotes.findIndex(
      (noteitem) => noteitem.noteid === note.noteid
    );
    this.setState((prevState) => {
      var updatedNotes = prevState.allnotes.filter((noteitem) => {
        if (noteitem.noteid !== note.noteid) {
          return noteitem;
        }
      });
      return {
        allnotes: updatedNotes,
      };
    });
    this.handleIndexedDB("delete", note);
    if (this.state.allnotes.length - 1 == 0) {
      this.handleClickHomeBtn();
    } else {
      var nextnote = this.state.allnotes[index + 1]
        ? this.state.allnotes[index + 1]
        : this.state.allnotes[index - 1];
      this.handleNoteListItemClick("", nextnote);
    }
  }

  handleSaveNote(e, note) {
    var notebody = html2md.turndown(marked(marked(this.state.notebody)));
    this.setState((prevState) => {
      const updatedNotes = prevState.allnotes.map((noteitem) => {
        if (noteitem.noteid === note.noteid) {
          noteitem.title = document.getElementById("notetitle").value;
          noteitem.body = notebody;
          noteitem.activepage = "viewnote";
        }
        return noteitem;
      });
      return {
        noteid: note.noteid,
        notetitle: document.getElementById("notetitle").value,
        notebody: notebody,
        activepage: "viewnote",
        action: note.action,
        allnotes: updatedNotes,
      };
    });
    // Update List View
    if (note.action == "addnote") {
      this.state.allnotes.push({
        noteid: note.noteid,
        notetitle: document.getElementById("notetitle").value,
        notebody: notebody,
        activepage: "viewnote",
        created_at: Date.now(),
        updated_at: Date.now(),
        action: note.action,
      });
      // Update IndexedDB
      this.handleIndexedDB("addnote", {
        noteid: note.noteid,
        title: document.getElementById("notetitle").value,
        body: notebody,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    } else {
      // if note.action == "editnote"
      this.handleIndexedDB("update", {
        noteid: note.noteid,
        title: document.getElementById("notetitle").value,
        body: notebody,
        updated_at: Date.now(),
      });
    }
  }

  handlePaste(e) {
    // Prevent the default action
    e.preventDefault();
    if (e.clipboardData) {
      // Get the copied text from the clipboard
      const text = e.clipboardData
        ? (e.originalEvent || e).clipboardData.getData("text/plain")
        : // For IE
        window.clipboardData
        ? window.clipboardData.getData("Text")
        : "";
      // Get the copied text from the clipboard
      const html = e.clipboardData
        ? (e.originalEvent || e).clipboardData.getData("text/html")
        : // For IE
        window.clipboardData
        ? window.clipboardData.getData("Html")
        : "";
      let pasteData;
      if (html) {
        // console.log(html);
        html2md.keep(["pre", "code"]);
        pasteData = html2md.turndown(html);
      } else {
        /<[a-z][\s\S]*>/i.test(text)
          ? (pasteData = html2md.turndown(marked(text)))
          : (pasteData = text);
      }
      if (document.queryCommandSupported("insertText")) {
        document.execCommand("insertText", false, pasteData);
      } else {
        // Insert text at the current position of caret
        const range = document.processInputection().getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(pasteData);
        range.insertNode(textNode);
        range.selectNodeContents(textNode);
        range.collapse(false);
        const selection = window.processInputection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  handleCopyNote(e, content) {
    var textArea = document.createElement("textarea");
    // Place in top-left corner of screen regardless of scroll position.
    textArea.style.position = "fixed";
    textArea.style.top = 0;
    textArea.style.left = 0;
    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0;
    // Clean up any borders.
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    // Avoid flash of white box if rendered for any reason.
    textArea.style.background = "transparent";
    textArea.value =
      typeof content === "object"
        ? `## ${content.notetitle}\n${content.notebody}`
        : content;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      var successful = document.execCommand("copy");
    } catch (err) {
      console.log("Oops, unable to copy");
    }
    document.body.removeChild(textArea);
  }

  handleCopyEvent(e) {
    e.preventDefault();
    var copiedContent = "";
    if (typeof window.getSelection != "undefined") {
      var sel = window.getSelection();
      if (sel.rangeCount) {
        var container = document.createElement("div");
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
          container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        copiedContent = container.innerHTML;
      }
    } else if (typeof document.selection != "undefined") {
      if (document.selection.type == "Text") {
        copiedContent = document.selection.createRange().htmlText;
      }
    }
    this.handleCopyNote("", html2md.turndown(copiedContent));
  }

  handleKeyEvent(event) {
    if (event.code === "Tab") {
      this.processInput("tab");
      event.preventDefault();
    } else if (event.key === '"') {
      this.processInput("doublequote");
      event.preventDefault();
    } else if (event.key === "(") {
      this.processInput("brackets");
      event.preventDefault();
    } else if (event.key === "{") {
      this.processInput("curlybrackets");
      event.preventDefault();
    } else if (event.key === "[") {
      this.processInput("squarebrackets");
      event.preventDefault();
    } else if (event.key === "<") {
      this.processInput("anglebrackets");
      event.preventDefault();
    } else if (event.key === "`") {
      this.processInput("backticks");
      event.preventDefault();
    } else if (event.ctrlKey && event.code === "KeyB") {
      this.processInput("bold");
    } else if (event.ctrlKey && event.code === "KeyI") {
      this.processInput("italic");
    } else if (event.ctrlKey && event.code === "KeyL") {
      this.processInput("link");
    }
  }

  processInput(eventcode) {
    // obtain the object reference for the textarea>
    var txtarea = document.querySelector("textarea");
    // obtain the index of the first selected character
    var start = txtarea.selectionStart;
    // obtain the index of the last selected character
    var finish = txtarea.selectionEnd;
    //obtain all Text
    var allText = txtarea.value;
    // obtain the selected text
    var sel = allText.substring(start, finish);
    var img = `![alt text](${sel})`;
    var link = `[link](${sel})`;
    keyCodes["image"].pattern = img;
    keyCodes["link"].pattern = link;
    var keyCode = keyCodes[eventcode];
    if (keyCode.regEx) {
      var transsel = "";
      var match = /\r|\n/.exec(sel);
      if (match) {
        var lines = sel.split("\n");
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].length > 0 && lines[i] !== undefined) {
            transsel += `${keyCode.pattern} ${lines[i]}\n`;
          }
        }
        sel = transsel;
      } else {
        sel = sel.replace(/^/gm, `${keyCode.pattern} `);
      }
      var newText = `${allText.substring(0, start)}${sel}${allText.substring(
        finish,
        allText.length
      )}`;
      if (newText) {
        // txtarea.value = newText;
        this.setState({
          notebody: newText,
        });
        if (eventcode === "tab") {
          this.setSelectionRange(
            txtarea,
            start + sel.length,
            start + sel.length
          );
        } else {
          this.setSelectionRange(
            txtarea,
            start + keyCode.offsetStart,
            start + keyCode.offsetStart
          );
        }
      }
    } else {
      if (keyCode.pattern !== "") {
        if (eventcode == "image" || eventcode == "link") {
          var newText = `${allText.substring(0, start)}${
            keyCode.pattern
          }${allText.substring(finish, allText.length)}`;
        } else {
          var newText = `${allText.substring(0, start)}${sel}${
            keyCode.pattern
          }${allText.substring(finish, allText.length)}`;
        }
      } else {
        var newText = `${allText.substring(0, start)}${keyCode.open}${sel}${
          keyCode.close
        }${allText.substring(finish, allText.length)}`;
      }
      if (newText) {
        // txtarea.value = newText;
        this.setState({
          notebody: newText,
        });
        this.setSelectionRange(
          txtarea,
          start + keyCode.offsetStart,
          finish + keyCode.offsetEnd
        );
      }
    }
  }

  setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
      input.setSelectionRange(selectionStart, selectionEnd);
    } else if (input.createTextRange) {
      var range = input.createTextRange();
      range.collapse(true);
      range.moveEnd("character", selectionEnd);
      range.moveStart("character", selectionStart);
      range.select();
    }
    input.blur();
    input.focus();
  }

  handleSearchNotes(e) {
    var noteList = document.querySelectorAll(".note-list-item");
    var searchString = e.target.value.toUpperCase();
    var DisplayList = [];
    for (var i = 0; i < noteList.length; i++) {
      var title = noteList[i].innerText;
      var index = title.toUpperCase().indexOf(searchString);
      if (index > -1) {
        noteList[i].style.display = "";
        DisplayList.push(noteList[i]);
      } else {
        noteList[i].style.display = "none";
      }
    }
    DisplayList.length > 0 && DisplayList[0].click();
  }

  handleDownloadNote(e) {
    const html = document.getElementById("notebody-view").innerHTML;
    const data = html2md.turndown(marked(html));
    const title = html2md
      .turndown(marked(document.getElementById("notetitle-view").innerHTML))
      .replace(/ /g, "_");
    const fileName = `${title || "note"}.md`;
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var blob = new Blob([data], { type: "text/plain;charset=utf-8" }),
      url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    e.preventDefault();
  }

  handleNotesBackup() {
    const zip = require("jszip")();
    this.state.allnotes.map((note) => {
      const title = `${note.title.replace(/[^A-Z0-9]+/gi, "_") || "note"}.md`;
      zip.file(title, note.body);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "notes_backup.zip");
    });
  }

  handleSplitScreen() {
    this.setState((prevState) => ({
      split: !prevState.split,
    }));
  }

  render() {
    const noteListItems = this.state.allnotes.map((note) => (
      <NoteList
        key={note.noteid}
        note={note}
        handleClick={this.handleNoteListItemClick}
        handleMouseOver={this.handleNoteListItemMouseOver}
        handleMouseOut={this.handleNoteListItemMouseOut}
      />
    ));

    let ActivePage, RightNavbar;
    if (this.state.activepage === "viewnote") {
      RightNavbar = (
        <NavbarMain
          display={this.state.action !== "homepage" && true}
          notesData={{
            noteid: this.state.noteid,
            notetitle: this.state.notetitle,
            notebody: this.state.notebody,
            action: this.state.action,
          }}
          handleEditNoteBtn={this.handleEditNoteBtn}
          handleDeleteNote={this.handleDeleteNote}
          handleCopyNote={this.handleCopyNote}
          handleDownloadNote={this.handleDownloadNote}
        />
      );
      ActivePage = (
        <>
          <NoteMain
            notesData={{
              noteid: this.state.noteid,
              notetitle: this.state.notetitle,
              notebody: this.state.notebody,
              action: this.state.action,
            }}
            handleCopyEvent={this.handleCopyEvent}
          />
          <FooterBar />
        </>
      );
    }
    if (this.state.activepage === "editnote") {
      RightNavbar = <NavbarMain display={false} />;
      ActivePage = (
        <NoteEditor
          editNoteData={{
            noteid: this.state.noteid,
            notetitle: this.state.notetitle,
            notebody: this.state.notebody,
            action: this.state.action,
          }}
          splitscreen={this.state.split}
          handleEditNoteBtn={this.handleEditNoteBtn}
          handleSaveNote={this.handleSaveNote}
          handlePaste={this.handlePaste}
          handleKeyEvent={this.handleKeyEvent}
          processInput={this.processInput}
          handleCancel={this.handleCancel}
          handleImageUpload={this.handleImageUpload}
          handleSplitScreen={this.handleSplitScreen}
          handleNoteEditor={this.handleNoteEditor}
        />
      );
    }

    return (
      <div className="container">
        <div className="left">
          <NavbarSidebar
            handleClickHomeBtn={this.handleClickHomeBtn}
            handleEditNoteBtn={this.handleEditNoteBtn}
            handleSearchNotes={this.handleSearchNotes}
          />
          <ul className="note-list">{noteListItems}</ul>
          <NoteSort
            handleSortNotes={this.handleSortNotes}
            handleNotesBackup={this.handleNotesBackup}
          />
        </div>
        <div className="right">
          {RightNavbar}
          {ActivePage}
        </div>
      </div>
    );
  }
}

export default App;
