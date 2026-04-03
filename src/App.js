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
import { formatSelectionForCopy } from "./services/copyFormatter";
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
import LockScreen, { isPinSet, getSessionTimeout } from "./LockScreen";

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
      settingsTab: "general",
      autoSave: localStorage.getItem("noteapp_autosave") === "true",
      tagSuggestEnabled: localStorage.getItem("noteapp_tag_suggest") !== "false",
      vimMode: localStorage.getItem("noteapp_vim_mode") === "true",
      profileName: localStorage.getItem("noteapp_profile_name") || generateProfileName(),
      selectedNotes: [],
      lastSelectedNoteId: null,
      showQuickSwitcher: false,
      showCommandPalette: false,
      syncStatus: { state: "idle", message: "", lastSync: null },
      swUpdateAvailable: false,
      isOffline: !navigator.onLine,
      locked: isPinSet(),
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

      // Navigate from URL hash on initial load (notes, settings, table-converter)
      const hash = window.location.hash;
      if (hash && hash !== "#") {
        this.handleHashChange();
      } else {
        this.navigateFromHash();
      }
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

    // Request persistent storage to protect IndexedDB from cache eviction
    this._requestPersistentStorage();

    // Handle PWA launch actions (share target, file handler, shortcuts)
    this._handleLaunchActions();

    // Listen for background sync messages from service worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", this._handleSWMessage);
    }

    // Register periodic background sync if available
    this._registerPeriodicSync();

    // Session timeout: re-lock after inactivity or tab switch
    this._setupLockTimeout();
    this._handleVisibilityChange = () => {
      if (document.hidden && isPinSet() && !this.state.locked) {
        const timeout = getSessionTimeout();
        if (timeout === -1) {
          // Lock immediately on tab switch
          this.setState({ locked: true });
        } else if (timeout > 0) {
          // Start countdown when tab is hidden
          this._lockOnHideTimer = setTimeout(() => {
            if (isPinSet()) this.setState({ locked: true });
          }, timeout);
        }
      } else if (!document.hidden && this._lockOnHideTimer) {
        clearTimeout(this._lockOnHideTimer);
        this._lockOnHideTimer = null;
      }
    };
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
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
    if (this._lockTimer) clearTimeout(this._lockTimer);
    if (this._lockOnHideTimer) clearTimeout(this._lockOnHideTimer);
    this._teardownLockTimeout();
    document.removeEventListener("visibilitychange", this._handleVisibilityChange);
  }

  _handleSWUpdate = (e) => {
    this._swRegistration = e.detail?.registration;
    this.setState({ swUpdateAvailable: true });
  };

  _setupLockTimeout = () => {
    this._teardownLockTimeout();
    if (this._lockTimer) clearTimeout(this._lockTimer);
    const timeout = getSessionTimeout();
    // timeout > 0 means inactivity-based lock; reset on user interaction
    if (timeout > 0 && isPinSet()) {
      const resetTimer = () => {
        if (this._lockTimer) clearTimeout(this._lockTimer);
        if (this.state.locked) return;
        this._lockTimer = setTimeout(() => {
          if (isPinSet()) this.setState({ locked: true });
        }, timeout);
      };
      this._lockResetHandler = resetTimer;
      ["mousedown", "keydown", "touchstart", "scroll"].forEach((evt) =>
        document.addEventListener(evt, resetTimer, { passive: true })
      );
      resetTimer();
    }
  };

  _teardownLockTimeout = () => {
    if (this._lockTimer) clearTimeout(this._lockTimer);
    if (this._lockResetHandler) {
      ["mousedown", "keydown", "touchstart", "scroll"].forEach((evt) =>
        document.removeEventListener(evt, this._lockResetHandler)
      );
      this._lockResetHandler = null;
    }
  };

  _handleUnlock = () => {
    this.setState({ locked: false }, () => {
      this._teardownLockTimeout();
      this._setupLockTimeout();
    });
  };

  _handleOnline = () => {
    this.setState({ isOffline: false });
    // Retry sync when coming back online
    gistSync.isSyncEnabled(this.state.activeDb).then((enabled) => { if (enabled) this._doFullSync(); });
  };

  _handleOffline = () => this.setState({ isOffline: true });

  // --- PWA Integration Methods ---

  // Request persistent storage to protect data from browser eviction
  _requestPersistentStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      if (!granted) {
        // Browser declined — data may be evicted under storage pressure
        // This is common on first visit; PWAs installed to home screen get auto-granted
      }
    }
  };

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
      gistSync.isSyncEnabled(this.state.activeDb).then((enabled) => { if (enabled) this._doFullSync(); });
    }
    if (event.data.type === "PERIODIC_SYNC" && event.data.tag === "noteapp-periodic-sync") {
      gistSync.isSyncEnabled(this.state.activeDb).then((enabled) => { if (enabled) this._doFullSync(); });
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
      gistSync.isSyncEnabled(this.state.activeDb).then((enabled) => { if (enabled) this._scheduleSyncAfterSave(); });
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
        if (page === "settings") { updates.showSettings = true; updates.showTableConverter = false; updates.settingsTab = "general"; }
        if (page === "tableConverter") { updates.showTableConverter = true; updates.showSettings = false; }
        updates.activepage = "viewnote";
        updates.action = "";
      }
      return updates;
    }, () => {
      if (discardNoteId) db.deleteNote(discardNoteId, this.state.activeDb);
      if (nav) this._navigateToNote(nav);
      if (edit) this._openEditor(edit.note, edit.isNew, edit.action);
      if (page === "settings") window.history.pushState(null, "", "#settings");
      else if (page === "tableConverter") window.history.pushState(null, "", "#table-converter");
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
        if (page === "settings") {
          this.setState({ showSettings: true, showTableConverter: false, activepage: "viewnote", action: "", settingsTab: "general" });
          window.history.pushState(null, "", "#settings");
        }
        if (page === "tableConverter") {
          this.setState({ showTableConverter: true, showSettings: false, activepage: "viewnote", action: "" });
          window.history.pushState(null, "", "#table-converter");
        }
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
      const archived = await db.getArchivedNotes(this.state.activeDb);
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
      // Remove from displayed archive list
      this.setState(prev => ({ archivedNotes: prev.archivedNotes.filter(n => n.noteid !== noteid) }));
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
        this.setState(prev => ({ archivedNotes: prev.archivedNotes.filter(n => n.noteid !== noteid) }));
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

    // No hash or just "#" — go home
    if (!hash || hash === "#") {
      this.setState({ showSettings: false, showTableConverter: false, viewingArchive: false });
      this.handleClickHomeBtn();
      return;
    }

    // Settings: #settings or #settings/tabname
    if (hash.startsWith("#settings")) {
      const tab = hash.split("/")[1] || "general";
      this.setState({
        showSettings: true,
        showTableConverter: false,
        viewingArchive: false,
        activepage: "viewnote",
        action: "",
        settingsTab: tab,
      });
      return;
    }

    // Table Converter: #table-converter
    if (hash === "#table-converter") {
      this.setState({
        showTableConverter: true,
        showSettings: false,
        viewingArchive: false,
        activepage: "viewnote",
        action: "",
      });
      return;
    }

    // Note: #note/slug
    if (hash.startsWith("#note/")) {
      this.setState({ showSettings: false, showTableConverter: false, viewingArchive: false });
      this.navigateFromHash();
      return;
    }

    // Unknown hash — go home
    this.setState({ showSettings: false, showTableConverter: false, viewingArchive: false });
    this.handleClickHomeBtn();
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
    const shouldAutoSelect = sortedNotes.length > 0 && !this.state.noteid && this.state.action !== "addnote" && this.state.action !== "updatenote";
  
    this.setState({
      sortby: sortValue,
      allnotes: sortedNotes,
    }, () => {
      this.initializeFuse();
      if (shouldAutoSelect) {
        this.handleNoteListItemClick(null, sortedNotes[0]);
      }
    });
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
      notetitle: isNew ? "" : (note.notetitle || note.title || ""),
      notebody: isNew ? "" : (note.notebody || note.body || ""),
      activepage: "editnote",
      action: action || (isNew ? "addnote" : "updatenote"),
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
    const activeDb = this.state.activeDb;
    this.setState(
      (prev) => ({
        allnotes: prev.allnotes.filter((n) => !idsSet.has(n.noteid)),
        selectedNotes: [],
        lastSelectedNoteId: null,
      }),
      () => {
        this.initializeFuse();
        for (const id of noteIds) {
          db.deleteNote(id, activeDb);
        }
        if (this.state.allnotes.length > 0) {
          this.handleNoteListItemClick(null, this.state.allnotes[0]);
        } else {
          this.handleClickHomeBtn();
        }
      }
    );
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
    const noteObj = this.state.allnotes.find(n => n.noteid === note.noteid);
    if (noteObj) {
      await db.archiveNote(noteObj, this.state.activeDb);
    }
    this._doDeleteNote(note);
  };

  _doDeleteNote(note) {
    const currentNotes = this.state.allnotes;
    const index = currentNotes.findIndex(
      (noteitem) => noteitem.noteid === note.noteid
    );
    const nextnote = currentNotes[index + 1] || currentNotes[index - 1] || null;
    this.setState((prevState) => ({
      allnotes: prevState.allnotes.filter(
        (noteitem) => noteitem.noteid !== note.noteid
      ),
    }), () => {
      this.initializeFuse();
      this._updateBadge();
      if (nextnote) {
        this.handleNoteListItemClick("", nextnote);
      } else {
        this.handleClickHomeBtn();
      }
    });
    db.deleteNote(note.noteid, this.state.activeDb);
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
        // Treat as update instead — fall through to update path
        note.action = "updatenote";
      }
    }

    if (note.action === "addnote") {
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
      const activeDb = this.state.activeDb;
      db.updateNote({
        noteid: note.noteid,
        title: notetitle,
        body: noteMarkdown,
        tags: note.tags || [],
        created_at: existingNote ? existingNote.created_at : Date.now(),
        updated_at: Date.now(),
      }, activeDb).then(() => {
        // Save version snapshot after update
        db.saveVersion({
          noteid: note.noteid,
          title: notetitle,
          body: noteMarkdown,
          tags: note.tags || [],
        }, activeDb);
      });
    }

    // Background gist sync (debounced, non-blocking)
    this._scheduleSyncAfterSave();

    // Update app badge after note save
    this._updateBadge();
  }

  _scheduleSyncAfterSave() {
    gistSync.isSyncEnabled(this.state.activeDb).then((enabled) => {
      if (!enabled) return;
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
    });
  }

  _startSyncInterval = async () => {
    if (this._syncInterval) clearInterval(this._syncInterval);
    const ms = await gistSync.getSyncInterval(this.state.activeDb);
    const enabled = await gistSync.isSyncEnabled(this.state.activeDb);
    if (!ms || !enabled) return;
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
        // Remove copy buttons, metadata, and tag elements from the cloned content
        container.querySelectorAll(".copy-code-button, .code-lang-label, .note-meta, .note-tags-section").forEach(el => el.remove());
        copiedContent = container.innerHTML;
      }
    } else if (typeof document.selection !== "undefined") {
      if (document.selection.type === "Text") {
        copiedContent = document.selection.createRange().htmlText;
      }
    }
    if (copiedContent) {
      e.preventDefault();
      // Apply inline styles so formatting survives paste into rich editors
      const styledHtml = formatSelectionForCopy(copiedContent);
      const htmlBlob = new Blob([styledHtml], { type: "text/html" });
      const textBlob = new Blob([html2md.turndown(copiedContent)], { type: "text/plain" });
      navigator.clipboard.write([
        new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })
      ]).catch(() => {
        // Fallback: plain text only
        navigator.clipboard.writeText(html2md.turndown(copiedContent)).catch(() => {});
      });
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
    const noteTitle = note.notetitle || note.title || "note";
    const noteBody = note.notebody || note.body || "";
    const title = `${noteTitle.replace(/[^A-Z0-9]+/gi, "_") || "note"}.md`;
    var blob = new Blob([noteBody], {
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

  handleNotesBackup(exportAll = false) {
    const JSZip = require("jszip");
    const zip = new JSZip();

    const doExport = async () => {
      const workspacesToExport = exportAll
        ? this.state.workspaces
        : [this.state.workspaces.find(w => w.dbName === this.state.activeDb) || { name: "Default", dbName: "notesdb" }];

      let totalNotes = 0;
      let totalTemplates = 0;
      let totalTags = 0;
      let totalVersions = 0;
      let totalImages = 0;
      let totalPins = 0;

      for (const ws of workspacesToExport) {
        const wsData = await db.exportWorkspaceData(ws.dbName);
        const folder = exportAll ? zip.folder(ws.name) : zip;

        // Write individual .md files for readability
        wsData.notes.forEach((note) => {
          const fname = `${(note.title || "note").replace(/[^A-Z0-9]+/gi, "_")}.md`;
          folder.file(fname, note.body || "");
        });

        // Write full workspace data as JSON (all stores, excluding credentials)
        folder.file("_workspace.json", JSON.stringify({
          workspace: ws.name,
          dbName: ws.dbName,
          exportedAt: new Date().toISOString(),
          notes: wsData.notes,
          pins: wsData.pins,
          tags: wsData.tags,
          snippets: wsData.snippets,
          versions: wsData.versions,
          settings: wsData.settings,
          images: wsData.images,
        }, null, 2));

        totalNotes += wsData.notes.length;
        totalTemplates += wsData.snippets.length;
        totalTags += wsData.tags.length;
        totalVersions += wsData.versions.length;
        totalImages += wsData.images.length;
        totalPins += wsData.pins.length;
      }

      // Include workspace list metadata for all-workspaces export
      if (exportAll) {
        zip.file("_manifest.json", JSON.stringify({
          app: "NoteCache",
          version: 1,
          exportType: "all-workspaces",
          exportedAt: new Date().toISOString(),
          workspaces: workspacesToExport.map(w => ({ name: w.name, dbName: w.dbName })),
        }, null, 2));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const profile = this.state.profileName || "backup";
      const date = new Date().toISOString().slice(0, 10);
      const scope = exportAll ? "all" : ((workspacesToExport[0] || {}).name || "default");
      const filename = `notecache_${profile}_${scope}_${date}.zip`;
      saveAs(content, filename);

      const parts = [];
      if (totalNotes > 0) parts.push(`${totalNotes} note${totalNotes !== 1 ? "s" : ""}`);
      if (totalTemplates > 0) parts.push(`${totalTemplates} template${totalTemplates !== 1 ? "s" : ""}`);
      if (totalTags > 0) parts.push(`${totalTags} tag${totalTags !== 1 ? "s" : ""}`);
      if (totalVersions > 0) parts.push(`${totalVersions} version snapshot${totalVersions !== 1 ? "s" : ""}`);
      if (totalImages > 0) parts.push(`${totalImages} image${totalImages !== 1 ? "s" : ""}`);
      if (totalPins > 0) parts.push(`${totalPins} pin${totalPins !== 1 ? "s" : ""}`);
      const wsLabel = exportAll ? ` across ${workspacesToExport.length} workspace${workspacesToExport.length !== 1 ? "s" : ""}` : "";
      this.showAlert("Export Complete", `Exported ${parts.join(", ")}${wsLabel} to ${filename}`);
    };

    doExport().catch((err) => {
      this.showAlert("Export Failed", err.message || "Could not create backup.");
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
    reader.onerror = () => {
      this.showAlert("Import Failed", "Could not read file.");
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  handleRestoreFromGist = () => {
    this.showConfirm(
      "Restore from Gist",
      "This will pull all notes from your linked Gist and merge them with your current notes. Newer versions win, duplicates are skipped. Continue?",
      async () => {
        try {
          this.setState({ syncStatus: { state: "syncing", message: "Restoring from Gist…", lastSync: this.state.syncStatus.lastSync } });
          const remoteData = await gistSync.pull(this.state.activeDb);
          if (!remoteData || !remoteData.notes || remoteData.notes.length === 0) {
            this.setState({ syncStatus: { ...this.state.syncStatus, state: "idle" } });
            this.showAlert("No Notes Found", "The linked Gist contains no notes to restore.");
            return;
          }
          const { notes: mergedNotes } = gistSync.mergeNotes(this.state.allnotes, remoteData.notes);
          for (const note of mergedNotes) await db.updateNote(note, this.state.activeDb);
          this.setState(
            { allnotes: mergedNotes, syncStatus: { state: "success", message: `Restored ${remoteData.notes.length} notes from Gist`, lastSync: Date.now() } },
            () => { this.handleSortNotes(this.state.sortby); this.initializeFuse(); }
          );
          this.showAlert("Restore Complete", `Merged ${remoteData.notes.length} note${remoteData.notes.length !== 1 ? "s" : ""} from Gist.`);
          setTimeout(() => this.setState((s) => s.syncStatus.state === "success" ? { syncStatus: { ...s.syncStatus, state: "idle" } } : null), 5000);
        } catch (err) {
          this.setState({ syncStatus: { state: "error", message: err.message || "Restore failed", lastSync: this.state.syncStatus.lastSync } });
          this.showAlert("Restore Failed", err.message || "Could not pull notes from Gist.");
        }
      },
      { confirmText: "Restore" }
    );
  };

  handleImportFromGist = async (gistInput) => {
    try {
      const result = await gistSync.fetchGistNotes(gistInput, this.state.activeDb);
      const existingHashes = await buildHashSet(this.state.allnotes);
      const importedNotes = [];
      let skippedCount = 0;

      for (const { title, body } of result.notes) {
        const hash = await computeContentHash(title, body);
        if (existingHashes.has(hash)) {
          skippedCount++;
          continue;
        }
        existingHashes.add(hash);

        const newNote = {
          noteid: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          title,
          body,
          contentHash: hash,
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        await db.addNote(newNote, this.state.activeDb);
        importedNotes.push(newNote);
      }

      if (importedNotes.length > 0) {
        this.setState(
          (prev) => ({
            allnotes: [...prev.allnotes, ...importedNotes],
          }),
          () => {
            this.handleSortNotes(this.state.sortby);
            this.initializeFuse();
          }
        );
      }

      const parts = [];
      if (importedNotes.length > 0) parts.push(`${importedNotes.length} note${importedNotes.length !== 1 ? "s" : ""}`);
      if (skippedCount > 0) parts.push(`${skippedCount} duplicate${skippedCount !== 1 ? "s" : ""} skipped`);
      const from = result.owner !== "anonymous" ? ` from @${result.owner}` : "";
      this.showAlert("Gist Import Complete", `Imported ${parts.join(", ")}${from}.`);
      return { success: true };
    } catch (err) {
      this.showAlert("Gist Import Failed", err.message);
      return { success: false, error: err.message };
    }
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

      // Import templates if present
      let templateCount = 0;
      if (zip.files["_templates.json"]) {
        try {
          const tplJson = await zip.files["_templates.json"].async("text");
          const templates = JSON.parse(tplJson);
          if (Array.isArray(templates)) {
            const { importSnippets } = await import("./services/snippets");
            templateCount = await importSnippets(templates, this.state.activeDb);
          }
        } catch {
          // ignore invalid template JSON
        }
      }

      // Import predefined tags if present
      let tagCount = 0;
      if (zip.files["_tags.json"]) {
        try {
          const tagsJson = await zip.files["_tags.json"].async("text");
          const tags = JSON.parse(tagsJson);
          if (Array.isArray(tags)) {
            const existingTags = await db.getAllTags(this.state.activeDb);
            const existingNames = new Set(existingTags.map((t) => t.name));
            for (const t of tags) {
              if (!existingNames.has(t.name)) {
                await db.putTag(t, this.state.activeDb);
                tagCount++;
              }
            }
          }
        } catch {
          // ignore invalid tags JSON
        }
      }

      // Restore per-note tags from metadata if present
      let tagsRestoredCount = 0;
      if (zip.files["_notes.json"] && importedNotes.length > 0) {
        try {
          const metaJson = await zip.files["_notes.json"].async("text");
          const notesMeta = JSON.parse(metaJson);
          if (Array.isArray(notesMeta)) {
            const metaMap = new Map(notesMeta.map((m) => [m.title, m]));
            for (const note of importedNotes) {
              const meta = metaMap.get(note.title);
              if (meta && meta.tags && meta.tags.length > 0) {
                note.tags = meta.tags;
                tagsRestoredCount += meta.tags.length;
                await db.updateNote(note, this.state.activeDb);
              }
            }
          }
        } catch {
          // ignore
        }
      }

      const parts = [];
      if (importedNotes.length > 0) parts.push(`${importedNotes.length} note${importedNotes.length !== 1 ? "s" : ""}`);
      if (templateCount > 0) parts.push(`${templateCount} template${templateCount !== 1 ? "s" : ""}`);
      if (tagCount > 0) parts.push(`${tagCount} predefined tag${tagCount !== 1 ? "s" : ""}`);
      if (tagsRestoredCount > 0) parts.push(`${tagsRestoredCount} note tag${tagsRestoredCount !== 1 ? "s" : ""} restored`);
      if (skippedCount > 0) parts.push(`${skippedCount} duplicate${skippedCount !== 1 ? "s" : ""} skipped`);
      this.showAlert("Import Complete", `Imported ${parts.join(", ")}.`);
    } catch {
      this.showAlert("Import Failed", "Failed to read ZIP archive. Please ensure it's a valid .zip file.");
    }
    event.target.value = "";
  };

  handleFullBackupImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const JSZip = require("jszip");
    try {
      const zip = await JSZip.loadAsync(file);

      // Detect format: new full backup has _workspace.json or _manifest.json
      const hasManifest = !!zip.files["_manifest.json"];
      const hasWorkspaceJson = !!zip.files["_workspace.json"];

      if (!hasManifest && !hasWorkspaceJson) {
        // Legacy format — delegate to existing ZIP import
        this.handleZipImport(event);
        return;
      }

      if (hasManifest) {
        // All-workspaces backup: each top-level folder is a workspace
        const manifestJson = await zip.files["_manifest.json"].async("text");
        const manifest = JSON.parse(manifestJson);
        const totalCounts = { notes: 0, pins: 0, tags: 0, snippets: 0, versions: 0, images: 0 };
        let wsCount = 0;

        for (const wsInfo of (manifest.workspaces || [])) {
          const wsFile = zip.files[`${wsInfo.name}/_workspace.json`];
          if (!wsFile) continue;
          const wsJson = await wsFile.async("text");
          const wsData = JSON.parse(wsJson);

          // Ensure workspace exists
          let targetDb = wsInfo.dbName;
          const existing = db.getWorkspaces();
          if (!existing.some(w => w.dbName === targetDb)) {
            const created = db.addWorkspace(wsInfo.name);
            if (created) targetDb = created.dbName;
          }

          const counts = await db.importWorkspaceData(wsData, targetDb);
          for (const k of Object.keys(totalCounts)) totalCounts[k] += (counts[k] || 0);
          wsCount++;
        }

        // Refresh current workspace
        const notes = await db.getAllNotes(this.state.activeDb);
        const pins = await db.getAllPins(this.state.activeDb);
        this.setState({
          allnotes: notes,
          pinnedNotes: pins || [],
          workspaces: db.getWorkspaces(),
        }, () => {
          this.handleSortNotes(this.state.sortby);
          this.initializeFuse();
        });

        const parts = [];
        if (totalCounts.notes > 0) parts.push(`${totalCounts.notes} note${totalCounts.notes !== 1 ? "s" : ""}`);
        if (totalCounts.snippets > 0) parts.push(`${totalCounts.snippets} template${totalCounts.snippets !== 1 ? "s" : ""}`);
        if (totalCounts.tags > 0) parts.push(`${totalCounts.tags} tag${totalCounts.tags !== 1 ? "s" : ""}`);
        if (totalCounts.versions > 0) parts.push(`${totalCounts.versions} version${totalCounts.versions !== 1 ? "s" : ""}`);
        if (totalCounts.images > 0) parts.push(`${totalCounts.images} image${totalCounts.images !== 1 ? "s" : ""}`);
        if (totalCounts.pins > 0) parts.push(`${totalCounts.pins} pin${totalCounts.pins !== 1 ? "s" : ""}`);
        this.showAlert("Full Import Complete", `Imported ${parts.join(", ")} across ${wsCount} workspace${wsCount !== 1 ? "s" : ""}.`);
      } else {
        // Single-workspace full backup
        const wsJson = await zip.files["_workspace.json"].async("text");
        const wsData = JSON.parse(wsJson);
        const counts = await db.importWorkspaceData(wsData, this.state.activeDb);

        // Refresh state
        const notes = await db.getAllNotes(this.state.activeDb);
        const pins = await db.getAllPins(this.state.activeDb);
        this.setState({
          allnotes: notes,
          pinnedNotes: pins || [],
        }, () => {
          this.handleSortNotes(this.state.sortby);
          this.initializeFuse();
        });

        const parts = [];
        if (counts.notes > 0) parts.push(`${counts.notes} note${counts.notes !== 1 ? "s" : ""}`);
        if (counts.snippets > 0) parts.push(`${counts.snippets} template${counts.snippets !== 1 ? "s" : ""}`);
        if (counts.tags > 0) parts.push(`${counts.tags} tag${counts.tags !== 1 ? "s" : ""}`);
        if (counts.versions > 0) parts.push(`${counts.versions} version${counts.versions !== 1 ? "s" : ""}`);
        if (counts.images > 0) parts.push(`${counts.images} image${counts.images !== 1 ? "s" : ""}`);
        if (counts.pins > 0) parts.push(`${counts.pins} pin${counts.pins !== 1 ? "s" : ""}`);
        this.showAlert("Import Complete", `Imported ${parts.join(", ")}.`);
      }
    } catch (err) {
      this.showAlert("Import Failed", err.message || "Failed to read backup archive.");
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
      const currentNote = allnotes.find(n => n.noteid === this.state.noteid) || {};
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
          sidebarCollapsed={this.state.sidebarCollapsed}
          onToggleCollapse={() => this.setState((s) => {
            const next = !s.sidebarCollapsed;
            localStorage.setItem("noteapp_sidebar_collapsed", next);
            return { sidebarCollapsed: next };
          })}
          isPinned={pinnedNotes.includes(this.state.noteid)}
          onPinNote={this.handlePinNote}
          onUnpinNote={this.handleUnpinNote}
          noteCreatedAt={currentNote.created_at}
          noteUpdatedAt={currentNote.updated_at}
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
          activeDb={this.state.activeDb}
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
                    handleEditNoteBtn={this.handleEditNoteBtn}
                    handleDeleteNote={this.handleDeleteNote}
                    handleDownloadNote={this.handleDownloadNote}
                    handleDownloadPdf={this.handleDownloadPdf}
                    handleMoveNote={this.handleMoveNote}
                    onShowHistory={() => this.setState({ showVersionHistory: true })}
                    workspaces={workspaces}
                    activeDb={this.state.activeDb}
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
                    handleEditNoteBtn={this.handleEditNoteBtn}
                    handleDeleteNote={this.handleDeleteNote}
                    handleDownloadNote={this.handleDownloadNote}
                    handleDownloadPdf={this.handleDownloadPdf}
                    handleMoveNote={this.handleMoveNote}
                    onShowHistory={() => this.setState({ showVersionHistory: true })}
                    workspaces={workspaces}
                    activeDb={this.state.activeDb}
                />
            ))}
        </>
    );


    if (this.state.locked) {
      return (
        <div className={`app-container ${this.state.darkMode ? "dark" : ""}`}>
          <LockScreen onUnlock={this._handleUnlock} />
        </div>
      );
    }

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
            allNotes={allnotes}
            onUploadNote={this.handleNotesUpload}
            onImportFromGist={this.handleImportFromGist}
            onClosePages={() => {
              this.setState({ showSettings: false, showTableConverter: false });
              if (window.location.hash) window.history.pushState(null, "", window.location.pathname);
            }}
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
              if (this.state.showSettings) {
                // Close settings — go back to clean URL
                this.setState({ showSettings: false });
                window.history.pushState(null, "", window.location.pathname);
              } else {
                this.setState({ showSettings: true, showTableConverter: false, viewingArchive: false, settingsTab: "general" });
                window.history.pushState(null, "", "#settings");
              }
            }}
            onOpenTableConverter={() => {
              if (this.state.activepage === "editnote") {
                this.setState({ showNavConfirm: true, pendingPage: "tableConverter" });
                return;
              }
              if (this.state.showTableConverter) {
                this.setState({ showTableConverter: false });
                window.history.pushState(null, "", window.location.pathname);
              } else {
                this.setState({ showTableConverter: true, showSettings: false });
                window.history.pushState(null, "", "#table-converter");
              }
            }}
            onAddWorkspace={this.handleAddWorkspace}
            onToggleDarkMode={() => this.setState((s) => {
              const next = !s.darkMode;
              localStorage.setItem("noteapp_dark_mode", next);
              return { darkMode: next };
            })}
            isEditing={this.state.activepage === "editnote"}
            isHomePage={this.state.action === "homepage"}
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
              onLoadArchive={async (showAll) => {
                const archived = await db.getArchivedNotes(showAll ? undefined : this.state.activeDb);
                this.setState({ archivedNotes: archived });
              }}
              onBackup={(exportAll) => this.handleNotesBackup(exportAll)}
              onUploadNote={this.handleNotesUpload}
              onZipImport={this.handleZipImport}
              onFullBackupImport={this.handleFullBackupImport}
              onRestoreFromGist={this.handleRestoreFromGist}
              onImportFromGist={this.handleImportFromGist}
              onPurgeArchive={async (purgeAll) => {
                await db.purgeArchive(purgeAll ? undefined : this.state.activeDb);
                const remaining = await db.getArchivedNotes(purgeAll ? undefined : this.state.activeDb);
                this.setState({ archivedNotes: remaining });
                this.showAlert("Archive Purged", purgeAll ? "All archived notes have been permanently deleted." : "Archived notes for this workspace have been deleted.");
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
              onSyncIntervalChange={async (ms) => {
                await gistSync.setSyncInterval(ms, this.state.activeDb);
                this._startSyncInterval();
              }}
              onLockTimeoutChange={() => {
                this._teardownLockTimeout();
                this._setupLockTimeout();
              }}
              onClose={() => {
                this.setState({ showSettings: false });
                window.history.pushState(null, "", window.location.pathname);
              }}
              initialTab={this.state.settingsTab}
              onTabChange={(tab) => {
                this.setState({ settingsTab: tab });
                window.history.pushState(null, "", `#settings/${tab}`);
              }}
              allNotes={allnotes}
              onGdriveRestore={async (notes) => {
                for (const n of notes) {
                  await db.updateNote(n, this.state.activeDb);
                }
                const refreshed = await db.getAllNotes(this.state.activeDb);
                this.setState({ allnotes: refreshed }, () => {
                  this.handleSortNotes(this.state.sortby);
                  this.initializeFuse();
                });
                this.showAlert("Restored", `${notes.length} note${notes.length !== 1 ? "s" : ""} restored from Google Drive.`);
              }}
            />
          ) : this.state.showTableConverter ? (
            <div className="full-table-converter">
              <TableConverter
                darkMode={this.state.darkMode}
                fullPage
                onClose={() => {
                  this.setState({ showTableConverter: false });
                  window.history.pushState(null, "", window.location.pathname);
                }}
              />
            </div>
          ) : (
            <>
            <div className="main-split">
              <div className="main-split-primary">
                {RightNavbar}
                {ActivePage}
                {this.state.action !== "homepage" && this.state.activepage === "viewnote" && (() => {
                  const cn = allnotes.find(n => n.noteid === this.state.noteid);
                  const tags = (cn && cn.tags) || [];
                  return tags.length > 0 ? (
                    <div className="note-tag-bar">
                      <span className="note-tag-bar-label">Tags:</span>
                      <div className="note-tag-bar-tags">
                        {tags.map(tag => (
                          <span key={tag} className="tag" onClick={() => {
                            this.setState({ searchQuery: `tag:${tag}` }, () => {
                              this.handleSearchNotes({ target: { value: `tag:${tag}` } });
                            });
                          }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
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