import React, { Component, Fragment } from "react";
import NavbarSidebar from "./NavbarSidebar";
import NoteSort from "./NoteSort";
import NavbarMain from "./NavbarMain";
import NoteList from "./NoteList";
import NoteMain from "./NoteMain";
import readmePath from "./README.md";
import NoteEditor from "./NoteEditor";
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
      filteredNotes: [],
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
    this.debouncedSearch = this.debounce(this.handleSearchNotes, 250);
    this.handleIndexedDB = this.handleIndexedDB.bind(this);
    this.handleCopyEvent = this.handleCopyEvent.bind(this);
    this.handleSortNotes = this.handleSortNotes.bind(this);
    this.updateCodeSyntaxHighlighting;
    this.addCopyButtons;
    this.handleCopyCodeButtonClick;
    this.handleNoteEditor = this.handleNoteEditor.bind(this);
    this.handleNotesBackup = this.handleNotesBackup.bind(this);
    this.handleNotesUpload = this.handleNotesUpload.bind(this);
  }
  
  async componentDidMount() {
    const getnotes = await this.handleIndexedDB("getall");
    const pinnedNotes = await this.handleIndexedDB("getallpins");
    this.setState({
      allnotes: getnotes,
      pinnedNotes: pinnedNotes || [],
    }, () => {

      // Display the home page if there are no notes
      if (this.state.allnotes.length === 0) {
        this.handleClickHomeBtn();
        return;
      } 
      // Sort notes by the default sort order
      this.handleSortNotes(this.state.sortby); 
    });

    console.log("Current State:", this.state);
  
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

// Pin a note and persist
handlePinNote = async (noteid) => {
  if (this.state.pinnedNotes.length >= 5) {
      alert("You can only pin up to 5 notes.");
      return;
  }
  await this.handleIndexedDB("addpin", { noteid });
  this.setState((prevState) => ({
      pinnedNotes: [...prevState.pinnedNotes, noteid]
  }), () => {
      this.handleSortNotes(this.state.sortby); // Re-sort notes after pinning
      const element = document.getElementById(noteid);
      if (element) {
          element.click(); // Simulate a click on the newly pinned note
      }
  });
};



// Unpin a note and persist
handleUnpinNote = async (noteid) => {
  await this.handleIndexedDB("removepin", { noteid });
  this.setState((prevState) => {
    const pinnedNotes = prevState.pinnedNotes.filter(id => id !== noteid);
    return { pinnedNotes };
  }, () => {
    this.handleSortNotes(this.state.sortby);
    document.getElementById(noteid).click();
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
    const dbVersion = 2; // Increment the version from your existing version
    const db = await openDB("notesdb", dbVersion, {
      upgrade(db) {
        // Create the 'notes' store if it doesn't exist
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore("notes", {
            keyPath: "noteid",
            autoIncrement: true,
          });
          store.createIndex("created_at", "created_at");
          store.createIndex("noteid", "noteid");
        }
        
        // Create the 'pinnedNotes' store if it doesn't exist
        if (!db.objectStoreNames.contains('pinnedNotes')) {
          db.createObjectStore("pinnedNotes", { keyPath: "noteid" });
        }
      },
    });
    
    // Notes operations (existing code)
    if (cmd === "addnote") await db.add("notes", note);
    if (cmd === "getall") return await db.getAll("notes");
    if (cmd === "getone") return await db.get("notes", note.noteid);
    if (cmd === "update") await db.put("notes", note);
    if (cmd === "delete") await db.delete("notes", note.noteid);
  
    // Pinned notes operations
    if (cmd === "addpin") await db.put("pinnedNotes", { noteid: note.noteid });
    if (cmd === "removepin") await db.delete("pinnedNotes", note.noteid);
    if (cmd === "getallpins") {
      const pins = await db.getAll("pinnedNotes");
      return pins.map(pin => pin.noteid);
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
    }, () => {
        // This callback ensures that the state update has completed.
        const element = document.getElementById(note.noteid);
        if (element) {
            document.querySelectorAll(".note-list-item-clicked").forEach(el => {
                el.classList.remove("note-list-item-clicked");
            });
            element.classList.add("note-list-item-clicked");
        } else {
            console.log("Note element not found, might be due to filtering or it is unpinned.");
        }
    });
};

    
  // Handle Mouse Hover on List item
  handleNoteListItemMouseOver = (e, note) => {
    const elementId = note.noteid;  // Ensure the note ID exists and is correct
    const element = document.getElementById(elementId);
    if (element) {
        document.querySelectorAll(".note-list-item-hover").forEach(el => {
            el.classList.remove("note-list-item-hover");
        });
        element.classList.add("note-list-item-hover");
    } else {
        console.log("Note element with ID:", elementId, "not found.");
    }
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
    // If action is addnote or updatenote, do not select any note
    if (sortedNotes.length > 0 && this.state.action !== "addnote" && this.state.action !== "updatenote") {
      this.handleNoteListItemClick(null, sortedNotes[0]);
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
    const noteHTML = marked(note.notebody);
    const noteMarkdown = html2md.turndown(noteHTML);
    const notetitle = document.getElementById("notetitle").value;
    this.setState((prevState) => {
      const updatedNotes = prevState.allnotes.map((noteitem) => {
        if (noteitem.noteid === note.noteid) {
          noteitem.title = notetitle;
          noteitem.body = noteMarkdown;
          noteitem.activepage = "viewnote";
        }
        return noteitem;
      });
      return {
        noteid: note.noteid,
        notetitle: notetitle,
        notebody: noteMarkdown,
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
        notebody: noteMarkdown,
        activepage: "viewnote",
        created_at: Date.now(),
        updated_at: Date.now(),
        action: note.action,
      });
      // Update IndexedDB
      this.handleIndexedDB("addnote", {
        noteid: note.noteid,
        title: notetitle,
        body: noteMarkdown,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    } else {
      // if note.action == "editnote"
      this.handleIndexedDB("update", {
        noteid: note.noteid,
        title: notetitle,
        body: noteMarkdown,
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

  debounce(func, wait, immediate) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
  }

  handleSearchNotes(e) {
    const searchString = e.target.value.toLowerCase();
    const searchQuery = searchString.replace(/^(title:|body:)/, '').trim();

    if (!searchQuery) {
        // If the search query is empty, reset to show all notes
        this.setState({ filteredNotes: [] });
        return;
    }

    const field = searchString.startsWith('title:') ? 'title' : 
                  searchString.startsWith('body:') ? 'body' : 'title';

    const searchWords = searchQuery.split(/\s+/); // Split the search query into words

    const filteredNotes = this.state.allnotes.filter(note => {
        const contentToSearch = (field === 'title' ? note.title : note.body || '').toLowerCase();
        return searchWords.every(word => contentToSearch.includes(word)); // Check if all words are present
    });

    this.setState({ filteredNotes });
    if (filteredNotes.length === 1) {
        this.handleNoteListItemClick(null, filteredNotes[0]);
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

  handleNotesUpload = async (event) => {
    const file = event.target.files[0]; // Assuming single file selection
    if (!file || !file.name.endsWith(".md")) {
      alert("Please upload a valid Markdown file.");
      return;
    }
  
    // Read the file content
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const title = file.name.replace(".md", ""); // Use filename without extension as the title
  
      const newNote = {
        noteid: new Date().getTime().toString(), // Generate a unique note ID
        title,
        body: content,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
  
      // Add note to IndexedDB
      await this.handleIndexedDB("addnote", newNote);
  
      // Add note to the state
      this.setState(prevState => ({
        ...prevState,
        allnotes: [...prevState.allnotes, newNote]
    }), () => {
        // Now that the state is updated, perform actions that depend on the updated state
        this.handleSortNotes("4");
    });
      this.handleNoteListItemClick(null, newNote);
    };
    reader.readAsText(file);
  };
  

  render() {
    // Separate pinned and unpinned notes
    // const pinnedNotes = this.state.allnotes.filter(note => this.state.pinnedNotes.includes(note.noteid));
    // const unpinnedNotes = this.state.allnotes.filter(note => !this.state.pinnedNotes.includes(note.noteid));

    const { allnotes, pinnedNotes, filteredNotes } = this.state;
    

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
          handleSortNotes={this.handleSortNotes}
          handleNoteListItemClick={this.handleNoteListItemClick}
        />
      );
    }

    // Use a unified source of truth for notes to display
    const displayNotes = filteredNotes.length > 0 ? filteredNotes : allnotes;

    let filteredPinnedNotes = displayNotes.filter(note => pinnedNotes.includes(note.noteid));
    let filteredUnpinnedNotes = displayNotes.filter(note => !pinnedNotes.includes(note.noteid));

        // Count the total number of notes
    const totalPinned = filteredPinnedNotes.length;
    const totalUnpinned = filteredUnpinnedNotes.length;
    

    let pinnedNoteListItems = (
        <>
            {filteredPinnedNotes.map((note) => (
                <NoteList
                    key={note.noteid}
                    note={note}
                    isPinned={true}
                    handlePinNote={this.handlePinNote}
                    handleUnpinNote={this.handleUnpinNote}
                    handleNoteListItemClick={this.handleNoteListItemClick}
                    handleMouseOver={this.handleNoteListItemMouseOver}
                    handleMouseOut={this.handleNoteListItemMouseOut}
                />
            ))}
        </>
    );

    let otherNoteListItems = (
        <>
            {filteredUnpinnedNotes.map((note) => (
                <NoteList
                    key={note.noteid}
                    note={note}
                    isPinned={false}
                    handlePinNote={this.handlePinNote}
                    handleUnpinNote={this.handleUnpinNote}
                    handleNoteListItemClick={this.handleNoteListItemClick}
                    handleMouseOver={this.handleNoteListItemMouseOver}
                    handleMouseOut={this.handleNoteListItemMouseOut}
                />
            ))}
        </>
    );


    return (
      <div className="container">
        <div className="left">
          <NavbarSidebar
            handleClickHomeBtn={this.handleClickHomeBtn}
            handleEditNoteBtn={this.handleEditNoteBtn}
            handleSearchNotes={this.handleSearchNotes}
          />

          <h4 className="fixed-header">Pinned Notes ({totalPinned})</h4>
          <div className="note-list-pin">
          {pinnedNoteListItems}
          </div>

          <h4 className="fixed-header">Other Notes ({totalUnpinned})</h4>
          <div className="note-list-other">
          {otherNoteListItems}
          </div>

          <NoteSort
            handleSortNotes={this.handleSortNotes}
            handleNotesBackup={this.handleNotesBackup}
            handleNotesUpload={this.handleNotesUpload}
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