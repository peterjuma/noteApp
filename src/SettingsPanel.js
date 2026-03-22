import { useState, useRef, useEffect } from "react";
import {
  X, Plus, Check, Trash2, PencilLine, ArrowLeftRight,
  Upload, Download, FolderUp, RotateCcw, Archive,
  Moon, Sun, Save, Sparkles, Settings, FileText,
  RefreshCw, Cloud, CloudOff, Eye, EyeOff, Link2, ExternalLink,
} from "lucide-react";
import * as snippetService from "./services/snippets";
import * as gistSync from "./services/gistSync";

function SettingsPanel({
  darkMode,
  onToggleDarkMode,
  autoSave,
  onToggleAutoSave,
  tagSuggestEnabled,
  onToggleTagSuggest,
  vimMode,
  onToggleVimMode,
  workspaces,
  activeDb,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
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
}) {
  const [activeTab, setActiveTab] = useState("general");
  const [wsName, setWsName] = useState("");
  const [showNewWs, setShowNewWs] = useState(false);
  const [editingWs, setEditingWs] = useState(null);
  const [editName, setEditName] = useState("");
  const [snippets, setSnippets] = useState([]);
  const [editingSnippet, setEditingSnippet] = useState(null); // null | "new" | snippet id
  const [snippetName, setSnippetName] = useState("");
  const [snippetContent, setSnippetContent] = useState("");
  const [snippetCategory, setSnippetCategory] = useState("zendesk");
  const [syncEnabled, setSyncEnabled] = useState(gistSync.isSyncEnabled());
  const [syncToken, setSyncToken] = useState(gistSync.getToken());
  const [showToken, setShowToken] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "success" | "error"
  const [syncMessage, setSyncMessage] = useState("");
  const [syncUser, setSyncUser] = useState(null);
  const wsInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Load archive when switching to data tab
  useEffect(() => {
    if (activeTab === "data" && onLoadArchive) {
      onLoadArchive();
    }
    if (activeTab === "templates") {
      setSnippets(snippetService.ensureDefaults());
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
    { id: "data", label: "Data & Archive", icon: Archive },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "sync", label: "Sync", icon: Cloud },
  ];

  return (
    <div className="settings-fullpage">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close settings">
          <X size={18} />
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

            <h3 className="settings-section-title" style={{ marginTop: "24px" }}>
              Archive
              {archivedNotes.length > 0 && <span className="settings-badge">{archivedNotes.length}</span>}
            </h3>
            <p className="settings-hint">Notes moved to archive can be restored or permanently deleted.</p>

            {archivedNotes.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <button
                  className="settings-btn-sm"
                  style={{ color: "#dc2626" }}
                  onClick={() => showConfirm(
                    "Purge Archive",
                    `Permanently delete all ${archivedNotes.length} archived note${archivedNotes.length !== 1 ? "s" : ""}? This cannot be undone.`,
                    onPurgeArchive,
                    { confirmText: "Purge All", danger: true }
                  )}
                >
                  <Trash2 size={12} /> Purge All Archived
                </button>
              </div>
            )}

            {archivedNotes.length > 0 ? (
              <ul className="settings-archive-list">
                {archivedNotes.map((note) => (
                  <li key={note.noteid} className="settings-archive-item">
                    <div className="settings-archive-info">
                      <span className="settings-archive-title">{note.title}</span>
                      <span className="settings-archive-meta">
                        {note.sourceWorkspace === "notesdb" ? "Default" : note.sourceWorkspace.replace("notesdb_", "")}
                        {note.archivedAt && ` · ${new Date(note.archivedAt).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="settings-archive-actions">
                      <button onClick={() => onRestoreNote(note.noteid)} className="icon-btn" title="Restore">
                        <RotateCcw size={14} />
                      </button>
                      <button onClick={() => onPermanentDelete(note.noteid)} className="icon-btn icon-btn-danger" title="Delete forever">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="settings-empty">
                <p>No archived notes</p>
              </div>
            )}

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
                    onClick={() => {
                      if (editingSnippet === "new") {
                        snippetService.addSnippet(snippetName, snippetContent, snippetCategory);
                      } else {
                        snippetService.updateSnippet(editingSnippet, {
                          name: snippetName,
                          content: snippetContent,
                          category: snippetCategory,
                        });
                      }
                      setSnippets(snippetService.getSnippets());
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
                        onClick={() => {
                          snippetService.deleteSnippet(s.id);
                          setSnippets(snippetService.getSnippets());
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

        {/* ─── Sync Tab ─── */}
        {activeTab === "sync" && (
          <div className="settings-section">
            <h3 className="settings-section-title">GitHub Gist Sync</h3>
            <p className="settings-hint">
              Sync your notes to a private GitHub Gist for backup and cross-device access.
              Requires a <a href="https://github.com/settings/tokens/new?scopes=gist&description=NoteApp+Sync" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>GitHub Personal Access Token</a> with <code>gist</code> scope.
            </p>

            {/* Token input */}
            <div className="settings-sync-field">
              <label className="settings-toggle-label" style={{ marginBottom: 6, fontSize: 13 }}>
                GitHub Token
              </label>
              <div className="settings-inline-form">
                <input
                  type={showToken ? "text" : "password"}
                  className="settings-input"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={syncToken}
                  onChange={(e) => setSyncToken(e.target.value)}
                  style={{ fontFamily: "monospace" }}
                />
                <button
                  className="icon-btn"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
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

            {/* Enable sync toggle */}
            <label className="settings-toggle-row" style={{ marginTop: 16 }}>
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

            {/* Sync actions */}
            <div className="settings-sync-actions" style={{ marginTop: 20 }}>
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

            {/* Link existing Gist */}
            {!gistSync.getGistId(activeDb) && (
              <div style={{ marginTop: 24 }}>
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
          </div>
        )}
      </div>

      <div className="settings-footer">
        <button className="btn-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default SettingsPanel;
