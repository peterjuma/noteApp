import { Component, lazy, Suspense } from "react";
import NavbarSidebar from "./NavbarSidebar";
import NoteSort from "./NoteSort";
import NavbarMain from "./NavbarMain";
import NoteList from "./NoteList";
import NoteMain from "./NoteMain";
import readmePath from "./README.md";
import NoteEditor from "./NoteEditor";
import ConfirmDialog from "./ConfirmDialog";
import { html2md, md2html } from "./useMarkDown";
import { saveAs } from "file-saver";
import Fuse from "fuse.js";
import * as db from "./services/notesDB";
import { computeContentHash, buildHashSet } from "./services/contentHash";

// Lazy-load heavy components (not needed on initial render)
const SettingsPanel = lazy(() => import("./SettingsPanel"));
const VersionHistory = lazy(() => import("./VersionHistory"));
const TableConverter = lazy(() => import("./TableConverter"));
import * as gistSync from "./services/gistSync";
import { Menu, FilePlus, Search, Moon, Sun, Settings, Trash2, Download, FileDown, RefreshCw, Keyboard, Home } from "lucide-react";
import QuickSwitcher from "./QuickSwitcher";
import CommandPalette from "./CommandPalette";

// Slugify a note title for URL hash
function slugify(title) {
  return (title || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Generate a default profile name from browser/OS info
function generateProfileName() {
  const ua = navigator.userAgent || "";
  let browser = "browser";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "chrome";
  else if (ua.includes("Firefox")) browser = "firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "safari";
  else if (ua.includes("Edg")) browser = "edge";
  let os = "desktop";
  if (ua.includes("Mac")) os = "mac";
  else if (ua.includes("Windows")) os = "win";
  else if (ua.includes("Linux")) os = "linux";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "ios";
  else if (ua.includes("Android")) os = "android";
  const name = `${os}-${browser}`;
  localStorage.setItem("noteapp_profile_name", name);
  return name;
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
      searchQuery: "",
      pinnedNotes: [],
      darkMode: localStorage.getItem("noteapp_dark_mode") !== null
        ? localStorage.getItem("noteapp_dark_mode") === "true"
        : window.matchMedia("(prefers-color-scheme: dark)").matches,
      activeDb: db.getActiveWorkspace(),
      workspaces: db.getWorkspaces(),
      sidebarOpen: false,
      sidebarCollapsed: localStorage.getItem("noteapp_sidebar_collapsed") === "true",
      sidebarWidth: parseInt(localStorage.getItem("noteapp_sidebar_width")) || 260,
      pendingNav: null,
      pendingEdit: null,
      showNavConfirm: false,
      editingNewNote: false,
      dialog: null,
      viewingArchive: false,
      archivedNotes: [],
      showSettings: false,
      showTableConverter: false,
      showVersionHistory: false,
      autoSave: localStorage.getItem("noteapp_autosave") === "true",
      tagSuggestEnabled: localStorage.getItem("noteapp_tag_suggest") !== "false",
      vimMode: localStorage.getItem("noteapp_vim_mode") === "true",
      profileName: localStorage.getItem("noteapp_profile_name") || generateProfileName(),
      selectedNotes: [],
      lastSelectedNoteId: null,
      showQuickSwitcher: false,
      showCommandPalette: false,
      syncStatus: { state: "idle", message: "", lastSync: gistSync.getLastSync(db.getActiveWorkspace()) },
      swUpdateAvailable: false,
      isOffline: !navigator.onLine,
    };
    this.handleSaveNote = this.handleSaveNote.bind(this);
    this.handleDownloadNote = this.handleDownloadNote.bind(this);
    this.handleSearchNotes = this.handleSearchNotes.bind(this);
    this.debouncedSearch = this.debounce(this.performSearch.bind(this), 150);
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
      if (!getnotes || getnotes.length === 0) {
        this.handleClickHomeBtn();
        return;
      }
      this.handleSortNotes(this.state.sortby);

      // Navigate to note from URL hash on initial load
      this.navigateFromHash();
      this.initializeFuse();

      // Backfill contentHash on notes that don't have one yet
      this.backfillContentHashes(getnotes);

      // Update app badge with note count
      this._updateBadge();
    });

    // Listen for browser back/forward
    window.addEventListener("hashchange", this.handleHashChange);
    window.addEventListener("keydown", this._handleGlobalKeyDown);
    window.addEventListener("sw-update-available", this._handleSWUpdate);
    window.addEventListener("online", this._handleOnline);
    window.addEventListener("offline", this._handleOffline);

    // Sync with OS color scheme changes when user hasn't set a manual preference
    this._darkModeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    this._handleColorSchemeChange = (e) => {
      if (localStorage.getItem("noteapp_dark_mode") === null) {
        this.setState({ darkMode: e.matches });
      }
    };
    this._darkModeMedia.addEventListener("change", this._handleColorSchemeChange);

    this.handleCopyCodeButtonClick();
    this.initializeFuse();
    this._startSyncInterval();

    // Handle PWA launch actions (share target, file handler, shortcuts)
    this._handleLaunchActions();

    // Listen for background sync messages from service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", this._handleSWMessage);
    }

    // Register periodic background sync if available
    this._registerPeriodicSync();
  }

  componentWillUnmount() {
    window.removeEventListener("hashchange", this.handleHashChange);
    window.removeEventListener("keydown", this._handleGlobalKeyDown);
    window.removeEventListener("sw-update-available", this._handleSWUpdate);
    window.removeEventListener("online", this._handleOnline);
    window.removeEventListener("offline", this._handleOffline);
    if (navigator.serviceWorker) {
      navigator.serviceWorker.removeEventListener("message", this._handleSWMessage);
    }
    if (this._darkModeMedia) this._darkModeMedia.removeEventListener("change", this._handleColorSchemeChange);
    if (this._syncInterval) clearInterval(this._syncInterval);
  }

  _handleSWUpdate = (e) => {
    this._swRegistration = e.detail?.registration;
    this.setState({ swUpdateAvailable: true });
  };

  _handleOnline = () => {
    this.setState({ isOffline: false });
    // Retry sync when coming back online
    if (gistSync.isSyncEnabled()) this._doFullSync();
  };

  _handleOffline = () => this.setState({ isOffline: true });

  // --- PWA Integration Methods ---

  // Update app badge with note count (Badging API)
  _updateBadge = () => {
    if ("setAppBadge" in navigator) {
      const count = (this.state.allnotes || []).length;
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  };

  // Handle PWA launch actions from manifest shortcuts, share target, and file handlers
  _handleLaunchActions = () => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");

    if (action === "new") {
      // Shortcut: New Note
      this._openEditor(
        { noteid: new Date().getTime().toString(), notetitle: "", notebody: "", tags: [] },
        true,
        "addnote"
      );
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (action === "search") {
      // Shortcut: Search — focus sidebar search
      this.setState({ sidebarCollapsed: false }, () => {
        const searchInput = document.querySelector(".search-input");
        if (searchInput) searchInput.focus();
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (action === "share") {
      // Web Share Target: create a note from shared content
      const title = params.get("title") || "";
      const text = params.get("text") || "";
      const url = params.get("url") || "";
      const body = [text, url].filter(Boolean).join("\n\n");
      if (title || body) {
        this._openEditor(
          { noteid: new Date().getTime().toString(), notetitle: title, notebody: body, tags: [] },
          true,
          "addnote"
        );
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (action === "open") {
      // File Handler: handled via launchQueue API below
      window.history.replaceState({}, "", window.location.pathname);
    }

    // File Handler API (launchQueue)
    if ("launchQueue" in window) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        for (const handle of launchParams.files) {
          const file = await handle.getFile();
          const text = await file.text();
          const name = file.name.replace(/\.(md|markdown|mdown|mkd|txt)$/i, "");
          this._openEditor(
            { noteid: new Date().getTime().toString(), notetitle: name, notebody: text, tags: [] },
            true,
            "addnote"
          );
          break; // Open the first file
        }
      });
    }
  };

  // Handle messages from the service worker (background sync, periodic sync)
  _handleSWMessage = (event) => {
    if (!event.data) return;
    if (event.data.type === "BACKGROUND_SYNC" && event.data.tag === "noteapp-gist-sync") {
      if (gistSync.isSyncEnabled()) this._doFullSync();
    }
    if (event.data.type === "PERIODIC_SYNC" && event.data.tag === "noteapp-periodic-sync") {
      if (gistSync.isSyncEnabled()) this._doFullSync();
    }
  };

  // Register periodic background sync (if supported)
  _registerPeriodicSync = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      if ("periodicSync" in registration) {
        const status = await navigator.permissions.query({ name: "periodic-background-sync" });
        if (status.state === "granted") {
          await registration.periodicSync.register("noteapp-periodic-sync", {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
          });
        }
      }
    } catch {
      // Periodic sync not supported or permission denied
    }
  };

  // Request background sync when going offline during a save
  _requestBackgroundSync = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        await registration.sync.register("noteapp-gist-sync");
      }
    } catch {
      // Background sync not supported
    }
  };

  _handleGlobalKeyDown = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    // Cmd+P — Quick Switcher
    if (mod && !e.shiftKey && e.key === "p") {
      e.preventDefault();
      this.setState((s) => ({ showQuickSwitcher: !s.showQuickSwitcher, showCommandPalette: false }));
      return;
    }
    // Cmd+Shift+P — Command Palette
    if (mod && e.shiftKey && e.key === "p") {
      e.preventDefault();
      this.setState((s) => ({ showCommandPalette: !s.showCommandPalette, showQuickSwitcher: false }));
      return;
    }
    // Cmd+N — New Note
    if (mod && !e.shiftKey && e.key === "n") {
      e.preventDefault();
      if (this.state.activepage === "editnote") return; // already editing
      this._openEditor(
        { noteid: new Date().getTime().toString(), notetitle: "", notebody: "", tags: [] },
        true,
        "addnote"
      );
      return;
    }
  };

  _relativeTime = (ts) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  _getCommands = () => [
    { id: "new-note", label: "New Note", shortcut: "⌘N", icon: FilePlus, action: () => {
      if (this.state.activepage === "editnote") return;
      this._openEditor({ noteid: new Date().getTime().toString(), notetitle: "", notebody: "", tags: [] }, true, "addnote");
    }},
    { id: "search", label: "Search Notes", shortcut: "⌘K", icon: Search, action: () => {
      this.setState({ showCommandPalette: false });
      const input = document.querySelector(".sidebar-search input");
      if (input) input.focus();
    }},
    { id: "quick-switch", label: "Quick Switcher", shortcut: "⌘P", icon: Keyboard, action: () => {
      this.setState({ showCommandPalette: false, showQuickSwitcher: true });
    }},
    { id: "home", label: "Go Home", shortcut: "", icon: Home, action: () => this.handleClickHomeBtn() },
    { id: "toggle-dark", label: `Switch to ${this.state.darkMode ? "Light" : "Dark"} Mode`, shortcut: "", icon: this.state.darkMode ? Sun : Moon, action: () => {
      const next = !this.state.darkMode;
      localStorage.setItem("noteapp_dark_mode", next);
      this.setState({ darkMode: next });
    }},
    { id: "toggle-sidebar", label: `${this.state.sidebarCollapsed ? "Expand" : "Collapse"} Sidebar`, shortcut: "", icon: Menu, action: () => {
      const next = !this.state.sidebarCollapsed;
      localStorage.setItem("noteapp_sidebar_collapsed", next);
      this.setState({ sidebarCollapsed: next });
    }},
    { id: "open-settings", label: "Open Settings", shortcut: "", icon: Settings, action: () => {
      this.setState({ showSettings: true, showTableConverter: false });
    }},
    { id: "export-md", label: "Export Note as Markdown", shortcut: "", icon: Download, action: () => {
      if (this.state.noteid) this.handleDownloadNote({ noteid: this.state.noteid, notetitle: this.state.notetitle, notebody: this.state.notebody });
    }},
    { id: "export-pdf", label: "Export Note as PDF", shortcut: "", icon: FileDown, action: () => {
      if (this.state.noteid) this.handleDownloadPdf({ noteid: this.state.noteid, notetitle: this.state.notetitle, notebody: this.state.notebody });
    }},
    { id: "delete-note", label: "Delete Current Note", shortcut: "", icon: Trash2, action: () => {
      if (this.state.noteid) this.handleDeleteNote(null, { noteid: this.state.noteid, notetitle: this.state.notetitle });
    }},
    { id: "sync-now", label: "Sync Now (Gist)", shortcut: "", icon: RefreshCw, action: () => {
      if (gistSync.isSyncEnabled()) this._scheduleSyncAfterSave();
    }},
  ];
    
  componentDidUpdate(prevProps, prevState) {
    if (
      prevState.notebody !== this.state.notebody ||
      prevState.activepage !== this.state.activepage
    ) {
      this.handleCopyCodeButtonClick();
    }
    if (prevState.allnotes !== this.state.allnotes) {
      this.initializeFuse();
    }
  }

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

      // Skip mermaid blocks (will be replaced by diagram renderer)
      if (codeBlock.classList.contains("language-mermaid")) return;

      // Add language label if not already present
      if (!pre.querySelector(".code-lang-label")) {
        var langClass = Array.from(codeBlock.classList).find(function (c) {
          return c.startsWith("language-");
        });
        if (langClass) {
          var lang = langClass.replace("language-", "");
          var label = document.createElement("span");
          label.className = "code-lang-label";
          label.textContent = lang;
          pre.style.position = "relative";
          pre.insertBefore(label, pre.firstChild);
        }
      }

      // Check if copy button already exists
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

      // Insert inside the pre element
      pre.style.position = "relative";
      var langLabel = pre.querySelector(".code-lang-label");
      if (langLabel) {
        langLabel.insertAdjacentElement("afterend", button);
      } else {
        pre.insertBefore(button, pre.firstChild);
      }
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
      this.handleSwitchWorkspace(db.getDefaultWorkspace());
    }
    db.removeWorkspace(dbName);
    this.setState({ workspaces: db.getWorkspaces() });
  };

  handleSetDefaultWorkspace = (dbName) => {
    db.setDefaultWorkspace(dbName);
    this.forceUpdate();
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
    }, () => this.initializeFuse());
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
    const nav = this.state.pendingNav;
    const edit = this.state.pendingEdit;
    const page = this.state.pendingPage;
    const discardNoteId = this.state.editingNewNote ? this.state.noteid : null;
    this.setState((prevState) => {
      const updates = { pendingNav: null, pendingEdit: null, pendingPage: null, showNavConfirm: false, editingNewNote: false };
      if (discardNoteId) {
        updates.allnotes = prevState.allnotes.filter(n => n.noteid !== discardNoteId);
      }
      if (page) {
        if (page === "settings") { updates.showSettings = true; updates.showTableConverter = false; }
        if (page === "tableConverter") { updates.showTableConverter = true; updates.showSettings = false; }
        updates.activepage = "viewnote";
        updates.action = "";
      }
      return updates;
    }, () => {
      if (discardNoteId) db.deleteNote(discardNoteId, this.state.activeDb);
      if (nav) this._navigateToNote(nav);
      if (edit) this._openEditor(edit.note, edit.isNew, edit.action);
      if (page) window.history.replaceState(null, "", window.location.pathname);
    });
  };

  handleNavConfirmSave = () => {
    // Call the editor's save function directly
    if (window.__noteEditorSave) {
      window.__noteEditorSave();
    }
    const nav = this.state.pendingNav;
    const edit = this.state.pendingEdit;
    const page = this.state.pendingPage;
    this.setState({ pendingNav: null, pendingEdit: null, pendingPage: null, showNavConfirm: false });
    setTimeout(() => {
      if (nav) this._navigateToNote(nav);
      if (edit) this._openEditor(edit.note, edit.isNew, edit.action);
      if (page) {
        if (page === "settings") this.setState({ showSettings: true, showTableConverter: false, activepage: "viewnote", action: "" });
        if (page === "tableConverter") this.setState({ showTableConverter: true, showSettings: false, activepage: "viewnote", action: "" });
        window.history.replaceState(null, "", window.location.pathname);
      }
    }, 150);
  };

  handleNavConfirmCancel = () => {
    this.setState({ pendingNav: null, pendingEdit: null, pendingPage: null, showNavConfirm: false });
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

  // Archive view
  toggleArchiveView = async () => {
    if (this.state.viewingArchive) {
      this.setState({ viewingArchive: false });
    } else {
      const archived = await db.getArchivedNotes();
      this.setState({
        viewingArchive: true,
        archivedNotes: archived,
        noteid: "",
        notetitle: "",
        notebody: "",
        activepage: "viewnote",
        action: "",
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  handleRestoreNote = async (noteid) => {
    const result = await db.restoreNoteFromArchive(noteid);
    if (result) {
      // Refresh archive list
      const archived = await db.getArchivedNotes();
      this.setState({ archivedNotes: archived });
      // If restored to current workspace, refresh notes
      if (result.workspace === this.state.activeDb) {
        const notes = await db.getAllNotes(this.state.activeDb);
        this.setState({ allnotes: notes }, () => {
          this.handleSortNotes(this.state.sortby);
          this.initializeFuse();
        });
      }
      this.showAlert("Restored", `Note restored to workspace.`);
    }
  };

  handlePermanentDelete = (noteid) => {
    this.showConfirm(
      "Delete Permanently",
      "This will permanently delete the archived note. This cannot be undone.",
      async () => {
        await db.permanentlyDeleteArchived(noteid);
        const archived = await db.getArchivedNotes();
        this.setState({ archivedNotes: archived });
      },
      { confirmText: "Delete Forever", danger: true }
    );
  };

  // Move note to another workspace
  handleMoveNote = async (note, targetDb) => {
    const noteObj = this.state.allnotes.find(n => n.noteid === note.noteid);
    if (!noteObj) return;
    await db.moveNote(noteObj.noteid, this.state.activeDb, targetDb);
    // Remove from current list
    this.setState((prevState) => ({
      allnotes: prevState.allnotes.filter(n => n.noteid !== noteObj.noteid),
    }), () => {
      if (this.state.allnotes.length > 0) {
        this.handleNoteListItemClick(null, this.state.allnotes[0]);
      } else {
        this.handleClickHomeBtn();
      }
      this.initializeFuse();
    });
    const targetName = (this.state.workspaces.find(w => w.dbName === targetDb) || {}).name || targetDb;
    this.showAlert("Moved", `Note moved to ${targetName}.`);
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
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      })
      .catch(() => {
        // Fallback: show a minimal home screen if README cannot be fetched
        this.setState({
          noteid: "00000000",
          notetitle: "# Welcome to NoteApp",
          notebody: "Create a new note to get started.",
          activepage: "viewnote",
          action: "homepage",
        });
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
    }, () => this.initializeFuse());
  
    // Auto-select the first note only on initial load (no current note selected)
    if (sortedNotes.length > 0 && !this.state.noteid && this.state.action !== "addnote" && this.state.action !== "updatenote") {
      this.handleNoteListItemClick(null, sortedNotes[0]);
    }
  };

  // Add a single suggested tag to a note
  handleAddTag = async (noteid, tag) => {
    this.setState((prevState) => {
      const allnotes = prevState.allnotes.map(n => {
        if (n.noteid === noteid) {
          const tags = [...(n.tags || []), tag];
          db.updateNote({ ...n, tags }, this.state.activeDb);
          return { ...n, tags };
        }
        return n;
      });
      return { allnotes };
    }, () => this.initializeFuse());
  };

  // Add multiple suggested tags to a note
  handleAddTags = async (noteid, newTags) => {
    this.setState((prevState) => {
      const allnotes = prevState.allnotes.map(n => {
        if (n.noteid === noteid) {
          const tags = [...new Set([...(n.tags || []), ...newTags])];
          db.updateNote({ ...n, tags }, this.state.activeDb);
          return { ...n, tags };
        }
        return n;
      });
      return { allnotes };
    }, () => this.initializeFuse());
  };

  handleEditNoteBtn = (e, note) => {
    const isNew = e.target.dataset.action === "addnote";

    // Guard: if already editing, show save/discard dialog
    if (this.state.activepage === "editnote") {
      this.setState({
        showNavConfirm: true,
        pendingNav: null,
        pendingEdit: { note, isNew, action: e.target.dataset.action },
      });
      return;
    }

    this._openEditor(note, isNew, e.target.dataset.action);
  };

  _openEditor = (note, isNew, action) => {
    this.setState({
      noteid: note.noteid,
      notetitle: isNew ? "" : note.notetitle,
      notebody: isNew ? "" : note.notebody,
      activepage: "editnote",
      action: action,
      showNavConfirm: false,
      pendingNav: null,
      pendingEdit: null,
      editingNewNote: isNew,
    });
    // Clear URL hash during editing
    window.history.replaceState(null, "", window.location.pathname);
  };

  handleNoteEditor = (e) => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  };

  handleToggleSelectNote = (noteId) => {
    this.setState((prev) => {
      const selected = prev.selectedNotes.includes(noteId)
        ? prev.selectedNotes.filter((id) => id !== noteId)
        : [...prev.selectedNotes, noteId];
      return { selectedNotes: selected, lastSelectedNoteId: noteId };
    });
  };

  handleSelectRange = (noteId, displayNotes) => {
    this.setState((prev) => {
      const lastId = prev.lastSelectedNoteId;
      if (!lastId) return { selectedNotes: [noteId], lastSelectedNoteId: noteId };
      const ids = displayNotes.map((n) => n.noteid);
      const startIdx = ids.indexOf(lastId);
      const endIdx = ids.indexOf(noteId);
      if (startIdx === -1 || endIdx === -1) return { selectedNotes: [noteId], lastSelectedNoteId: noteId };
      const low = Math.min(startIdx, endIdx);
      const high = Math.max(startIdx, endIdx);
      const rangeIds = ids.slice(low, high + 1);
      const merged = [...new Set([...prev.selectedNotes, ...rangeIds])];
      return { selectedNotes: merged, lastSelectedNoteId: noteId };
    });
  };

  handleClearSelection = () => {
    this.setState({ selectedNotes: [], lastSelectedNoteId: null });
  };

  handleBulkDeleteNotes = () => {
    const count = this.state.selectedNotes.length;
    if (count === 0) return;
    this.setState({
      dialog: {
        title: "Delete Multiple Notes",
        message: `Delete ${count} selected note${count !== 1 ? "s" : ""}? This cannot be undone.`,
        confirmText: "Delete Forever",
        secondaryText: "Archive All",
        cancelText: "Cancel",
        danger: true,
        onConfirm: () => {
          this.setState({ dialog: null });
          this._doBulkDelete(this.state.selectedNotes);
        },
        onSecondary: () => {
          this.setState({ dialog: null });
          this._doBulkArchiveAndDelete(this.state.selectedNotes);
        },
        onCancel: () => this.setState({ dialog: null }),
      },
    });
  };

  _doBulkArchiveAndDelete = async (noteIds) => {
    for (const id of noteIds) {
      const noteObj = this.state.allnotes.find((n) => n.noteid === id);
      if (noteObj) await db.archiveNote(noteObj, this.state.activeDb);
    }
    this._doBulkDelete(noteIds);
  };

  _doBulkDelete = (noteIds) => {
    const idsSet = new Set(noteIds);
    this.setState(
      (prev) => ({
        allnotes: prev.allnotes.filter((n) => !idsSet.has(n.noteid)),
        selectedNotes: [],
        lastSelectedNoteId: null,
      }),
      () => this.initializeFuse()
    );
    for (const id of noteIds) {
      db.deleteNote(id, this.state.activeDb);
    }
    // Navigate to remaining note or home
    const remaining = this.state.allnotes;
    if (remaining.length > 0) {
      this.handleNoteListItemClick(null, remaining[0]);
    } else {
      this.handleClickHomeBtn();
    }
  };

  handleDeleteNote = (e, note) => {
    const noteTitle = note.notetitle || note.title || "this note";
    this.setState({
      dialog: {
        title: "Delete Note",
        message: `What would you like to do with "${noteTitle}"?`,
        confirmText: "Delete Forever",
        secondaryText: "Archive",
        cancelText: "Cancel",
        danger: true,
        onConfirm: () => { this.setState({ dialog: null }); this._doDeleteNote(note); },
        onSecondary: () => { this.setState({ dialog: null }); this._doArchiveNote(note); },
        onCancel: () => this.setState({ dialog: null }),
      },
    });
  };

  _doArchiveNote = async (note) => {
    const noteObj = this.state.allnotes.find(n => n.noteid === (note.noteid || note.noteid));
    if (noteObj) {
      await db.archiveNote(noteObj, this.state.activeDb);
    }
    this._doDeleteNote(note);
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
    }, () => this.initializeFuse());
    db.deleteNote(note.noteid, this.state.activeDb);
    // Update badge after deletion
    setTimeout(() => this._updateBadge(), 0);
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
    const isSilent = !e; // Autosave passes null
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
        activepage: isSilent ? "editnote" : "viewnote",
        action: "updatenote",
        allnotes: [...prevState.allnotes, newNote],
      }), () => {
        if (!isSilent) this.handleSortNotes(this.state.sortby);
        this.initializeFuse();
      });
      db.addNote(newNote, this.state.activeDb);
      db.saveVersion(newNote, this.state.activeDb);
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
          activepage: isSilent ? "editnote" : "viewnote",
          action: note.action,
          allnotes: updatedNotes,
        };
      }, () => {
        if (!isSilent) this.handleSortNotes(this.state.sortby);
        this.initializeFuse();
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
      }, this.state.activeDb).then(() => {
        // Save version snapshot after update
        db.saveVersion({
          noteid: note.noteid,
          title: notetitle,
          body: noteMarkdown,
          tags: note.tags || [],
        }, this.state.activeDb);
      });
    }

    // Background gist sync (debounced, non-blocking)
    this._scheduleSyncAfterSave();

    // Update app badge after note save
    this._updateBadge();
  }

  _scheduleSyncAfterSave() {
    if (!gistSync.isSyncEnabled()) return;
    // If offline, defer to Background Sync API
    if (!navigator.onLine) {
      this._requestBackgroundSync();
      return;
    }
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(async () => {
      this.setState({ syncStatus: { state: "syncing", message: "Syncing…", lastSync: this.state.syncStatus.lastSync } });
      try {
        const wsName = (this.state.workspaces.find(w => w.dbName === this.state.activeDb) || {}).name || "Default";
        await gistSync.push(this.state.activeDb, wsName, this.state.allnotes);
        const now = Date.now();
        this.setState({ syncStatus: { state: "success", message: "Synced", lastSync: now } });
        setTimeout(() => {
          this.setState((s) => s.syncStatus.state === "success" ? { syncStatus: { ...s.syncStatus, state: "idle" } } : null);
        }, 5000);
      } catch (err) {
        this.setState({ syncStatus: { state: "error", message: err.message || "Sync failed", lastSync: this.state.syncStatus.lastSync } });
      }
    }, 10000);
  }

  _startSyncInterval = () => {
    if (this._syncInterval) clearInterval(this._syncInterval);
    const ms = gistSync.getSyncInterval();
    if (!ms || !gistSync.isSyncEnabled()) return;
    this._syncInterval = setInterval(() => {
      if (document.visibilityState === "hidden") return; // skip when tab hidden
      if (this.state.syncStatus.state === "syncing") return; // skip if already syncing
      this._doFullSync();
    }, ms);
  };

  _doFullSync = async () => {
    this.setState({ syncStatus: { state: "syncing", message: "Syncing…", lastSync: this.state.syncStatus.lastSync } });
    try {
      const wsName = (this.state.workspaces.find(w => w.dbName === this.state.activeDb) || {}).name || "Default";
      const result = await gistSync.sync(
        this.state.activeDb, wsName, this.state.allnotes,
        async (mergedNotes) => {
          for (const note of mergedNotes) await db.updateNote(note, this.state.activeDb);
          this.setState({ allnotes: mergedNotes }, () => this.handleSortNotes(this.state.sortby));
        }
      );
      const now = Date.now();
      this.setState({ syncStatus: { state: "success", message: `Synced ${result.noteCount} notes`, lastSync: now } });
      setTimeout(() => {
        this.setState((s) => s.syncStatus.state === "success" ? { syncStatus: { ...s.syncStatus, state: "idle" } } : null);
      }, 5000);
      return result;
    } catch (err) {
      this.setState({ syncStatus: { state: "error", message: err.message || "Sync failed", lastSync: this.state.syncStatus.lastSync } });
      throw err;
    }
  };

  handleCopyEvent(e, copiedContent = "") {
    if (copiedContent) {
      return navigator.clipboard
        .writeText(copiedContent)
        .then(() => {})
        .catch(() => {});
    }
    if (typeof window.getSelection !== "undefined") {
      var sel = window.getSelection();
      if (sel.rangeCount) {
        var container = document.createElement("div");
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
          container.appendChild(sel.getRangeAt(i).cloneContents());
        }
        // Remove copy buttons and metadata from the cloned content
        container.querySelectorAll(".copy-code-button, .note-meta").forEach(el => el.remove());
        copiedContent = container.innerHTML;
      }
    } else if (typeof document.selection !== "undefined") {
      if (document.selection.type === "Text") {
        copiedContent = document.selection.createRange().htmlText;
      }
    }
    if (copiedContent) {
      e.preventDefault();
      navigator.clipboard
        .writeText(html2md.turndown(copiedContent))
        .catch(() => {});
    }
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
    const searchString = e.target.value.trim();

    if (!searchString) {
        this.setState({ filteredNotes: [], searchQuery: "" });
        return;
    }

    this.setState({ searchQuery: searchString });
    this.debouncedSearch(searchString);
  }

  performSearch(searchString) {
    // Field prefix support: title:, body:, tag:
    const fieldMatch = searchString.match(/^(title:|body:|tag:)(.*)/);;
    let fuse, query;
    if (fieldMatch) {
      const field = fieldMatch[1].replace(":", "");
      query = fieldMatch[2].trim();
      if (!query) { this.setState({ filteredNotes: [] }); return; }
      fuse = this.fusePrefixIndexes?.[field];
    } else {
      query = searchString;
      fuse = this.fuseIndex;
    }

    if (!fuse) {
      this.initializeFuse();
      fuse = fieldMatch ? this.fusePrefixIndexes?.[fieldMatch[1].replace(":", "")] : this.fuseIndex;
    }

    const results = fuse.search(query);
    const filteredNotes = results.map(r => r.item);

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

  handleDownloadPdf = async (note) => {
    const { exportNoteToPdf } = await import("./services/pdfExport");
    const currentNote = this.state.allnotes.find(n => n.noteid === note.noteid) || {};
    await exportNoteToPdf({
      ...note,
      created_at: currentNote.created_at,
      updated_at: currentNote.updated_at,
    });
  };

  handleNotesBackup() {
    const JSZip = require("jszip");
    const zip = new JSZip();
    this.state.allnotes.forEach((note) => {
      const title = `${note.title.replace(/[^A-Z0-9]+/gi, "_") || "note"}.md`;
      zip.file(title, note.body);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      const wsName = ((this.state.workspaces || []).find(w => w.dbName === this.state.activeDb) || {}).name || "default";
      const profile = this.state.profileName || "backup";
      const date = new Date().toISOString().slice(0, 10);
      saveAs(content, `noteapp_${profile}_${wsName}_${date}.zip`);
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
      let content = e.target.result;
      // Use leading H1 heading as title if present, otherwise use filename
      const h1Match = content.match(/^#\s+(.+)$/m);
      let title;
      if (h1Match && content.trimStart().startsWith(h1Match[0])) {
        title = h1Match[1].trim();
        content = content.trimStart().slice(h1Match[0].length).trimStart();
      } else {
        title = file.name.replace(".md", "");
      }

      // Duplicate check: skip if identical content already exists
      const hash = await computeContentHash(title, content);
      const existingHashes = await buildHashSet(this.state.allnotes);
      if (existingHashes.has(hash)) {
        this.showAlert("Already Imported", `"${title}" is already in your notes - skipping duplicate.`);
        event.target.value = "";
        return;
      }
  
      const newNote = {
        noteid: new Date().getTime().toString(), // Generate a unique note ID
        title,
        body: content,
        contentHash: hash,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
  
      // Add note to IndexedDB
      await db.addNote(newNote, this.state.activeDb);
  
      // Add note to the state, close settings, and show the imported note
      this.setState(prevState => ({
        ...prevState,
        allnotes: [...prevState.allnotes, newNote],
        showSettings: false,
    }), () => {
        // Now that the state is updated, perform actions that depend on the updated state
        this.handleSortNotes("4");
        this.handleNoteListItemClick(null, newNote);
        this.initializeFuse();
    });
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
      let skippedCount = 0;
      const existingHashes = await buildHashSet(this.state.allnotes);
      const fileNames = Object.keys(zip.files).filter(
        (name) => name.endsWith(".md") && !zip.files[name].dir
      );

      for (const name of fileNames) {
        let content = await zip.files[name].async("text");
        // Use leading H1 heading as title if present, otherwise use filename
        const h1Match = content.match(/^#\s+(.+)$/m);
        let title;
        if (h1Match && content.trimStart().startsWith(h1Match[0])) {
          title = h1Match[1].trim();
          content = content.trimStart().slice(h1Match[0].length).trimStart();
        } else {
          title = name.replace(/\.md$/, "").replace(/^.*\//, "");
        }

        // Duplicate check: skip if identical content already exists
        const hash = await computeContentHash(title, content);
        if (existingHashes.has(hash)) {
          skippedCount++;
          continue;
        }
        existingHashes.add(hash);

        const newNote = {
          noteid: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          title,
          body: content,
          contentHash: hash,
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
            showSettings: false,
          }),
          () => {
            this.handleSortNotes("4");
            this.handleNoteListItemClick(null, importedNotes[importedNotes.length - 1]);
            this.initializeFuse();
          }
        );
      }

      const parts = [];
      if (importedNotes.length > 0) parts.push(`Imported ${importedNotes.length} note${importedNotes.length !== 1 ? "s" : ""}`);
      if (skippedCount > 0) parts.push(`skipped ${skippedCount} duplicate${skippedCount !== 1 ? "s" : ""}`);
      this.showAlert("Import Complete", parts.join(", ") + ".");
    } catch {
      this.showAlert("Import Failed", "Failed to read ZIP archive. Please ensure it's a valid .zip file.");
    }
    event.target.value = "";
  };

  backfillContentHashes = async (notes) => {
    const needsHash = notes.filter((n) => !n.contentHash);
    if (needsHash.length === 0) return;
    for (const note of needsHash) {
      note.contentHash = await computeContentHash(note.title, note.body);
      await db.updateNote(note, this.state.activeDb);
    }
    this.setState({ allnotes: [...this.state.allnotes] });
  };
  
  initializeFuse = () => {
    const opts = { threshold: 0.15, ignoreLocation: true, minMatchCharLength: 2 };
    this.fuseIndex = new Fuse(this.state.allnotes, {
      keys: [
        { name: "title", weight: 0.4 },
        { name: "body", weight: 0.3 },
        { name: "tags", weight: 0.3 },
      ],
      ...opts,
    });
    this.fusePrefixIndexes = {
      title: new Fuse(this.state.allnotes, { keys: [{ name: "title", weight: 1 }], ...opts }),
      body:  new Fuse(this.state.allnotes, { keys: [{ name: "body", weight: 1 }], ...opts }),
      tag:   new Fuse(this.state.allnotes, { keys: [{ name: "tags", weight: 1 }], ...opts }),
    };
  };

  render() {
    const allnotes = this.state.allnotes || [];
    const pinnedNotes = this.state.pinnedNotes || [];
    const filteredNotes = this.state.filteredNotes || [];
    const workspaces = this.state.workspaces || [];

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
          handleMoveNote={this.handleMoveNote}
          workspaces={workspaces}
          activeDb={this.state.activeDb}
          handleCopyEvent={this.handleCopyEvent}
          handleDownloadNote={this.handleDownloadNote}
          handleDownloadPdf={this.handleDownloadPdf}
          onShowHistory={() => this.setState({ showVersionHistory: true })}
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
              created_at: (allnotes.find(n => n.noteid === this.state.noteid) || {}).created_at,
              updated_at: (allnotes.find(n => n.noteid === this.state.noteid) || {}).updated_at,
              tags: (allnotes.find(n => n.noteid === this.state.noteid) || {}).tags || [],
            }}
            handleCopyEvent={this.handleCopyEvent}
            onAddTag={this.handleAddTag}
            onAddTags={this.handleAddTags}
            tagSuggestEnabled={this.state.tagSuggestEnabled}
            onWikiLink={(title) => {
              const note = allnotes.find(n =>
                (n.title || "").toLowerCase() === title.toLowerCase()
              );
              if (note) {
                this.handleNoteListItemClick(null, note);
              } else {
                this.showAlert("Note Not Found", `No note titled "${title}" was found in this workspace.`);
              }
            }}
            allNotes={allnotes}
            onNavigateToNote={(note) => this.handleNoteListItemClick(null, note)}
          />
        </>
      );
    }
    if (this.state.activepage === "editnote") {
      RightNavbar = <NavbarMain display={false} />;
      ActivePage = (
        <NoteEditor
          key={this.state.noteid || "new-" + this.state.action}
          editNoteData={{
            noteid: this.state.noteid,
            notetitle: this.state.notetitle,
            notebody: this.state.notebody,
            action: this.state.action,
            tags: (allnotes.find(n => n.noteid === this.state.noteid) || {}).tags || [],
          }}
          darkMode={this.state.darkMode}
          autoSave={this.state.autoSave}
          onToggleAutoSave={() => this.setState((s) => {
            const next = !s.autoSave;
            localStorage.setItem("noteapp_autosave", next);
            return { autoSave: next };
          })}
          tagSuggestEnabled={this.state.tagSuggestEnabled}
          vimMode={this.state.vimMode}
          showConfirm={this.showConfirm}
          handleEditNoteBtn={this.handleEditNoteBtn}
          handleSaveNote={this.handleSaveNote}
          handleClickHomeBtn={this.handleClickHomeBtn}
          handleNoteEditor={this.handleNoteEditor}
          handleSortNotes={this.handleSortNotes}
          handleNoteListItemClick={this.handleNoteListItemClick}
          allNotes={allnotes}
        />
      );
    }

    // Use a unified source of truth for notes to display
    const isSearching = this.state.searchQuery.length > 0;
    const displayNotes = isSearching ? filteredNotes : allnotes;
    const selectedNotes = this.state.selectedNotes || [];

    let filteredPinnedNotes = displayNotes.filter(note => pinnedNotes.includes(note.noteid));
    let filteredUnpinnedNotes = displayNotes.filter(note => !pinnedNotes.includes(note.noteid));

    // Combined display order for shift-select range calculation
    const orderedDisplayNotes = [...filteredPinnedNotes, ...filteredUnpinnedNotes];

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
                    isSelected={selectedNotes.includes(note.noteid)}
                    selectedCount={selectedNotes.length}
                    searchQuery={this.state.searchQuery}
                    handlePinNote={this.handlePinNote}
                    handleUnpinNote={this.handleUnpinNote}
                    handleNoteListItemClick={this.handleNoteListItemClick}
                    handleToggleSelectNote={this.handleToggleSelectNote}
                    handleSelectRange={() => this.handleSelectRange(note.noteid, orderedDisplayNotes)}
                    handleBulkDeleteNotes={this.handleBulkDeleteNotes}
                    handleClearSelection={this.handleClearSelection}
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
                    isSelected={selectedNotes.includes(note.noteid)}
                    selectedCount={selectedNotes.length}
                    searchQuery={this.state.searchQuery}
                    handlePinNote={this.handlePinNote}
                    handleUnpinNote={this.handleUnpinNote}
                    handleNoteListItemClick={this.handleNoteListItemClick}
                    handleToggleSelectNote={this.handleToggleSelectNote}
                    handleSelectRange={() => this.handleSelectRange(note.noteid, orderedDisplayNotes)}
                    handleBulkDeleteNotes={this.handleBulkDeleteNotes}
                    handleClearSelection={this.handleClearSelection}
                    onReorder={this.handleReorderNotes}
                />
            ))}
        </>
    );


    return (
      <div className={`app-container ${this.state.darkMode ? "dark" : ""}`}>
        {/* Window Controls Overlay titlebar (desktop PWA) */}
        <div className="wco-titlebar">
          <span className="wco-title">NoteApp</span>
        </div>
        {/* Offline indicator */}
        {this.state.isOffline && (
          <div className="offline-banner">You are offline — changes are saved locally</div>
        )}
        {/* Update available banner */}
        {this.state.swUpdateAvailable && (
          <div className="update-banner">
            <span>A new version of NoteApp is available.</span>
            <button onClick={() => {
              if (this._swRegistration?.waiting) {
                this._swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
              }
            }}>Reload</button>
            <button onClick={() => this.setState({ swUpdateAvailable: false })} className="update-dismiss">✕</button>
          </div>
        )}
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
        <div
          className={`sidebar ${this.state.sidebarOpen ? "sidebar-open" : ""} ${this.state.sidebarCollapsed ? "sidebar-collapsed" : ""}`}
          style={this.state.sidebarCollapsed ? undefined : { width: this.state.sidebarWidth, minWidth: 180 }}
        >
          <NavbarSidebar
            handleClickHomeBtn={this.handleClickHomeBtn}
            handleEditNoteBtn={this.handleEditNoteBtn}
            handleSearchNotes={this.handleSearchNotes}
            searchResultCount={this.state.searchQuery ? this.state.filteredNotes.length : null}
            onUploadNote={this.handleNotesUpload}
            darkMode={this.state.darkMode}
            showSettings={this.state.showSettings}
            showTableConverter={this.state.showTableConverter}
            workspaceName={(workspaces.find(w => w.dbName === this.state.activeDb) || {}).name || "Default"}
            workspaces={workspaces}
            activeDb={this.state.activeDb}
            onSwitchWorkspace={this.handleSwitchWorkspace}
            sidebarCollapsed={this.state.sidebarCollapsed}
            onToggleCollapse={() => this.setState((s) => {
              const next = !s.sidebarCollapsed;
              localStorage.setItem("noteapp_sidebar_collapsed", next);
              return { sidebarCollapsed: next };
            })}
            onOpenSettings={() => {
              if (this.state.activepage === "editnote") {
                this.setState({ showNavConfirm: true, pendingPage: "settings" });
                return;
              }
              this.setState((s) => {
                const next = !s.showSettings;
                if (next) window.history.replaceState(null, "", window.location.pathname);
                return { showSettings: next, showTableConverter: false, viewingArchive: false };
              });
            }}
            onOpenTableConverter={() => {
              if (this.state.activepage === "editnote") {
                this.setState({ showNavConfirm: true, pendingPage: "tableConverter" });
                return;
              }
              this.setState((s) => {
                const next = !s.showTableConverter;
                if (next) window.history.replaceState(null, "", window.location.pathname);
                return { showTableConverter: next, showSettings: false };
              });
            }}
            onAddWorkspace={this.handleAddWorkspace}
          />

          {!this.state.showSettings && !this.state.showTableConverter && (
          <div className="sidebar-scroll">
            {totalPinned > 0 && (
            <>
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
              Pinned ({totalPinned})
            </h4>
            <ul>{pinnedNoteListItems}</ul>
            </>
            )}

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
            ) : isSearching && filteredNotes.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">No matching notes</p>
                <p className="empty-state-hint">Try a different search term</p>
              </div>
            ) : null}
          </div>
          )}

          {!this.state.showSettings && !this.state.showTableConverter && (
          <NoteSort
            handleSortNotes={this.handleSortNotes}
            sortby={this.state.sortby}
          />
          )}

          {/* Sync status indicator */}
          {gistSync.isSyncEnabled() && (
            <div
              className={`sync-indicator sync-${this.state.syncStatus.state}`}
              onClick={() => {
                if (this.state.syncStatus.state === "error") this._doFullSync();
              }}
              title={this.state.syncStatus.state === "error" ? "Click to retry" : this.state.syncStatus.message}
            >
              {this.state.syncStatus.state === "syncing" && <RefreshCw size={12} className="spin" />}
              {this.state.syncStatus.state === "success" && <span style={{ color: "#16a34a" }}>✓</span>}
              {this.state.syncStatus.state === "error" && <span style={{ color: "#dc2626" }}>✕</span>}
              {this.state.syncStatus.state === "idle" && <span style={{ opacity: 0.5 }}>☁</span>}
              <span className="sync-indicator-text">
                {this.state.syncStatus.state === "syncing" ? "Syncing…"
                  : this.state.syncStatus.state === "success" ? this.state.syncStatus.message
                  : this.state.syncStatus.state === "error" ? "Sync failed"
                  : this.state.syncStatus.lastSync
                    ? `Synced ${this._relativeTime(this.state.syncStatus.lastSync)}`
                    : "Not synced yet"}
              </span>
            </div>
          )}
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
          <Suspense fallback={
            <div className="skeleton-main">
              <div className="skeleton-bar skeleton-bar-header" />
              <div className="skeleton-bar skeleton-bar-lg" />
              <div className="skeleton-bar skeleton-bar-md" />
              <div className="skeleton-bar skeleton-bar-lg" />
              <div className="skeleton-bar skeleton-bar-sm" />
              <div className="skeleton-bar skeleton-bar-lg" />
              <div className="skeleton-bar skeleton-bar-md" />
            </div>
          }>
          {this.state.showSettings ? (
            <SettingsPanel
              darkMode={this.state.darkMode}
              onToggleDarkMode={() => this.setState((s) => {
                const next = !s.darkMode;
                localStorage.setItem("noteapp_dark_mode", next);
                return { darkMode: next };
              })}
              autoSave={this.state.autoSave}
              onToggleAutoSave={() => this.setState((s) => {
                const next = !s.autoSave;
                localStorage.setItem("noteapp_autosave", next);
                return { autoSave: next };
              })}
              tagSuggestEnabled={this.state.tagSuggestEnabled}
              onToggleTagSuggest={() => this.setState((s) => {
                const next = !s.tagSuggestEnabled;
                localStorage.setItem("noteapp_tag_suggest", next);
                return { tagSuggestEnabled: next };
              })}
              vimMode={this.state.vimMode}
              onToggleVimMode={() => this.setState((s) => {
                const next = !s.vimMode;
                localStorage.setItem("noteapp_vim_mode", next);
                return { vimMode: next };
              })}
              profileName={this.state.profileName}
              onChangeProfileName={(name) => {
                localStorage.setItem("noteapp_profile_name", name);
                this.setState({ profileName: name });
              }}
              workspaces={this.state.workspaces}
              activeDb={this.state.activeDb}
              onSwitchWorkspace={(dbName) => { this.handleSwitchWorkspace(dbName); }}
              onAddWorkspace={this.handleAddWorkspace}
              onRenameWorkspace={this.handleRenameWorkspace}
              onDeleteWorkspace={this.handleDeleteWorkspace}
              defaultWorkspace={db.getDefaultWorkspace()}
              onSetDefaultWorkspace={this.handleSetDefaultWorkspace}
              archivedNotes={this.state.archivedNotes}
              onRestoreNote={this.handleRestoreNote}
              onPermanentDelete={this.handlePermanentDelete}
              onLoadArchive={async () => {
                const archived = await db.getArchivedNotes();
                this.setState({ archivedNotes: archived });
              }}
              onBackup={this.handleNotesBackup}
              onUploadNote={this.handleNotesUpload}
              onZipImport={this.handleZipImport}
              onPurgeArchive={async () => {
                await db.purgeArchive();
                this.setState({ archivedNotes: [] });
                this.showAlert("Archive Purged", "All archived notes have been permanently deleted.");
              }}
              onPurgeWorkspace={async (dbName) => {
                await db.purgeWorkspace(dbName);
                if (dbName === this.state.activeDb) {
                  this.setState({ allnotes: [], pinnedNotes: [], filteredNotes: [] }, () => {
                    this.handleClickHomeBtn();
                  });
                }
                this.showAlert("Workspace Purged", "All notes, pins, and images have been deleted from this workspace.");
              }}
              onPurgeAllWorkspaces={async () => {
                await db.purgeAllWorkspaces();
                this.setState({
                  allnotes: [],
                  pinnedNotes: [],
                  filteredNotes: [],
                  workspaces: db.getWorkspaces(),
                  activeDb: "notesdb",
                  showSettings: false,
                }, () => {
                  this.handleClickHomeBtn();
                });
                this.showAlert("All Data Deleted", "All workspaces and notes have been permanently deleted.");
              }}
              showConfirm={this.showConfirm}
              onSyncNow={() => this._doFullSync()}
              onSyncIntervalChange={(ms) => {
                gistSync.setSyncInterval(ms);
                this._startSyncInterval();
              }}
              syncInterval={gistSync.getSyncInterval()}
              onClose={() => this.setState({ showSettings: false })}
            />
          ) : this.state.showTableConverter ? (
            <div className="full-table-converter">
              <TableConverter
                darkMode={this.state.darkMode}
                fullPage
                onClose={() => this.setState({ showTableConverter: false })}
              />
            </div>
          ) : (
            <>
            <div className="main-split">
              <div className="main-split-primary">
                {RightNavbar}
                {ActivePage}
              </div>
            </div>
            {this.state.showVersionHistory && this.state.noteid && (
              <Suspense fallback={null}>
                <VersionHistory
                  noteid={this.state.noteid}
                  currentTitle={this.state.notetitle}
                  darkMode={this.state.darkMode}
                  activeDb={this.state.activeDb}
                  onRestore={(restoredNote) => {
                    this.setState({
                      notetitle: restoredNote.title,
                      notebody: restoredNote.body,
                      showVersionHistory: false,
                      allnotes: this.state.allnotes.map((n) =>
                        n.noteid === restoredNote.noteid ? restoredNote : n
                      ),
                    });
                    this.showAlert("Version Restored", "The note has been restored to the selected version.");
                  }}
                  onClose={() => this.setState({ showVersionHistory: false })}
                />
              </Suspense>
            )}
            </>
          )}
          </Suspense>
        </div>

        {/* Navigation confirm dialog */}
        {this.state.showNavConfirm && (() => {
          const canSave = (this.state.notetitle || "").trim() && (this.state.notebody || "").trim();
          return (
            <ConfirmDialog
              title="Unsaved Changes"
              message={canSave
                ? "You have unsaved changes in the editor. What would you like to do?"
                : "This note is empty and cannot be saved."
              }
              confirmText="Discard"
              secondaryText={canSave ? "Save & Switch" : undefined}
              cancelText="Keep Editing"
              danger
              onConfirm={this.handleNavConfirmDiscard}
              onSecondary={canSave ? this.handleNavConfirmSave : undefined}
              onCancel={this.handleNavConfirmCancel}
            />
          );
        })()}
        {/* Generic dialog */}
        {this.state.dialog && (
          <ConfirmDialog
            title={this.state.dialog.title}
            message={this.state.dialog.message}
            confirmText={this.state.dialog.confirmText}
            cancelText={this.state.dialog.cancelText}
            secondaryText={this.state.dialog.secondaryText}
            danger={this.state.dialog.danger}
            onConfirm={this.state.dialog.onConfirm}
            onSecondary={this.state.dialog.onSecondary}
            onCancel={this.state.dialog.onCancel || (() => this.setState({ dialog: null }))}
          />
        )}


        {this.state.showQuickSwitcher && (
          <QuickSwitcher
            allNotes={allnotes}
            darkMode={this.state.darkMode}
            onSelect={(note) => {
              this.setState({ showQuickSwitcher: false });
              this.handleNoteListItemClick(null, note);
            }}
            onClose={() => this.setState({ showQuickSwitcher: false })}
          />
        )}

        {this.state.showCommandPalette && (
          <CommandPalette
            commands={this._getCommands()}
            darkMode={this.state.darkMode}
            onClose={() => this.setState({ showCommandPalette: false })}
          />
        )}
      </div>
    );
  }
}

export default App;