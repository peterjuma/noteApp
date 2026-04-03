import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Check, Trash2, PencilLine, ArrowLeftRight,
  Upload, Download, FolderUp, RotateCcw, Archive, Github,
  Moon, Sun, Save, Sparkles, Settings, FileText, Wand2,
  RefreshCw, Cloud, CloudOff, Link2, ExternalLink, HardDrive, Star, Tag, Lock, Fingerprint, Clock,
} from "lucide-react";
import * as snippetService from "./services/snippets";
import * as googleDrive from "./services/googleDrive";
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
  onFullBackupImport,
  onRestoreFromGist,
  onImportFromGist,
  onPurgeArchive,
  onPurgeWorkspace,
  onPurgeAllWorkspaces,
  onSyncNow,
  showConfirm,
  onClose,
  onSyncIntervalChange,
  onLockTimeoutChange,
  allNotes,
  onGdriveRestore,
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
  const [autoHarvest, setAutoHarvest] = useState(true);
  const newTagInputRef = useRef(null);
  const [snippets, setSnippets] = useState([]);
  const [editingSnippet, setEditingSnippet] = useState(null); // null | "new" | snippet id
  const [snippetName, setSnippetName] = useState("");
  const [snippetContent, setSnippetContent] = useState("");
  const [snippetCategory, setSnippetCategory] = useState("zendesk");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncToken, setSyncToken] = useState("");
  const [gistId, setGistId] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [localSyncInterval, setLocalSyncInterval] = useState(0);
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "success" | "error"
  const [syncMessage, setSyncMessage] = useState("");
  const [syncUser, setSyncUser] = useState(null);
  const [linkGistInput, setLinkGistInput] = useState("");
  const wsInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const fullBackupInputRef = useRef(null);
  const [dataExportAll, setDataExportAll] = useState(false);
  const [gistImportUrl, setGistImportUrl] = useState("");
  const [gistImportBusy, setGistImportBusy] = useState(false);
  const [showGistImportDialog, setShowGistImportDialog] = useState(false);

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
  const [showAllArchive, setShowAllArchive] = useState(false);
  const [gdriveClientId, setGdriveClientId] = useState(googleDrive.isConfigured() ? "configured" : "");
  const [gdriveStatus, setGdriveStatus] = useState(null); // null | "busy" | "success" | "error"
  const [gdriveMessage, setGdriveMessage] = useState("");
  const [gdriveAuthorized, setGdriveAuthorized] = useState(false);
  const [gdriveBackupInfo, setGdriveBackupInfo] = useState(null);
  const pinInputRef = useRef(null);

  // Check biometric availability
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvail);
  }, []);

  // Load archive when switching to archive tab
  useEffect(() => {
    if (activeTab === "archive" && onLoadArchive) {
      onLoadArchive(showAllArchive);
    }
    if (activeTab === "templates") {
      snippetService.ensureDefaults(activeDb).then(setSnippets);
    }
    if (activeTab === "tags") {
      tagManager.getPredefinedTags(activeDb).then(setPredefinedTags);
      tagManager.isAutoHarvestEnabled(activeDb).then(setAutoHarvest);
    }
    if (activeTab === "sync") {
      gistSync.getToken(activeDb).then((t) => { setSyncToken(t); return t; }).then((t) => {
        if (t) gistSync.validateToken(activeDb).then((result) => {
          if (result.valid) setSyncUser(result);
        });
      });
      gistSync.isSyncEnabled(activeDb).then(setSyncEnabled);
      gistSync.getGistId(activeDb).then(setGistId);
      gistSync.getLastSync(activeDb).then(setLastSyncTime);
      gistSync.getSyncInterval(activeDb).then(setLocalSyncInterval);
    }
  }, [activeTab, activeDb, onLoadArchive, showAllArchive]);

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
                    if (onLockTimeoutChange) onLockTimeoutChange();
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
          <>
          {/* ── Backup ── */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">Backup</h3>
              {!dataExportAll && <span className="settings-ws-badge">{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}</span>}
              <div style={{ marginLeft: "auto" }}>
                <label className="settings-toggle-label" style={{ fontSize: 12, gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={dataExportAll} onChange={() => setDataExportAll(prev => !prev)} style={{ accentColor: "#4493f8" }} />
                  All workspaces
                </label>
              </div>
            </div>
            <div className="settings-data-group">
              <div className="settings-data-row">
                <div className="settings-data-info">
                  <span className="settings-data-label"><Download size={14} /> Full Backup</span>
                  <span className="settings-data-desc">{dataExportAll ? "Export all workspaces — notes, templates, tags, history, images, pins" : "Export current workspace — notes, templates, tags, history, images, pins"}</span>
                </div>
                <button className="settings-data-btn" onClick={() => onBackup(dataExportAll)}>Download .zip</button>
              </div>
            </div>
          </div>

          {/* ── Restore ── */}
          <div className="settings-section">
            <h3 className="settings-section-title">Restore</h3>
            <div className="settings-data-group">
              <div className="settings-data-row">
                <div className="settings-data-info">
                  <span className="settings-data-label"><FolderUp size={14} /> Restore Backup</span>
                  <span className="settings-data-desc">Restore from a full backup .zip file</span>
                </div>
                <button className="settings-data-btn" onClick={() => fullBackupInputRef.current.click()}>Choose file</button>
              </div>
              <div className="settings-data-row">
                <div className="settings-data-info">
                  <span className="settings-data-label"><Cloud size={14} /> Restore from Sync</span>
                  <span className="settings-data-desc">{gistId ? "Pull all notes from linked GitHub Gist" : "Link a Gist in the Sync tab first"}</span>
                </div>
                <button className="settings-data-btn" onClick={onRestoreFromGist} disabled={!gistId}>Restore</button>
              </div>
              {googleDrive.isConfigured() && (
                <div className="settings-data-row">
                  <div className="settings-data-info">
                    <span className="settings-data-label"><HardDrive size={14} /> Restore from Google Drive</span>
                    <span className="settings-data-desc">{gdriveAuthorized ? "Download notes from your Drive backup" : "Sign in via Sync tab to enable"}</span>
                  </div>
                  <button
                    className="settings-data-btn"
                    disabled={!gdriveAuthorized || gdriveStatus === "busy"}
                    onClick={async () => {
                      setGdriveStatus("busy");
                      setGdriveMessage("Restoring...");
                      try {
                        const data = await googleDrive.restoreFromDrive();
                        if (!data || !data.notes) {
                          setGdriveMessage("No backup found on Google Drive");
                          setGdriveStatus("error");
                          setTimeout(() => setGdriveStatus(null), 5000);
                          return;
                        }
                        showConfirm(
                          "Restore from Google Drive",
                          `Restore ${data.notes.length} note${data.notes.length !== 1 ? "s" : ""} from backup (${data.workspace || "unknown workspace"}, ${new Date(data.exportedAt).toLocaleDateString()})? Existing notes with the same ID will be overwritten.`,
                          async () => {
                            if (onGdriveRestore) {
                              await onGdriveRestore(data.notes);
                              setGdriveMessage(`Restored ${data.notes.length} notes`);
                              setGdriveStatus("success");
                            }
                          },
                          { confirmText: "Restore", danger: false }
                        );
                        setGdriveStatus(null);
                      } catch (err) {
                        setGdriveMessage(err.message);
                        setGdriveStatus("error");
                        setTimeout(() => setGdriveStatus(null), 5000);
                      }
                    }}
                  >
                    Restore
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Import Notes ── */}
          <div className="settings-section">
            <h3 className="settings-section-title">Import Notes</h3>
            <div className="settings-data-group">
              <div className="settings-data-row">
                <div className="settings-data-info">
                  <span className="settings-data-label"><Upload size={14} /> Upload Markdown</span>
                  <span className="settings-data-desc">Import a single .md file as a new note</span>
                </div>
                <button className="settings-data-btn" onClick={() => fileInputRef.current.click()}>Choose file</button>
              </div>
              <div className="settings-data-row">
                <div className="settings-data-info">
                  <span className="settings-data-label"><FolderUp size={14} /> Import from ZIP</span>
                  <span className="settings-data-desc">Import multiple notes from a .zip archive</span>
                </div>
                <button className="settings-data-btn" onClick={() => zipInputRef.current.click()}>Choose file</button>
              </div>
              <div className="settings-data-row">
                <div className="settings-data-info">
                  <span className="settings-data-label"><Github size={14} /> Import from Gist</span>
                  <span className="settings-data-desc">Import markdown files from any public or private GitHub Gist</span>
                </div>
                <button
                  className="settings-data-btn"
                  disabled={gistImportBusy}
                  onClick={() => {
                    setShowGistImportDialog(true);
                    setGistImportUrl("");
                  }}
                >
                  {gistImportBusy ? "Importing…" : "Enter URL"}
                </button>
              </div>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept=".md" className="hidden" onChange={onUploadNote} />
          <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={onZipImport} />
          <input ref={fullBackupInputRef} type="file" accept=".zip" className="hidden" onChange={onFullBackupImport} />

          {/* Gist URL dialog */}
          {showGistImportDialog && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowGistImportDialog(false); }}>
              <div className={`modal-dialog ${darkMode ? "modal-dialog-dark" : ""}`} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                  <h3 className="modal-title"><Github size={18} /> Import from Gist</h3>
                  <button onClick={() => setShowGistImportDialog(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 4 }}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <p className="settings-hint" style={{ marginBottom: 12 }}>
                    Paste a GitHub Gist URL or ID. All markdown files in the gist will be imported as notes. Public gists work without a token.
                  </p>
                  <input
                    type="text"
                    className="settings-input"
                    style={{ width: "100%" }}
                    placeholder="https://gist.github.com/user/abc123"
                    value={gistImportUrl}
                    autoFocus
                    onChange={(e) => setGistImportUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && gistImportUrl.trim() && !gistImportBusy) {
                        e.preventDefault();
                        setGistImportBusy(true);
                        onImportFromGist(gistImportUrl).then((res) => {
                          setGistImportBusy(false);
                          if (res?.success) { setGistImportUrl(""); setShowGistImportDialog(false); }
                        });
                      }
                      if (e.key === "Escape") setShowGistImportDialog(false);
                    }}
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setShowGistImportDialog(false)}>Cancel</button>
                  <button
                    className="btn-save"
                    disabled={!gistImportUrl.trim() || gistImportBusy}
                    onClick={() => {
                      setGistImportBusy(true);
                      onImportFromGist(gistImportUrl).then((res) => {
                        setGistImportBusy(false);
                        if (res?.success) { setGistImportUrl(""); setShowGistImportDialog(false); }
                      });
                    }}
                  >
                    {gistImportBusy ? <><RefreshCw size={13} className="spin" /> Importing…</> : <><Download size={13} /> Import</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="settings-section">
            <h3 className="settings-section-title settings-danger-title">Danger Zone</h3>
            <div className="settings-danger-zone">
              <div className="settings-danger-item">
                <div className="settings-danger-info">
                  <span className="settings-danger-label">Purge current workspace</span>
                  <span className="settings-danger-desc">
                    Delete all notes, pins, images, templates, tags, and version history in &ldquo;{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}&rdquo;
                  </span>
                </div>
                <button
                  className="settings-danger-btn"
                  onClick={() => showConfirm(
                    "Purge Workspace",
                    `This will permanently delete ALL data in the "${workspaces.find(w => w.dbName === activeDb)?.name || "Default"}" workspace — notes, pins, images, templates, tags, version history, and settings. This cannot be undone.`,
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
                    "This will permanently delete ALL data across ALL workspaces — notes, pins, images, templates, tags, version history, and settings. All non-default workspaces will be removed. This cannot be undone.",
                    onPurgeAllWorkspaces,
                    { confirmText: "Delete Everything", danger: true }
                  )}
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
          </>
        )}

        {/* ─── Archive Tab ─── */}
        {activeTab === "archive" && (
          <div className="settings-section">
            <div className="bin-page-header" style={{ padding: "0 0 16px" }}>
              <div className="bin-page-title">
                <Archive size={18} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Archive</h3>
                <span className="bin-page-count">{archivedNotes.length} item{archivedNotes.length !== 1 ? "s" : ""}</span>
                {!showAllArchive && <span className="settings-ws-badge">{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className="settings-toggle-label" style={{ fontSize: 12, gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={showAllArchive} onChange={() => setShowAllArchive(prev => !prev)} style={{ accentColor: "#4493f8" }} />
                  All workspaces
                </label>
                {archivedNotes.length > 0 && (
                  <button
                    className="bin-purge-btn"
                    onClick={() => showConfirm(
                      showAllArchive ? "Purge All Archives" : "Purge Workspace Archive",
                      showAllArchive
                        ? `Permanently delete all ${archivedNotes.length} archived note${archivedNotes.length !== 1 ? "s" : ""} across all workspaces? This cannot be undone.`
                        : `Permanently delete ${archivedNotes.length} archived note${archivedNotes.length !== 1 ? "s" : ""} from this workspace? This cannot be undone.`,
                      () => onPurgeArchive(showAllArchive),
                      { confirmText: "Purge All", danger: true }
                    )}
                  >
                    Empty Archive
                  </button>
                )}
              </div>
            </div>
            <p className="settings-hint">Notes moved to archive can be restored or permanently deleted.{!showAllArchive && " Showing archive for the current workspace only."}</p>

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
              <span className="settings-ws-badge">{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}</span>
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
            <div className="settings-section-header">
              <h3 className="settings-section-title">Tag Management</h3>
              <span className="settings-ws-badge">{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}</span>
            </div>
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
                      tagManager.addPredefinedTag(newTagName, null, activeDb).then(setPredefinedTags);
                      setNewTagName("");
                    }
                  }}
                />
                <button
                  className="tag-mgmt-add-btn"
                  disabled={!newTagName.trim()}
                  onClick={() => {
                    tagManager.addPredefinedTag(newTagName, null, activeDb).then(setPredefinedTags);
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
                    tagManager.setAutoHarvest(next, activeDb);
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
                                tagManager.renamePredefinedTag(t.name, editTagName, activeDb).then(setPredefinedTags);
                                setEditingTag(null);
                              }
                              if (e.key === "Escape") setEditingTag(null);
                            }}
                          />
                          <button className="icon-btn" onClick={() => {
                            if (editTagName.trim()) tagManager.renamePredefinedTag(t.name, editTagName, activeDb).then(setPredefinedTags);
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
                                  onClick={() => tagManager.updateTagColor(t.name, c, activeDb).then(setPredefinedTags)}
                                  aria-label={c ? `Color ${c}` : "No color"}
                                />
                              ))}
                            </div>
                            <button className="icon-btn" title="Rename" onClick={() => { setEditingTag(t.name); setEditTagName(t.name); }}>
                              <PencilLine size={12} />
                            </button>
                            <button className="icon-btn icon-btn-danger" title="Remove" onClick={() => {
                              if (showConfirm) {
                                showConfirm("Remove Tag", `Remove tag "${t.name}" from the predefined list? This does not remove it from notes.`, () => {
                                  tagManager.removePredefinedTag(t.name, activeDb).then(setPredefinedTags);
                                });
                              } else {
                                tagManager.removePredefinedTag(t.name, activeDb).then(setPredefinedTags);
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
            <div className="settings-section-header">
              <h3 className="settings-section-title">Connection</h3>
              <span className="settings-ws-badge">{workspaces.find(w => w.dbName === activeDb)?.name || "Default"}</span>
            </div>
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
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                />
                <button
                  className="settings-btn-sm settings-btn-primary"
                  onClick={async () => {
                    await gistSync.setToken(syncToken, activeDb);
                    gistSync.validateToken(activeDb).then((result) => {
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
                onClick={async () => {
                  const next = !syncEnabled;
                  await gistSync.setSyncEnabled(next, activeDb);
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
                value={localSyncInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLocalSyncInterval(val);
                  if (onSyncIntervalChange) onSyncIntervalChange(val);
                }}
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

              {gistId && (
                <a
                  href={`https://gist.github.com/${gistId}`}
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
            {lastSyncTime && (
              <div className="settings-sync-meta">
                Last synced: {new Date(lastSyncTime).toLocaleString()}
              </div>
            )}
          </div>

            {/* Link existing Gist */}
            {!gistId && (
              <div className="settings-section">
                <h3 className="settings-section-title">Link Existing Gist</h3>
                <p className="settings-hint">Already have a NoteApp Gist? Paste the Gist ID to link it.</p>
                <div className="settings-inline-form">
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Gist ID (e.g. abc123def456)"
                    value={linkGistInput}
                    onChange={(e) => setLinkGistInput(e.target.value)}
                  />
                  <button
                    className="settings-btn-sm settings-btn-primary"
                    disabled={!linkGistInput.trim()}
                    onClick={async () => {
                      const id = linkGistInput.trim();
                      if (!id) return;
                      try {
                        await gistSync.linkGist(activeDb, id);
                        setGistId(id);
                        setLinkGistInput("");
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

          {/* ─── Google Drive Backup ─── */}
          <div className="settings-section" style={{ marginTop: 24 }}>
            <div className="settings-section-header">
              <h3 className="settings-section-title">Google Drive Backup</h3>
            </div>
            <p className="settings-hint">
              Back up your notes to Google Drive. Uses a hidden app folder — your files stay private.
              {!googleDrive.isConfigured() && (
                <> Requires a <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: "#0969da" }}>Google Cloud OAuth Client ID</a> with Drive API enabled.</>
              )}
            </p>

            {/* Client ID setup */}
            {!googleDrive.isConfigured() ? (
              <div className="settings-sync-field">
                <label className="settings-toggle-label" style={{ marginBottom: 6, fontSize: 13 }}>
                  OAuth Client ID
                </label>
                <div className="settings-inline-form">
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="xxxx.apps.googleusercontent.com"
                    value={gdriveClientId === "configured" ? "" : gdriveClientId}
                    onChange={(e) => setGdriveClientId(e.target.value)}
                  />
                  <button
                    className="settings-btn-sm settings-btn-primary"
                    disabled={!gdriveClientId.trim() || gdriveClientId === "configured"}
                    onClick={() => {
                      googleDrive.setClientId(gdriveClientId);
                      setGdriveClientId("configured");
                      setGdriveMessage("Client ID saved");
                      setGdriveStatus("success");
                      setTimeout(() => setGdriveStatus(null), 3000);
                    }}
                  >
                    <Save size={12} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="settings-sync-field" style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#3fb950" }}>
                      <HardDrive size={14} /> Client ID configured
                    </span>
                    <button
                      className="settings-btn-sm"
                      style={{ color: "#dc2626", fontSize: 11 }}
                      onClick={() => {
                        googleDrive.setClientId("");
                        setGdriveClientId("");
                        setGdriveAuthorized(false);
                        setGdriveBackupInfo(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Authorize / Disconnect */}
                {!gdriveAuthorized ? (
                  <button
                    className="settings-btn-sm settings-btn-primary"
                    disabled={gdriveStatus === "busy"}
                    onClick={async () => {
                      setGdriveStatus("busy");
                      setGdriveMessage("Signing in...");
                      try {
                        await googleDrive.authorize();
                        setGdriveAuthorized(true);
                        setGdriveMessage("Signed in to Google");
                        setGdriveStatus("success");
                        // Fetch backup info
                        const info = await googleDrive.getBackupInfo();
                        setGdriveBackupInfo(info);
                        setTimeout(() => setGdriveStatus(null), 3000);
                      } catch (err) {
                        setGdriveMessage(err.message);
                        setGdriveStatus("error");
                        setTimeout(() => setGdriveStatus(null), 5000);
                      }
                    }}
                  >
                    <Cloud size={12} /> Sign in with Google
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="settings-btn-sm settings-btn-primary"
                        disabled={gdriveStatus === "busy"}
                        onClick={async () => {
                          setGdriveStatus("busy");
                          setGdriveMessage("Backing up...");
                          try {
                            const wsName = workspaces.find(w => w.dbName === activeDb)?.name || "Default";
                            const result = await googleDrive.backupToDrive(allNotes || [], wsName);
                            setGdriveMessage(`Backup saved (${new Date(result.modifiedTime).toLocaleString()})`);
                            setGdriveStatus("success");
                            setGdriveBackupInfo({ modifiedTime: result.modifiedTime });
                            setTimeout(() => setGdriveStatus(null), 5000);
                          } catch (err) {
                            setGdriveMessage(err.message);
                            setGdriveStatus("error");
                            setTimeout(() => setGdriveStatus(null), 5000);
                          }
                        }}
                      >
                        <Upload size={12} /> Backup to Drive
                      </button>
                      <button
                        className="settings-btn-sm"
                        disabled={gdriveStatus === "busy"}
                        onClick={async () => {
                          setGdriveStatus("busy");
                          setGdriveMessage("Restoring...");
                          try {
                            const data = await googleDrive.restoreFromDrive();
                            if (!data || !data.notes) {
                              setGdriveMessage("No backup found on Google Drive");
                              setGdriveStatus("error");
                            } else {
                              showConfirm(
                                "Restore from Google Drive",
                                `Restore ${data.notes.length} note${data.notes.length !== 1 ? "s" : ""} from backup (${data.workspace || "unknown workspace"}, ${new Date(data.exportedAt).toLocaleDateString()})? Existing notes with the same ID will be overwritten.`,
                                async () => {
                                  if (onGdriveRestore) {
                                    await onGdriveRestore(data.notes);
                                    setGdriveMessage(`Restored ${data.notes.length} notes`);
                                    setGdriveStatus("success");
                                  }
                                },
                                { confirmText: "Restore", danger: false }
                              );
                              setGdriveStatus(null);
                            }
                            setTimeout(() => setGdriveStatus(null), 5000);
                          } catch (err) {
                            setGdriveMessage(err.message);
                            setGdriveStatus("error");
                            setTimeout(() => setGdriveStatus(null), 5000);
                          }
                        }}
                      >
                        <Download size={12} /> Restore from Drive
                      </button>
                      <button
                        className="settings-btn-sm"
                        style={{ color: "#dc2626" }}
                        onClick={async () => {
                          await googleDrive.disconnect();
                          setGdriveAuthorized(false);
                          setGdriveBackupInfo(null);
                          setGdriveMessage("");
                        }}
                      >
                        <CloudOff size={12} /> Disconnect
                      </button>
                    </div>

                    {gdriveBackupInfo && (
                      <p className="settings-hint" style={{ margin: 0 }}>
                        Last backup: {new Date(gdriveBackupInfo.modifiedTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Status message */}
                {gdriveStatus && (
                  <p style={{
                    fontSize: 12,
                    marginTop: 8,
                    color: gdriveStatus === "error" ? "#dc2626" : gdriveStatus === "success" ? "#3fb950" : "#8b949e",
                  }}>
                    {gdriveMessage}
                  </p>
                )}
              </>
            )}
          </div>
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
