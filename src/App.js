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
import { openDB } from "idb/with-async-ittr.js";
import { html2md, md2html } from "./useMarkDown";
import { marked } from 'marked';
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
      allnotes: [],
      pinnedNotes: [], // Store pinned notes by noteid
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
    this.handleSearchNotes = this.handleSearchNotes.bind(this);
    this.handleIndexedDB = this.handleIndexedDB.bind(this);
    this.handleCopyEvent = this.handleCopyEvent.bind(this);
    this.handleSortNotes = this.handleSortNotes.bind(this);
    this.updateCodeSyntaxHighlighting;
    this.addCopyButtons;
    this.handleCopyCodeButtonClick;
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

 // Pin a note and sort
handlePinNote = (noteid) => {
  this.setState((prevState) => {
    const pinnedNotes = [...prevState.pinnedNotes, noteid];
    return { pinnedNotes };
  }, () => {
    this.handleSortNotes(this.state.sortby);
  });
};

// Unpin a note and sort
handleUnpinNote = (noteid) => {
  this.setState((prevState) => {
    const pinnedNotes = prevState.pinnedNotes.filter(id => id !== noteid);
    return { pinnedNotes };
  }, () => {
    this.handleSortNotes(this.state.sortby);
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
    const notesArray = [...this.state.allnotes];
    const sortValue = sortby; // Directly use the passed value
  
    // Separate pinned and unpinned notes
    const pinnedNotes = notesArray.filter(note => this.state.pinnedNotes.includes(note.noteid));
    const unpinnedNotes = notesArray.filter(note => !this.state.pinnedNotes.includes(note.noteid));
  
    const sortByTitle = (a, b, order = 'asc') => {
      // Check for empty titles and sort them last
      const aTitle = a.title ? a.title.toUpperCase() : '';
      const bTitle = b.title ? b.title.toUpperCase() : '';
      
      // If a title is empty, it goes last
      if (!aTitle && bTitle) return 1; // `a` is empty, `b` isn't
      if (aTitle && !bTitle) return -1; // `b` is empty, `a` isn't
      if (!aTitle && !bTitle) return 0; // Both are empty
      
      // Normal alphabetical sorting
      return order === 'asc' ? (aTitle > bTitle ? 1 : aTitle < bTitle ? -1 : 0) : (aTitle > bTitle ? -1 : aTitle < bTitle ? 1 : 0);
    };
  
    switch (sortValue) {
      case "0": // Title: A-Z
        pinnedNotes.sort((a, b) => sortByTitle(a, b, 'asc'));
        unpinnedNotes.sort((a, b) => sortByTitle(a, b, 'asc'));
        break;
      case "1": // Title: Z-A
        pinnedNotes.sort((a, b) => sortByTitle(a, b, 'desc'));
        unpinnedNotes.sort((a, b) => sortByTitle(a, b, 'desc'));
        break;
      case "2": // Created: Newest
        pinnedNotes.sort((a, b) => b.created_at - a.created_at);
        unpinnedNotes.sort((a, b) => b.created_at - a.created_at);
        break;
      case "3": // Created: Oldest
        pinnedNotes.sort((a, b) => a.created_at - b.created_at);
        unpinnedNotes.sort((a, b) => a.created_at - b.created_at);
        break;
      case "4": // Modified: Newest
        pinnedNotes.sort((a, b) => b.updated_at - a.updated_at);
        unpinnedNotes.sort((a, b) => b.updated_at - a.updated_at);
        break;
      case "5": // Modified: Oldest
        pinnedNotes.sort((a, b) => a.updated_at - b.updated_at);
        unpinnedNotes.sort((a, b) => a.updated_at - b.updated_at);
        break;
      default:
        return;
    }
  
    // Merge the sorted lists with pinned notes on top
    const sortedNotes = [...pinnedNotes, ...unpinnedNotes];
  
    this.setState({
      sortby: sortValue,
      allnotes: sortedNotes,
    });
  
    // If there are any notes, select the first one
    if (sortedNotes.length > 0) {
      document.getElementById(sortedNotes[0].noteid).click();
    }
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
    const notebody = html2md.turndown(marked(marked(note.notebody)));
    const notetitle = document.getElementById("notetitle").value;
    this.setState((prevState) => {
      const updatedNotes = prevState.allnotes.map((noteitem) => {
        if (noteitem.noteid === note.noteid) {
          noteitem.title = notetitle;
          noteitem.body = notebody;
          noteitem.activepage = "viewnote";
        }
        return noteitem;
      });
      return {
        noteid: note.noteid,
        notetitle: notetitle,
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
        notetitle: notetitle,
        notebody: notebody,
        activepage: "viewnote",
        created_at: Date.now(),
        updated_at: Date.now(),
        action: note.action,
      });
      // Update IndexedDB
      this.handleIndexedDB("addnote", {
        noteid: note.noteid,
        title: notetitle,
        body: notebody,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    } else {
      // if note.action == "editnote"
      this.handleIndexedDB("update", {
        noteid: note.noteid,
        title: notetitle,
        body: notebody,
        updated_at: Date.now(),
      });
    }
  }

  handleCopyEvent(e, copiedContent = "") {
    if (copiedContent) {
      return navigator.clipboard
        .writeText(copiedContent)
        .then(() => {
          // Success!
        })
        .catch((err) => {
          console.log("Something went wrong", err);
        });
    }
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
    navigator.clipboard
      .writeText(html2md.turndown(copiedContent))
      .then(() => {
        // Success!
      })
      .catch((err) => {
        console.log("Something went wrong", err);
      });
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
    if (this.state.activepage === "editnote") {
      return;
    } else {
      DisplayList.length > 0 && DisplayList[0].click();
    }
  }

  handleDownloadNote(note) {
    const title = `${note.notetitle.replace(/[^A-Z0-9]+/gi, "_") || "note"}.md`;
    var blob = new Blob([note.notebody], {
      type: "text/plain;charset=utf-8",
    });
    saveAs(blob, title);
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

  render() {
    const noteListItems = this.state.allnotes.map((note) => (
      <NoteList
        key={note.noteid}
        note={note}
        isPinned={this.state.pinnedNotes.includes(note.noteid)}
        handlePinNote={this.handlePinNote}
        handleUnpinNote={this.handleUnpinNote}
        handleNoteListItemClick={this.handleNoteListItemClick}
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
          handleCopyEvent={this.handleCopyEvent}
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
          handleClickHomeBtn={this.handleClickHomeBtn}
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
