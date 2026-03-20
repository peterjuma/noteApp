import { Component } from "react";
import NavbarSidebar from "./NavbarSidebar";
import NoteSort from "./NoteSort";
import NavbarMain from "./NavbarMain";
import NoteList from "./NoteList";
import NoteMain from "./NoteMain";
import readmePath from "./README.md";
import NoteEditor from "./NoteEditor";
import ConfirmDialog from "./ConfirmDialog";
import hljs from "highlight.js";
import { html2md, md2html } from "./useMarkDown";
import { saveAs } from "file-saver";
import * as db from "./services/notesDB";
import { Menu } from "lucide-react";

// Slugify a note title for URL hash
function slugify(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      noteid: "",
      notetitle: "",
      notebody: "",
      activepage: "viewnote",
      action: "",
      sortby: "4",
      allnotes: [],
      filteredNotes: [],
      pinnedNotes: [],
      darkMode: localStorage.getItem("noteapp_dark_mode") === "true",
      activeDb: db.getActiveWorkspace(),
      workspaces: db.getWorkspaces(),
      sidebarOpen: false,
      sidebarWidth: parseInt(localStorage.getItem("noteapp_sidebar_width")) || 260,
      pendingNav: null,
      showNavConfirm: false,
      dialog: null,  // { title, message, confirmText, cancelText, danger, onConfirm, onCancel }
    };
    this.handleSaveNote = this.handleSaveNote.bind(this);
    this.handleDownloadNote = this.handleDownloadNote.bind(this);
    this.handleSearchNotes = this.handleSearchNotes.bind(this);
    this.debouncedSearch = this.debounce(this.handleSearchNotes, 250);
    this.handleCopyEvent = this.handleCopyEvent.bind(this);
    this.handleSortNotes = this.handleSortNotes.bind(this);
    this.handleNoteEditor = this.handleNoteEditor.bind(this);
    this.handleNotesBackup = this.handleNotesBackup.bind(this);
    this.handleNotesUpload = this.handleNotesUpload.bind(this);
  }
  
  async componentDidMount() {
    const getnotes = await db.getAllNotes(this.state.activeDb);
    const pinnedNotes = await db.getAllPins(this.state.activeDb);
    this.setState({
      allnotes: getnotes,
      pinnedNotes: pinnedNotes || [],
    }, () => {
      if (this.state.allnotes.length === 0) {
        this.handleClickHomeBtn();
        return;
      }
      this.handleSortNotes(this.state.sortby);

      // Navigate to note from URL hash on initial load
      this.navigateFromHash();
    });

    // Listen for browser back/forward
    window.addEventListener("hashchange", this.handleHashChange);

    this.updateCodeSyntaxHighlighting();
    this.handleCopyCodeButtonClick();
  }

  componentWillUnmount() {
    window.removeEventListener("hashchange", this.handleHashChange);
  }
    
  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.notebody !== this.state.notebody ||
      prevState.activepage !== this.state.activepage
    ) {
      this.updateCodeSyntaxHighlighting();
      this.handleCopyCodeButtonClick();
    }
  }

  updateCodeSyntaxHighlighting = () => {
    document.querySelectorAll("pre code").forEach((block) => {
      if (block.classList.contains("language-mermaid")) return;
      hljs.highlightElement(block);
    });
  };

// Pin a note and persist
handlePinNote = async (noteid) => {
  if (this.state.pinnedNotes.includes(noteid)) return; // Already pinned
  if (this.state.pinnedNotes.length >= 10) {
      this.showAlert("Pin Limit", "You can only pin up to 10 notes.");
      return;
  }
  await db.addPin(noteid, this.state.activeDb);
  this.setState((prevState) => ({
      pinnedNotes: [...prevState.pinnedNotes, noteid]
  }), () => {
      this.handleSortNotes(this.state.sortby);
  });
};

// Unpin a note and persist
handleUnpinNote = async (noteid) => {
  await db.removePin(noteid, this.state.activeDb);
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

      if (prevElem && prevElem.classList && prevElem.classList.contains("copy-code-button")) {
        return;
      }
      // Check if button already inside pre
      if (pre.querySelector(".copy-code-button")) {
        return;
      }
      var button = document.createElement("button");
      button.setAttribute("aria-label", "Copy code to clipboard");
      button.className = "copy-code-button";
      button.type = "button";
      button.innerText = "Copy";

      button.addEventListener("click", function () {
        clipboard.writeText(codeBlock.innerText).then(
          function () {
            button.blur();
            button.innerText = "Copied!";
            setTimeout(function () {
              button.innerText = "Copy";
            }, 2000);
          },
          function () {
            button.innerText = "Error";
          }
        );
      });

      // Insert inside the pre element and make pre relative
      pre.style.position = "relative";
      pre.insertBefore(button, pre.firstChild);
    });
  };

  // Workspace switching
  handleSwitchWorkspace = async (dbName) => {
    db.setActiveWorkspace(dbName);
    const getnotes = await db.getAllNotes(dbName);
    const pinnedNotes = await db.getAllPins(dbName);
    this.setState({
      activeDb: dbName,
      allnotes: getnotes,
      pinnedNotes: pinnedNotes || [],
      noteid: "",
      notetitle: "",
      notebody: "",
      filteredNotes: [],
    }, () => {
      if (this.state.allnotes.length === 0) {
        this.handleClickHomeBtn();
      } else {
        this.handleSortNotes(this.state.sortby);
      }
    });
  };

  handleAddWorkspace = (name) => {
    const workspace = db.addWorkspace(name);
    if (workspace) {
      this.setState({ workspaces: db.getWorkspaces() });
      this.handleSwitchWorkspace(workspace.dbName);
    }
  };

  handleRenameWorkspace = (dbName, newName) => {
    db.renameWorkspace(dbName, newName);
    this.setState({ workspaces: db.getWorkspaces() });
  };

  handleDeleteWorkspace = (dbName) => {
    if (dbName === this.state.activeDb) {
      // Switch to default first
      this.handleSwitchWorkspace("notesdb");
    }
    db.removeWorkspace(dbName);
    this.setState({ workspaces: db.getWorkspaces() });
  };

  // Drag-to-reorder notes
  handleReorderNotes = (draggedId, targetId) => {
    this.setState((prevState) => {
      const notes = [...prevState.allnotes];
      const dragIdx = notes.findIndex((n) => n.noteid === draggedId);
      const targetIdx = notes.findIndex((n) => n.noteid === targetId);
      if (dragIdx === -1 || targetIdx === -1) return null;
      const [dragged] = notes.splice(dragIdx, 1);
      notes.splice(targetIdx, 0, dragged);
      return { allnotes: notes, sortby: "manual" };
    });
  };
  
  // Handle Click List Item
  handleNoteListItemClick = (e, note) => {
    // Guard: if editing, show custom confirm dialog
    if (this.state.activepage === "editnote") {
      this.setState({ pendingNav: note, showNavConfirm: true });
      return;
    }
    this._navigateToNote(note);
  };

  _navigateToNote = (note) => {
    this.setState({
        noteid: note.noteid,
        notetitle: note.title,
        notebody: note.body,
        activepage: "viewnote",
        action: "",
        sidebarOpen: false,
        pendingNav: null,
        showNavConfirm: false,
    });
    const slug = slugify(note.title);
    if (slug) {
      window.history.pushState(null, "", `#note/${slug}`);
    }
  };

  handleNavConfirmDiscard = () => {
    const note = this.state.pendingNav;
    if (note) this._navigateToNote(note);
  };

  handleNavConfirmSave = () => {
    // Call the editor's save function directly
    if (window.__noteEditorSave) {
      window.__noteEditorSave();
    }
    // Then navigate
    const note = this.state.pendingNav;
    if (note) {
      setTimeout(() => this._navigateToNote(note), 150);
    }
  };

  handleNavConfirmCancel = () => {
    this.setState({ pendingNav: null, showNavConfirm: false });
  };

  // Generic dialog helpers
  showAlert = (title, message) => {
    this.setState({
      dialog: { title, message, confirmText: "OK", onConfirm: () => this.setState({ dialog: null }) },
    });
  };

  showConfirm = (title, message, onConfirm, opts = {}) => {
    this.setState({
      dialog: {
        title,
        message,
        confirmText: opts.confirmText || "Confirm",
        cancelText: opts.cancelText || "Cancel",
        danger: opts.danger || false,
        onConfirm: () => { this.setState({ dialog: null }); onConfirm(); },
        onCancel: () => this.setState({ dialog: null }),
      },
    });
  };

  // Navigate to a note based on URL hash
  navigateFromHash = () => {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#note/")) return;
    const parts = hash.slice(6).split("/"); // remove "#note/"
    const noteSlug = parts[0];
    const headingAnchor = parts[1] || null;
    // Find note by matching slug against all note titles
    const matchedNote = this.state.allnotes.find(
      (n) => slugify(n.title) === noteSlug
    );
    if (matchedNote) {
      this.setState({
        noteid: matchedNote.noteid,
        notetitle: matchedNote.title,
        notebody: matchedNote.body,
        activepage: "viewnote",
        action: "",
      }, () => {
        // Scroll to heading if specified
        if (headingAnchor) {
          setTimeout(() => {
            const el = document.getElementById(headingAnchor);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }
      });
    }
  };

  handleHashChange = () => {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#note/")) {
      // Hash cleared or no note hash — go home
      this.handleClickHomeBtn();
      return;
    }
    this.navigateFromHash();
  };

  // Handle click home button
  handleClickHomeBtn = () => {
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
        // Clear URL hash when going home
        window.history.replaceState(null, "", window.location.pathname);
      });
  };

  handleSortNotes = (sortby) => {
    // "manual" means user dragged to reorder — just preserve current order
    if (sortby === "manual") {
      this.setState({ sortby: "manual" });
      return;
    }

    const notesArray = [...this.state.allnotes];
    const sortValue = sortby;
  
    // Separate pinned and unpinned notes
    const pinnedNotes = notesArray.filter(note => this.state.pinnedNotes.includes(note.noteid));
    const unpinnedNotes = notesArray.filter(note => !this.state.pinnedNotes.includes(note.noteid));
  
    const sortByTitle = (a, b, order = 'asc') => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      if (!aTitle && bTitle) return 1;
      if (aTitle && !bTitle) return -1;
      if (!aTitle && !bTitle) return 0;
      const cmp = aTitle.localeCompare(bTitle);
      return order === 'asc' ? cmp : -cmp;
    };

    const safeTs = (ts) => ts || 0; // Handle missing timestamps
  
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
        pinnedNotes.sort((a, b) => safeTs(b.created_at) - safeTs(a.created_at));
        unpinnedNotes.sort((a, b) => safeTs(b.created_at) - safeTs(a.created_at));
        break;
      case "3": // Created: Oldest
        pinnedNotes.sort((a, b) => safeTs(a.created_at) - safeTs(b.created_at));
        unpinnedNotes.sort((a, b) => safeTs(a.created_at) - safeTs(b.created_at));
        break;
      case "4": // Modified: Newest
        pinnedNotes.sort((a, b) => safeTs(b.updated_at) - safeTs(a.updated_at));
        unpinnedNotes.sort((a, b) => safeTs(b.updated_at) - safeTs(a.updated_at));
        break;
      case "5": // Modified: Oldest
        pinnedNotes.sort((a, b) => safeTs(a.updated_at) - safeTs(b.updated_at));
        unpinnedNotes.sort((a, b) => safeTs(a.updated_at) - safeTs(b.updated_at));
        break;
      default:
        return;
    }
  
    const sortedNotes = [...pinnedNotes, ...unpinnedNotes];
  
    this.setState({
      sortby: sortValue,
      allnotes: sortedNotes,
    });
  
    // Auto-select the first note only on initial load (no current note selected)
    if (sortedNotes.length > 0 && !this.state.noteid && this.state.action !== "addnote" && this.state.action !== "updatenote") {
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
      this.setState({ noteid: "" });
    }
    // Clear URL hash during editing
    window.history.replaceState(null, "", window.location.pathname);
  };

  handleNoteEditor = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  };

  handleDeleteNote = (e, note) => {
    this.showConfirm(
      "Delete Note",
      `Are you sure you want to delete "${note.notetitle || note.title || "this note"}"? This cannot be undone.`,
      () => this._doDeleteNote(note),
      { confirmText: "Delete", danger: true }
    );
  };

  _doDeleteNote(note) {
    var index = this.state.allnotes.findIndex(
      (noteitem) => noteitem.noteid === note.noteid
    );
    this.setState((prevState) => {
      var updatedNotes = prevState.allnotes.filter(
        (noteitem) => noteitem.noteid !== note.noteid
      );
      return {
        allnotes: updatedNotes,
      };
    });
    db.deleteNote(note.noteid, this.state.activeDb);
    if (this.state.allnotes.length - 1 === 0) {
      this.handleClickHomeBtn();
    } else {
      var nextnote = this.state.allnotes[index + 1]
        ? this.state.allnotes[index + 1]
        : this.state.allnotes[index - 1];
      this.handleNoteListItemClick("", nextnote);
    }
  }

  handleSaveNote(e, note) {
    const noteHTML = md2html.render(note.notebody);
    const noteMarkdown = html2md.turndown(noteHTML);
    const notetitle = document.getElementById("notetitle")
      ? document.getElementById("notetitle").value
      : note.notetitle;

    if (note.action === "addnote") {
      // Check if this note already exists (e.g., from a previous autosave)
      const alreadyExists = this.state.allnotes.some(n => n.noteid === note.noteid);
      if (alreadyExists) {
        // Treat as update instead
        note.action = "updatenote";
        return this.handleSaveNote(e, note);
      }
      const newNote = {
        noteid: note.noteid,
        title: notetitle,
        body: noteMarkdown,
        tags: note.tags || [],
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      this.setState((prevState) => ({
        noteid: note.noteid,
        notetitle: notetitle,
        notebody: noteMarkdown,
        activepage: "viewnote",
        action: "updatenote",
        allnotes: [...prevState.allnotes, newNote],
      }), () => {
        this.handleSortNotes(this.state.sortby);
      });
      db.addNote(newNote, this.state.activeDb);
    } else {
      // Update existing note
      this.setState((prevState) => {
        const updatedNotes = prevState.allnotes.map((noteitem) => {
          if (noteitem.noteid === note.noteid) {
            return {
              ...noteitem,
              title: notetitle,
              body: noteMarkdown,
              tags: note.tags || noteitem.tags || [],
              updated_at: Date.now(),
            };
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
      }, () => {
        this.handleSortNotes(this.state.sortby);
      });
      // Find the existing note to preserve created_at
      const existingNote = this.state.allnotes.find(
        (n) => n.noteid === note.noteid
      );
      db.updateNote({
        noteid: note.noteid,
        title: notetitle,
        body: noteMarkdown,
        tags: note.tags || [],
        created_at: existingNote ? existingNote.created_at : Date.now(),
        updated_at: Date.now(),
      }, this.state.activeDb);
    }
  }

  handleCopyEvent(e, copiedContent = "") {
    if (copiedContent) {
      return navigator.clipboard
        .writeText(copiedContent)
        .then(() => {
          // Success!
        })
        .catch(() => {
            });
    }
    if (typeof window.getSelection !== "undefined") {
      var sel = window.getSelection();
      if (sel.rangeCount) {
        var container = document.createElement("div");
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
          container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        copiedContent = container.innerHTML;
      }
    } else if (typeof document.selection !== "undefined") {
      if (document.selection.type === "Text") {
        copiedContent = document.selection.createRange().htmlText;
      }
    }
    navigator.clipboard
      .writeText(html2md.turndown(copiedContent))
      .catch(() => {
        // clipboard write failed
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
        this.setState({ filteredNotes: [] });
        return;
    }

    // Search both title and body by default; use "title:" or "body:" prefix to restrict
    const field = searchString.startsWith('title:') ? 'title' :
                  searchString.startsWith('body:') ? 'body' : 'all';

    const searchWords = searchQuery.split(/\s+/);

    const filteredNotes = this.state.allnotes.filter(note => {
        if (field === 'all') {
          const combined = ((note.title || '') + ' ' + (note.body || '') + ' ' + (note.tags || []).join(' ')).toLowerCase();
          return searchWords.every(word => combined.includes(word));
        }
        const contentToSearch = (field === 'title' ? note.title : note.body || '').toLowerCase();
        return searchWords.every(word => contentToSearch.includes(word));
    });

    this.setState({ filteredNotes });
    if (filteredNotes.length > 0) {
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
    const JSZip = require("jszip");
    const zip = new JSZip();
    this.state.allnotes.forEach((note) => {
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
      this.showAlert("Invalid File", "Please upload a valid Markdown (.md) file.");
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
      await db.addNote(newNote, this.state.activeDb);
  
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

  handleZipImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const JSZip = require("jszip");
    try {
      const zip = await JSZip.loadAsync(file);
      const importedNotes = [];
      const fileNames = Object.keys(zip.files).filter(
        (name) => name.endsWith(".md") && !zip.files[name].dir
      );

      for (const name of fileNames) {
        const content = await zip.files[name].async("text");
        const title = name.replace(/\.md$/, "").replace(/^.*\//, ""); // Strip path and extension
        const newNote = {
          noteid: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          title,
          body: content,
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        await db.addNote(newNote, this.state.activeDb);
        importedNotes.push(newNote);
      }

      if (importedNotes.length > 0) {
        this.setState(
          (prevState) => ({
            allnotes: [...prevState.allnotes, ...importedNotes],
          }),
          () => {
            this.handleSortNotes("4");
          }
        );
      }

      this.showAlert("Import Complete", `Imported ${importedNotes.length} note${importedNotes.length !== 1 ? "s" : ""} from archive.`);
    } catch {
      this.showAlert("Import Failed", "Failed to read ZIP archive. Please ensure it's a valid .zip file.");
    }
    event.target.value = "";
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
              created_at: (this.state.allnotes.find(n => n.noteid === this.state.noteid) || {}).created_at,
              updated_at: (this.state.allnotes.find(n => n.noteid === this.state.noteid) || {}).updated_at,
              tags: (this.state.allnotes.find(n => n.noteid === this.state.noteid) || {}).tags || [],
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
            tags: (this.state.allnotes.find(n => n.noteid === this.state.noteid) || {}).tags || [],
          }}
          darkMode={this.state.darkMode}
          showConfirm={this.showConfirm}
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
                    isActive={note.noteid === this.state.noteid}
                    handlePinNote={this.handlePinNote}
                    handleUnpinNote={this.handleUnpinNote}
                    handleNoteListItemClick={this.handleNoteListItemClick}
                    onReorder={this.handleReorderNotes}
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
                    isActive={note.noteid === this.state.noteid}
                    handlePinNote={this.handlePinNote}
                    handleUnpinNote={this.handleUnpinNote}
                    handleNoteListItemClick={this.handleNoteListItemClick}
                    onReorder={this.handleReorderNotes}
                />
            ))}
        </>
    );


    return (
      <div className={`app-container ${this.state.darkMode ? "dark" : ""}`}>
        {/* Mobile sidebar overlay */}
        <div
          className={`sidebar-overlay ${this.state.sidebarOpen ? "active" : ""}`}
          onClick={() => this.setState({ sidebarOpen: false })}
        />
        {/* Mobile sidebar toggle */}
        <button
          className="sidebar-toggle"
          onClick={() => this.setState((s) => ({ sidebarOpen: !s.sidebarOpen }))}
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <div className={`sidebar ${this.state.sidebarOpen ? "sidebar-open" : ""}`} style={{ width: this.state.sidebarWidth, minWidth: 180 }}>
          <NavbarSidebar
            handleClickHomeBtn={this.handleClickHomeBtn}
            handleEditNoteBtn={this.handleEditNoteBtn}
            handleSearchNotes={this.handleSearchNotes}
            darkMode={this.state.darkMode}
            onToggleDarkMode={() => this.setState((s) => {
              const next = !s.darkMode;
              localStorage.setItem("noteapp_dark_mode", next);
              return { darkMode: next };
            })}
          />

          <div className="sidebar-scroll">
            <h4
              className="section-header section-header-drop"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; e.currentTarget.classList.add("section-header-dragover"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("section-header-dragover"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("section-header-dragover");
                const draggedId = e.dataTransfer.getData("text/plain");
                if (draggedId && !this.state.pinnedNotes.includes(draggedId)) {
                  this.handlePinNote(draggedId);
                }
              }}
            >
              Pinned ({totalPinned}) {totalPinned === 0 && <span className="drop-hint">Drop here to pin</span>}
            </h4>
            {totalPinned > 0 && <ul>{pinnedNoteListItems}</ul>}

            <h4
              className="section-header section-header-drop"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; e.currentTarget.classList.add("section-header-dragover"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("section-header-dragover"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("section-header-dragover");
                const draggedId = e.dataTransfer.getData("text/plain");
                if (draggedId && this.state.pinnedNotes.includes(draggedId)) {
                  this.handleUnpinNote(draggedId);
                }
              }}
            >
              Notes ({totalUnpinned})
            </h4>
            {totalUnpinned > 0 ? (
              <ul>{otherNoteListItems}</ul>
            ) : filteredNotes.length === 0 && allnotes.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-icon">📝</p>
                <p className="empty-state-text">No notes yet</p>
                <p className="empty-state-hint">Click + to create your first note</p>
              </div>
            ) : filteredNotes.length === 0 && allnotes.length > 0 && totalPinned === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">No matching notes</p>
                <p className="empty-state-hint">Try a different search term</p>
              </div>
            ) : null}
          </div>

          <NoteSort
            handleSortNotes={this.handleSortNotes}
            sortby={this.state.sortby}
            handleNotesBackup={this.handleNotesBackup}
            handleNotesUpload={this.handleNotesUpload}
            handleZipImport={this.handleZipImport}
            workspaces={this.state.workspaces}
            activeDb={this.state.activeDb}
            handleSwitchWorkspace={this.handleSwitchWorkspace}
            handleAddWorkspace={this.handleAddWorkspace}
            handleRenameWorkspace={this.handleRenameWorkspace}
            handleDeleteWorkspace={this.handleDeleteWorkspace}
            showConfirm={this.showConfirm}
          />
        </div>

        {/* Resize handle */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = this.state.sidebarWidth;
            const onMouseMove = (ev) => {
              const newWidth = Math.max(180, Math.min(500, startWidth + ev.clientX - startX));
              this.setState({ sidebarWidth: newWidth });
            };
            const onMouseUp = () => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "";
              document.body.style.userSelect = "";
              localStorage.setItem("noteapp_sidebar_width", this.state.sidebarWidth);
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              this.setState((s) => {
                const w = Math.max(180, s.sidebarWidth - 20);
                localStorage.setItem("noteapp_sidebar_width", w);
                return { sidebarWidth: w };
              });
            } else if (e.key === "ArrowRight") {
              this.setState((s) => {
                const w = Math.min(500, s.sidebarWidth + 20);
                localStorage.setItem("noteapp_sidebar_width", w);
                return { sidebarWidth: w };
              });
            }
          }}
        />

        <div className="main-content">
          {RightNavbar}
          {ActivePage}
        </div>

        {/* Navigation confirm dialog */}
        {this.state.showNavConfirm && (
          <ConfirmDialog
            title="Unsaved Changes"
            message="You have unsaved changes in the editor. What would you like to do?"
            confirmText="Discard"
            secondaryText="Save & Switch"
            cancelText="Keep Editing"
            danger
            onConfirm={this.handleNavConfirmDiscard}
            onSecondary={this.handleNavConfirmSave}
            onCancel={this.handleNavConfirmCancel}
          />
        )}
        {/* Generic dialog */}
        {this.state.dialog && (
          <ConfirmDialog
            title={this.state.dialog.title}
            message={this.state.dialog.message}
            confirmText={this.state.dialog.confirmText}
            cancelText={this.state.dialog.cancelText}
            danger={this.state.dialog.danger}
            onConfirm={this.state.dialog.onConfirm}
            onCancel={this.state.dialog.onCancel || (() => this.setState({ dialog: null }))}
          />
        )}
      </div>
    );
  }
}

export default App;