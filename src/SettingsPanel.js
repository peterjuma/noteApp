import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Check, Trash2, PencilLine, ArrowLeftRight,
  Upload, Download, FolderUp, RotateCcw, Archive,
  Moon, Sun, Save, Sparkles, Settings, FileText, Wand2,
  RefreshCw, Cloud, CloudOff, Link2, ExternalLink, HardDrive, Star, Tag, Lock, Fingerprint, Clock,
} from "lucide-react";
import * as snippetService from "./services/snippets";
import * as gistSync from "./services/gistSync";
import * as tagManager from "./services/tagManager";
import { isPinSet, setPin, removePin, verifyPin, getSessionTimeout, setSessionTimeout, isBiometricAvailable, isBiometricEnabled, registerBiometric, removeBiometric } from "./LockScreen";

function SettingsPanel({
  darkMode,
  onToggleDarkMode,
  autoSave,
  onToggleAutoSave,
  tagSuggestEnabled,
  onToggleTagSuggest,
  vimMode,
  onToggleVimMode,
  profileName,
  onChangeProfileName,
  workspaces,
  activeDb,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  defaultWorkspace,
  onSetDefaultWorkspace,
  archivedNotes,
  onRestoreNote,
  onPermanentDelete,
  onLoadArchive,
  onBackup,
  onUploadNote,
  onZipImport,
  onPurgeArchive,
  onPurgeWorkspace,
  onPurgeAllWorkspaces,
  onSyncNow,
  showConfirm,
  onClose,
  syncInterval,
  onSyncIntervalChange,
  allNotes,
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [wsName, setWsName] = useState("");
  const [showNewWs, setShowNewWs] = useState(false);
  const [editingWs, setEditingWs] = useState(null);
  const [editName, setEditName] = useState("");
  // Tag management state
  const [predefinedTags, setPredefinedTags] = useState([]);
  const [newTagName, setNewTagName] = useState("");
  const [editingTag, setEditingTag] = useState(null);
  const [editTagName, setEditTagName] = useState("");
  const [autoHarvest, setAutoHarvest] = useState(tagManager.isAutoHarvestEnabled());
  const newTagInputRef = useRef(null);
  const [snippets, setSnippets] = useState([]);
  const [editingSnippet, setEditingSnippet] = useState(null); // null | "new" | snippet id
  const [snippetName, setSnippetName] = useState("");
  const [snippetContent, setSnippetContent] = useState("");
  const [snippetCategory, setSnippetCategory] = useState("zendesk");
  const [syncEnabled, setSyncEnabled] = useState(gistSync.isSyncEnabled());
  const [syncToken, setSyncToken] = useState(gistSync.getToken());
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "success" | "error"
  const [syncMessage, setSyncMessage] = useState("");
  const [syncUser, setSyncUser] = useState(null);
  const wsInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // PIN lock state
  const [pinEnabled, setPinEnabled] = useState(isPinSet());
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinCurrentValue, setPinCurrentValue] = useState("");
  const [lockTimeout, setLockTimeout] = useState(getSessionTimeout());
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled());
  const pinInputRef = useRef(null);

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvail);
  }, []);

  // Load archive when switching to archive tab
  useEffect(() => {
    if (activeTab === "archive" && onLoadArchive) {
      onLoadArchive();
    }
    if (activeTab === "templates") {
      snippetService.ensureDefaults(activeDb).then(setSnippets);
    }
    if (activeTab === "tags") {
      setPredefinedTags(tagManager.getPredefinedTags());
    }
    if (activeTab === "sync" && syncToken) {
      gistSync.validateToken().then((result) => {
        if (result.valid) setSyncUser(result);
        else setSyncUser(null);
      });
    }
  }, [activeTab, onLoadArchive, syncToken]);

  // Focus workspace name input
  useEffect(() => {
    if (showNewWs && wsInputRef.current) wsInputRef.current.focus();
  }, [showNewWs]);

  useEffect(() => {
    if (editingWs && renameInputRef.current) renameInputRef.current.focus();
  }, [editingWs]);

  const handleCreateWorkspace = () => {
    if (wsName.trim()) {
      onAddWorkspace(wsName.trim());
      setWsName("");
      setShowNewWs(false);
    }
  };

  const handleRename = (dbName) => {
    if (editName.trim()) {
      onRenameWorkspace(dbName, editName.trim());
      setEditingWs(null);
      setEditName("");
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "workspaces", label: "Workspaces", icon: ArrowLeftRight },
    { id: "tags", label: "Tags", icon: Tag },
    { id: "data", label: "Data", icon: HardDrive },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "sync", label: "Sync", icon: Cloud },
  ];

  return (
    <div className="settings-fullpage">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">
          <X size={15} /> Close
        </button>
      </div>

      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? "settings-tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {/* ─── General Tab ─── */}
        {activeTab === "general" && (
          <>
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>
            <label className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                  Dark Mode
                </span>
              </div>
              <button
                className={`settings-switch ${darkMode ? "settings-switch-on" : ""}`}
                onClick={onToggleDarkMode}
                role="switch"
                aria-checked={darkMode}
              >
                <span className="settings-switch-thumb" />
              </button>
            </label>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Editor</h3>
            <label className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  <Save size={16} />
                  Auto-save
                </span>
                <span className="settings-toggle-hint">Automatically save after 3 seconds of inactivity</span>
              </div>
              <button
                className={`settings-switch ${autoSave ? "settings-switch-on" : ""}`}
                onClick={onToggleAutoSave}
                role="switch"
                aria-checked={autoSave}
              >
                <span className="settings-switch-thumb" />
              </button>
            </label>

            <label className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  <Sparkles size={16} />
                  Tag Suggestions
                </span>
                <span className="settings-toggle-hint">Show tag suggestion button on notes without tags</span>
              </div>
              <button
                className={`settings-switch ${tagSuggestEnabled ? "settings-switch-on" : ""}`}
                onClick={onToggleTagSuggest}
                role="switch"
                aria-checked={tagSuggestEnabled}
              >
                <span className="settings-switch-thumb" />
              </button>
            </label>

            <label className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  ⌨️ Vim Keybindings
                </span>
                <span className="settings-toggle-hint">Enable Vim-style keyboard navigation in the editor</span>
              </div>
              <button
                className={`settings-switch ${vimMode ? "settings-switch-on" : ""}`}
                onClick={onToggleVimMode}
                role="switch"
                aria-checked={vimMode}
              >
                <span className="settings-switch-thumb" />
              </button>
            </label>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Device Profile</h3>
            <div className="settings-toggle-row" style={{ cursor: "default" }}>
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  Profile Name
                </span>
                <span className="settings-toggle-hint">Identifies this browser/device in backup filenames and sync</span>
              </div>
              <input
                type="text"
                className="settings-input"
                style={{ maxWidth: 180, textAlign: "right" }}
                value={profileName || ""}
                onChange={(e) => onChangeProfileName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="e.g. mac-chrome"
              />
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Security</h3>

            {/* PIN Lock toggle */}
            <label className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  <Lock size={16} />
                  PIN Lock
                </span>
                <span className="settings-toggle-hint">Require a PIN to access your notes on this device</span>
              </div>
              <button
                className={`settings-switch ${pinEnabled ? "settings-switch-on" : ""}`}
                onClick={() => {
                  if (pinEnabled) {
                    // Turning off: require current PIN
                    setShowPinForm("remove");
                    setPinCurrentValue("");
                    setPinError("");
                    setTimeout(() => pinInputRef.current?.focus(), 50);
                  } else {
                    // Turning on: set new PIN
                    setShowPinForm("set");
                    setPinValue("");
                    setPinConfirm("");
                    setPinError("");
                    setTimeout(() => pinInputRef.current?.focus(), 50);
                  }
                }}
                role="switch"
                aria-checked={pinEnabled}
              >
                <span className="settings-switch-thumb" />
              </button>
            </label>

            {/* Set PIN form */}
            {showPinForm === "set" && (
              <div className="settings-pin-form">
                <input
                  ref={pinInputRef}
                  type="password"
                  className="settings-input"
                  value={pinValue}
                  onChange={(e) => { setPinValue(e.target.value); setPinError(""); }}
                  placeholder="Enter new PIN (4+ characters)"
                  autoComplete="off"
                  maxLength={32}
                />
                <input
                  type="password"
                  className="settings-input"
                  value={pinConfirm}
                  onChange={(e) => { setPinConfirm(e.target.value); setPinError(""); }}
                  placeholder="Confirm PIN"
                  autoComplete="off"
                  maxLength={32}
                  onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("pin-save-btn")?.click(); }}
                />
                {pinError && <p className="settings-pin-error">{pinError}</p>}
                <div className="settings-pin-actions">
                  <button
                    id="pin-save-btn"
                    className="settings-btn-sm settings-btn-primary"
                    onClick={async () => {
                      if (pinValue.length < 4) { setPinError("PIN must be at least 4 characters"); return; }
                      if (pinValue !== pinConfirm) { setPinError("PINs do not match"); return; }
                      await setPin(pinValue);
                      setPinEnabled(true);
                      setShowPinForm(false);
                      setPinValue("");
                      setPinConfirm("");
                    }}
                  >
                    <Check size={14} /> Enable
                  </button>
                  <button className="settings-btn-sm" onClick={() => { setShowPinForm(false); setPinValue(""); setPinConfirm(""); setPinError(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Remove PIN form */}
            {showPinForm === "remove" && (
              <div className="settings-pin-form">
                <input
                  ref={pinInputRef}
                  type="password"
                  className="settings-input"
                  value={pinCurrentValue}
                  onChange={(e) => { setPinCurrentValue(e.target.value); setPinError(""); }}
                  placeholder="Enter current PIN to disable"
                  autoComplete="off"
                  maxLength={32}
                  onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("pin-remove-btn")?.click(); }}
                />
                {pinError && <p className="settings-pin-error">{pinError}</p>}
                <div className="settings-pin-actions">
                  <button
                    id="pin-remove-btn"
                    className="settings-btn-sm settings-btn-danger"
                    onClick={async () => {
                      const valid = await verifyPin(pinCurrentValue);
                      if (!valid) { setPinError("Incorrect PIN"); setPinCurrentValue(""); return; }
                      removePin();
                      setPinEnabled(false);
                      setBiometricOn(false);
                      setShowPinForm(false);
                      setPinCurrentValue("");
                      setLockTimeout(0);
                    }}
                  >
                    <Trash2 size={14} /> Disable
                  </button>
                  <button className="settings-btn-sm" onClick={() => { setShowPinForm(false); setPinCurrentValue(""); setPinError(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Change PIN */}
            {pinEnabled && !showPinForm && (
              <div className="settings-toggle-row" style={{ cursor: "default" }}>
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">
                    Change PIN
                  </span>
                  <span className="settings-toggle-hint">Update your current PIN</span>
                </div>
                <button
                  className="settings-btn-sm"
                  onClick={() => {
                    setShowPinForm("change");
                    setPinCurrentValue("");
                    setPinValue("");
                    setPinConfirm("");
                    setPinError("");
                    setTimeout(() => pinInputRef.current?.focus(), 50);
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {/* Change PIN form */}
            {showPinForm === "change" && (
              <div className="settings-pin-form">
                <input
                  ref={pinInputRef}
                  type="password"
                  className="settings-input"
                  value={pinCurrentValue}
                  onChange={(e) => { setPinCurrentValue(e.target.value); setPinError(""); }}
                  placeholder="Current PIN"
                  autoComplete="off"
                  maxLength={32}
                />
                <input
                  type="password"
                  className="settings-input"
                  value={pinValue}
                  onChange={(e) => { setPinValue(e.target.value); setPinError(""); }}
                  placeholder="New PIN (4+ characters)"
                  autoComplete="off"
                  maxLength={32}
                />
                <input
                  type="password"
                  className="settings-input"
                  value={pinConfirm}
                  onChange={(e) => { setPinConfirm(e.target.value); setPinError(""); }}
                  placeholder="Confirm new PIN"
                  autoComplete="off"
                  maxLength={32}
                  onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("pin-change-btn")?.click(); }}
                />
                {pinError && <p className="settings-pin-error">{pinError}</p>}
                <div className="settings-pin-actions">
                  <button
                    id="pin-change-btn"
                    className="settings-btn-sm settings-btn-primary"
                    onClick={async () => {
                      const valid = await verifyPin(pinCurrentValue);
                      if (!valid) { setPinError("Current PIN is incorrect"); setPinCurrentValue(""); return; }
                      if (pinValue.length < 4) { setPinError("New PIN must be at least 4 characters"); return; }
                      if (pinValue !== pinConfirm) { setPinError("New PINs do not match"); return; }
                      await setPin(pinValue);
                      setShowPinForm(false);
                      setPinValue("");
                      setPinConfirm("");
                      setPinCurrentValue("");
                    }}
                  >
                    <Check size={14} /> Update PIN
                  </button>
                  <button className="settings-btn-sm" onClick={() => { setShowPinForm(false); setPinValue(""); setPinConfirm(""); setPinCurrentValue(""); setPinError(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Session timeout */}
            {pinEnabled && (
              <div className="settings-toggle-row" style={{ cursor: "default" }}>
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">
                    <Clock size={16} />
                    Lock After
                  </span>
                  <span className="settings-toggle-hint">Re-lock after a period of inactivity or when switching tabs</span>
                </div>
                <select
                  className="settings-input"
                  style={{ maxWidth: 160, flex: "none" }}
                  value={lockTimeout}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLockTimeout(val);
                    setSessionTimeout(val);
                  }}
                >
                  <option value={0}>Tab close only</option>
                  <option value={-1}>On tab switch</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={900000}>15 minutes</option>
                  <option value={1800000}>30 minutes</option>
                  <option value={3600000}>1 hour</option>
                </select>
              </div>
            )}

            {/* Biometric unlock */}
            {pinEnabled && biometricAvail && (
              <label className="settings-toggle-row">
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">
                    <Fingerprint size={16} />
                    Biometric Unlock
                  </span>
                  <span className="settings-toggle-hint">Use fingerprint or Face ID to unlock instead of PIN</span>
                </div>
                <button
                  className={`settings-switch ${biometricOn ? "settings-switch-on" : ""}`}
                  onClick={async () => {
                    if (biometricOn) {
                      removeBiometric();
                      setBiometricOn(false);
                    } else {
                      try {
                        await registerBiometric();
                        setBiometricOn(true);
                      } catch {
                        setPinError("Biometric registration failed");
                      }
                    }
                  }}
                  role="switch"
                  aria-checked={biometricOn}
                >
                  <span className="settings-switch-thumb" />
                </button>
              </label>
            )}
          </div>
          </>
        )}

        {/* ─── Workspaces Tab ─── */}
        {activeTab === "workspaces" && (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">Workspaces</h3>
              <button className="settings-btn-sm" onClick={() => setShowNewWs(true)}>
                <Plus size={14} /> New
              </button>
            </div>
            <p className="settings-hint">Each workspace has its own separate database of notes.</p>

            {showNewWs && (
              <div className="settings-inline-form">
                <input
                  ref={wsInputRef}
                  type="text"
                  className="settings-input"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateWorkspace();
                    if (e.key === "Escape") setShowNewWs(false);
                  }}
                  placeholder="Workspace name..."
                />
                <button className="settings-btn-sm settings-btn-primary" onClick={handleCreateWorkspace} disabled={!wsName.trim()}>
                  Create
                </button>
                <button className="settings-btn-sm" onClick={() => setShowNewWs(false)}>
                  Cancel
                </button>
              </div>
            )}

            <ul className="settings-ws-list">
              {workspaces.map((w) => (
                <li key={w.dbName} className={`settings-ws-item ${w.dbName === activeDb ? "settings-ws-item-active" : ""}`}>
                  {editingWs === w.dbName ? (
                    <div className="settings-inline-form" style={{ flex: 1 }}>
                      <input
                        ref={renameInputRef}
                        type="text"
                        className="settings-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(w.dbName);
                          if (e.key === "Escape") setEditingWs(null);
                        }}
                      />
                      <button className="settings-btn-sm settings-btn-primary" onClick={() => handleRename(w.dbName)}>Save</button>
                      <button className="settings-btn-sm" onClick={() => setEditingWs(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="settings-ws-name"
                        onClick={() => { onSwitchWorkspace(w.dbName); }}
                      >
                        {w.name}
                        {w.dbName === activeDb && <Check size={14} className="settings-ws-check" />}
                      </span>
                      <div className="settings-ws-actions">
                        {w.dbName === defaultWorkspace ? (
                          <Star size={13} className="settings-ws-default-star" title="Default workspace" />
                        ) : (
                          <button
                            className="icon-btn"
                            title="Set as default"
                            onClick={() => onSetDefaultWorkspace(w.dbName)}
                          >
                            <Star size={13} />
                          </button>
                        )}
                        {w.dbName !== "notesdb" && (
                          <>
                            <button
                              className="icon-btn"
                              title="Rename"
                              onClick={() => { setEditingWs(w.dbName); setEditName(w.name); }}
                            >
                              <PencilLine size={13} />
                            </button>
                            <button
                              className="icon-btn icon-btn-danger"
                              title="Delete"
                              onClick={() => {
                                showConfirm(
                                  "Delete Workspace",
                                  `Delete workspace "${w.name}"? All notes in this workspace will be lost.`,
                                  () => onDeleteWorkspace(w.dbName),
                                  { confirmText: "Delete", danger: true }
                                );
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Data & Archive Tab ─── */}
        {activeTab === "data" && (
          <div className="settings-section">
            <h3 className="settings-section-title">Import & Export</h3>
            <div className="settings-actions-grid">
              <button className="settings-action-card" onClick={() => fileInputRef.current.click()}>
                <Upload size={20} />
                <span className="settings-action-title">Upload Note</span>
                <span className="settings-action-desc">Import a .md file</span>
              </button>
              <button className="settings-action-card" onClick={() => zipInputRef.current.click()}>
                <FolderUp size={20} />
                <span className="settings-action-title">Import Archive</span>
                <span className="settings-action-desc">Import notes from .zip</span>
              </button>
              <button className="settings-action-card" onClick={onBackup}>
                <Download size={20} />
                <span className="settings-action-title">Download Backup</span>
                <span className="settings-action-desc">Export all notes as .zip</span>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".md" className="hidden" onChange={onUploadNote} />
            <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={onZipImport} />

            {/* Danger Zone */}
            <h3 className="settings-section-title settings-danger-title" style={{ marginTop: "32px" }}>
              Danger Zone
            </h3>
            <div className="settings-danger-zone">
              <div className="settings-danger-item">
                <div className="settings-danger-info">
                  <span className="settings-danger-label">Purge current workspace</span>
                  <span className="settings-danger-desc">
                    Delete all notes, pins, and images in "{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}" workspace
                  </span>
                </div>
                <button
                  className="settings-danger-btn"
                  onClick={() => showConfirm(
                    "Purge Workspace",
                    `This will permanently delete ALL notes, pins, and images in the "${workspaces.find(w => w.dbName === activeDb)?.name || "Default"}" workspace. This cannot be undone.`,
                    () => onPurgeWorkspace(activeDb),
                    { confirmText: "Purge Workspace", danger: true }
                  )}
                >
                  Purge
                </button>
              </div>

              <div className="settings-danger-item">
                <div className="settings-danger-info">
                  <span className="settings-danger-label">Delete all workspaces</span>
                  <span className="settings-danger-desc">
                    Remove all workspaces and their data. Resets to a single empty Default workspace.
                  </span>
                </div>
                <button
                  className="settings-danger-btn"
                  onClick={() => showConfirm(
                    "Delete All Workspaces",
                    "This will permanently delete ALL notes across ALL workspaces, remove all non-default workspaces, and reset to an empty Default workspace. This cannot be undone.",
                    onPurgeAllWorkspaces,
                    { confirmText: "Delete Everything", danger: true }
                  )}
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Archive Tab ─── */}
        {activeTab === "archive" && (
          <div className="settings-section">
            <div className="bin-page-header" style={{ padding: "0 0 16px" }}>
              <div className="bin-page-title">
                <Archive size={18} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Archive</h3>
                <span className="bin-page-count">{archivedNotes.length} item{archivedNotes.length !== 1 ? "s" : ""}</span>
              </div>
              {archivedNotes.length > 0 && (
                <button
                  className="bin-purge-btn"
                  onClick={() => showConfirm(
                    "Purge Archive",
                    `Permanently delete all ${archivedNotes.length} archived note${archivedNotes.length !== 1 ? "s" : ""}? This cannot be undone.`,
                    onPurgeArchive,
                    { confirmText: "Purge All", danger: true }
                  )}
                >
                  Empty Archive
                </button>
              )}
            </div>
            <p className="settings-hint">Notes moved to archive can be restored or permanently deleted.</p>

            {archivedNotes.length > 0 ? (
              <div className="bin-page-list" style={{ overflow: "visible" }}>
                {archivedNotes.map((note) => (
                  <div key={note.noteid} className="bin-page-item">
                    <div className="bin-page-item-info">
                      <span className="bin-page-item-title">{note.title}</span>
                      <span className="bin-page-item-meta">
                        {note.sourceWorkspace === "notesdb" ? "Default" : (note.sourceWorkspace || "").replace("notesdb_", "")}
                        {note.archivedAt && ` · ${new Date(note.archivedAt).toLocaleDateString()}`}
                      </span>
                      {note.body && (
                        <span className="bin-page-item-preview">{note.body.slice(0, 120)}{note.body.length > 120 ? "..." : ""}</span>
                      )}
                    </div>
                    <div className="bin-page-item-actions">
                      <button onClick={() => onRestoreNote(note.noteid)} className="btn-save" style={{ padding: "5px 12px", fontSize: "12px" }} title="Restore to workspace">
                        <RotateCcw size={13} /> Restore
                      </button>
                      <button onClick={() => onPermanentDelete(note.noteid)} className="btn-cancel" style={{ padding: "5px 12px", fontSize: "12px", color: "#dc2626" }} title="Delete forever">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="settings-empty">
                <p>No archived notes</p>
                <p style={{ fontSize: 12, color: "#9ca3af" }}>Archived notes will appear here when you delete them.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Templates Tab ─── */}
        {activeTab === "templates" && (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">Response Templates</h3>
              <button
                className="settings-btn-sm"
                onClick={() => {
                  setEditingSnippet("new");
                  setSnippetName("");
                  setSnippetContent("");
                  setSnippetCategory("zendesk");
                }}
              >
                <Plus size={14} /> New
              </button>
            </div>
            <p className="settings-hint">
              Templates appear in the editor's slash command menu. Type <code>/</code> then the template name to insert. Use {"{{"}variable{"}}"} for placeholders.
            </p>

            {/* New / Edit form */}
            {editingSnippet && (
              <div className="settings-snippet-form">
                <div className="settings-inline-form">
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Template name..."
                    value={snippetName}
                    onChange={(e) => setSnippetName(e.target.value)}
                    autoFocus
                  />
                  <select
                    className="settings-input"
                    style={{ maxWidth: 120 }}
                    value={snippetCategory}
                    onChange={(e) => setSnippetCategory(e.target.value)}
                  >
                    <option value="zendesk">Zendesk</option>
                    <option value="general">General</option>
                    <option value="code">Code</option>
                  </select>
                </div>
                <textarea
                  className="settings-snippet-textarea"
                  placeholder="Template content... Use {{variable}} for placeholders."
                  value={snippetContent}
                  onChange={(e) => setSnippetContent(e.target.value)}
                  rows={5}
                />
                <div className="settings-inline-form" style={{ justifyContent: "flex-end" }}>
                  <button
                    className="settings-btn-sm"
                    onClick={() => setEditingSnippet(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="settings-btn-sm settings-btn-primary"
                    disabled={!snippetName.trim() || !snippetContent.trim()}
                    onClick={async () => {
                      if (editingSnippet === "new") {
                        await snippetService.addSnippet(snippetName, snippetContent, snippetCategory, activeDb);
                      } else {
                        await snippetService.updateSnippet(editingSnippet, {
                          name: snippetName,
                          content: snippetContent,
                          category: snippetCategory,
                        }, activeDb);
                      }
                      setSnippets(await snippetService.getSnippets(activeDb));
                      setEditingSnippet(null);
                    }}
                  >
                    {editingSnippet === "new" ? "Create" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {snippets.length > 0 ? (
              <ul className="settings-ws-list">
                {snippets.map((s) => (
                  <li key={s.id} className="settings-ws-item">
                    <div className="settings-archive-info" style={{ flex: 1 }}>
                      <span className="settings-archive-title">{s.name}</span>
                      <span className="settings-archive-meta">{s.category} · {s.content.length} chars</span>
                    </div>
                    <div className="settings-ws-actions" style={{ opacity: 1 }}>
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => {
                          setEditingSnippet(s.id);
                          setSnippetName(s.name);
                          setSnippetContent(s.content);
                          setSnippetCategory(s.category);
                        }}
                      >
                        <PencilLine size={13} />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Delete"
                        onClick={async () => {
                          await snippetService.deleteSnippet(s.id, activeDb);
                          setSnippets(await snippetService.getSnippets(activeDb));
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="settings-empty">
                <p>No templates yet</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Tags Tab ─── */}
        {activeTab === "tags" && (
          <div className="settings-section">
            <h3 className="settings-section-title">Tag Management</h3>
            <p className="settings-hint">
              Pre-define tags to keep your notes organized. These appear as autocomplete suggestions when tagging notes.
            </p>

            {/* Add new tag + auto-harvest in a card */}
            <div className="tag-mgmt-card">
              <div className="tag-mgmt-add">
                <input
                  ref={newTagInputRef}
                  type="text"
                  className="tag-mgmt-input"
                  placeholder="Enter a tag name…"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagName.trim()) {
                      setPredefinedTags(tagManager.addPredefinedTag(newTagName));
                      setNewTagName("");
                    }
                  }}
                />
                <button
                  className="tag-mgmt-add-btn"
                  disabled={!newTagName.trim()}
                  onClick={() => {
                    setPredefinedTags(tagManager.addPredefinedTag(newTagName));
                    setNewTagName("");
                    if (newTagInputRef.current) newTagInputRef.current.focus();
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <label className="tag-mgmt-harvest-toggle">
                <input
                  type="checkbox"
                  className="toggle-input"
                  checked={autoHarvest}
                  onChange={() => {
                    const next = !autoHarvest;
                    tagManager.setAutoHarvest(next);
                    setAutoHarvest(next);
                  }}
                />
                <Wand2 size={13} />
                <span>Auto-add new tags from notes</span>
              </label>
            </div>

            {/* Tag list */}
            {predefinedTags.length > 0 ? (() => {
              const usageCounts = tagManager.getTagUsageCounts(allNotes || []);
              return (
                <div className="tag-mgmt-grid">
                  {predefinedTags.map((t) => (
                    <div key={t.name} className="tag-mgmt-chip">
                      {editingTag === t.name ? (
                        <div className="tag-mgmt-edit-row">
                          <input
                            type="text"
                            className="tag-mgmt-input tag-mgmt-input-sm"
                            value={editTagName}
                            autoFocus
                            onChange={(e) => setEditTagName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editTagName.trim()) {
                                setPredefinedTags(tagManager.renamePredefinedTag(t.name, editTagName));
                                setEditingTag(null);
                              }
                              if (e.key === "Escape") setEditingTag(null);
                            }}
                          />
                          <button className="icon-btn" onClick={() => {
                            if (editTagName.trim()) setPredefinedTags(tagManager.renamePredefinedTag(t.name, editTagName));
                            setEditingTag(null);
                          }}><Check size={13} /></button>
                          <button className="icon-btn" onClick={() => setEditingTag(null)}><X size={13} /></button>
                        </div>
                      ) : (
                        <>
                          <span
                            className="tag-mgmt-chip-dot"
                            style={{ background: t.color || (darkMode ? "#4b5563" : "#d1d5db") }}
                          />
                          <span className="tag-mgmt-chip-name" style={t.color ? { color: t.color } : undefined}>
                            {t.name}
                          </span>
                          <span className="tag-mgmt-chip-count">
                            {usageCounts[t.name] || 0}
                          </span>
                          <div className="tag-mgmt-chip-actions">
                            {/* Color picker */}
                            <div className="tag-mgmt-color-picker">
                              {tagManager.TAG_COLORS.map((c, i) => (
                                <button
                                  key={i}
                                  className={`tag-mgmt-color-dot ${t.color === c ? "tag-mgmt-color-dot-active" : ""}`}
                                  style={{ background: c || (darkMode ? "#4b5563" : "#d1d5db") }}
                                  onClick={() => setPredefinedTags(tagManager.updateTagColor(t.name, c))}
                                  aria-label={c ? `Color ${c}` : "No color"}
                                />
                              ))}
                            </div>
                            <button className="icon-btn" title="Rename" onClick={() => { setEditingTag(t.name); setEditTagName(t.name); }}>
                              <PencilLine size={12} />
                            </button>
                            <button className="icon-btn icon-btn-danger" title="Remove" onClick={() => {
                              if (showConfirm) {
                                showConfirm(`Remove tag "${t.name}" from the predefined list? This does not remove it from notes.`, () => {
                                  setPredefinedTags(tagManager.removePredefinedTag(t.name));
                                });
                              } else {
                                setPredefinedTags(tagManager.removePredefinedTag(t.name));
                              }
                            }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div className="tag-mgmt-empty">
                <Tag size={32} strokeWidth={1} />
                <p>No predefined tags yet</p>
                <p className="tag-mgmt-empty-hint">Add tags above or enable auto-harvest to build your list from notes automatically.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Sync Tab ─── */}
        {activeTab === "sync" && (
          <>
          <div className="settings-section">
            <h3 className="settings-section-title">Connection</h3>
            <p className="settings-hint">
              Sync your notes to a private GitHub Gist for backup and cross-device access.
              Requires a <a href="https://github.com/settings/tokens/new?scopes=gist&description=NoteApp+Sync" target="_blank" rel="noopener noreferrer" style={{ color: "#0969da" }}>GitHub Personal Access Token</a> with <code>gist</code> scope.
            </p>

            {/* Token input */}
            <div className="settings-sync-field">
              <label className="settings-toggle-label" style={{ marginBottom: 6, fontSize: 13 }}>
                GitHub Token
              </label>
              <div className="settings-inline-form">
                <input
                  type="password"
                  className="settings-input"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={syncToken}
                  onChange={(e) => setSyncToken(e.target.value)}
                  style={{ fontFamily: "monospace" }}
                  autoComplete="off"
                />
                <button
                  className="settings-btn-sm settings-btn-primary"
                  onClick={() => {
                    gistSync.setToken(syncToken);
                    gistSync.validateToken().then((result) => {
                      if (result.valid) {
                        setSyncUser(result);
                        setSyncMessage("Token verified");
                        setSyncStatus("success");
                      } else {
                        setSyncUser(null);
                        setSyncMessage(result.error);
                        setSyncStatus("error");
                      }
                      setTimeout(() => setSyncStatus(null), 3000);
                    });
                  }}
                  disabled={!syncToken.trim()}
                >
                  Verify
                </button>
              </div>
              {syncUser && (
                <div className="settings-sync-user">
                  <img src={syncUser.avatar} alt="" className="settings-sync-avatar" />
                  <span>Connected as <strong>{syncUser.username}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Sync Settings</h3>

            {/* Enable sync toggle */}
            <label className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  <Cloud size={16} />
                  Enable Sync
                </span>
                <span className="settings-toggle-hint">Automatically sync notes to GitHub Gist after each save</span>
              </div>
              <button
                className={`settings-switch ${syncEnabled ? "settings-switch-on" : ""}`}
                onClick={() => {
                  const next = !syncEnabled;
                  gistSync.setSyncEnabled(next);
                  setSyncEnabled(next);
                }}
                role="switch"
                aria-checked={syncEnabled}
                disabled={!syncToken.trim()}
              >
                <span className="settings-switch-thumb" />
              </button>
            </label>

            {/* Auto-sync interval */}
            <div className="settings-toggle-row" style={{ cursor: "default" }}>
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">
                  <RefreshCw size={16} />
                  Auto-Sync Interval
                </span>
                <span className="settings-toggle-hint">Pauses when the tab is hidden to save API calls</span>
              </div>
              <select
                className="settings-input"
                value={syncInterval || 0}
                onChange={(e) => onSyncIntervalChange && onSyncIntervalChange(Number(e.target.value))}
                style={{ maxWidth: 180 }}
              >
                <option value={0}>Off (manual only)</option>
                <option value={60000}>Every 1 minute</option>
                <option value={300000}>Every 5 minutes</option>
                <option value={900000}>Every 15 minutes</option>
                <option value={1800000}>Every 30 minutes</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Actions</h3>

            {/* Sync actions */}
            <div className="settings-sync-actions">
              <button
                className="settings-btn-sm settings-btn-primary"
                disabled={!syncToken.trim() || syncStatus === "syncing"}
                onClick={async () => {
                  setSyncStatus("syncing");
                  setSyncMessage("Syncing...");
                  try {
                    const result = await onSyncNow();
                    setSyncMessage(`Synced ${result.noteCount} notes`);
                    setSyncStatus("success");
                  } catch (err) {
                    setSyncMessage(err.message);
                    setSyncStatus("error");
                  }
                  setTimeout(() => setSyncStatus(null), 5000);
                }}
              >
                <RefreshCw size={13} className={syncStatus === "syncing" ? "spin" : ""} />
                {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
              </button>

              {gistSync.getGistId(activeDb) && (
                <a
                  href={`https://gist.github.com/${gistSync.getGistId(activeDb)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                >
                  <ExternalLink size={12} /> View Gist
                </a>
              )}
            </div>

            {/* Status message */}
            {syncStatus && syncStatus !== "syncing" && (
              <div className={`settings-sync-status settings-sync-${syncStatus}`}>
                {syncStatus === "success" ? <Check size={14} /> : <CloudOff size={14} />}
                {syncMessage}
              </div>
            )}

            {/* Last sync info */}
            {gistSync.getLastSync(activeDb) && (
              <div className="settings-sync-meta">
                Last synced: {new Date(gistSync.getLastSync(activeDb)).toLocaleString()}
              </div>
            )}
          </div>

            {/* Link existing Gist */}
            {!gistSync.getGistId(activeDb) && (
              <div className="settings-section">
                <h3 className="settings-section-title">Link Existing Gist</h3>
                <p className="settings-hint">Already have a NoteApp Gist? Paste the Gist ID to link it.</p>
                <div className="settings-inline-form">
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Gist ID (e.g. abc123def456)"
                    id="link-gist-input"
                  />
                  <button
                    className="settings-btn-sm settings-btn-primary"
                    onClick={async () => {
                      const input = document.getElementById("link-gist-input");
                      const gistId = input.value.trim();
                      if (!gistId) return;
                      try {
                        await gistSync.linkGist(activeDb, gistId);
                        setSyncMessage("Gist linked successfully");
                        setSyncStatus("success");
                        setTimeout(() => setSyncStatus(null), 3000);
                      } catch (err) {
                        setSyncMessage(err.message);
                        setSyncStatus("error");
                        setTimeout(() => setSyncStatus(null), 5000);
                      }
                    }}
                  >
                    <Link2 size={12} /> Link
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="settings-footer">
        <button className="btn-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default SettingsPanel;
