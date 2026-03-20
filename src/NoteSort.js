import React from "react";
import { Upload, Download, ArrowUpDown, ArrowLeftRight, Plus, X, Check, Trash2, PencilLine, Archive } from "lucide-react";

function NoteSort(props) {
  const fileInputRef = React.useRef(null);
  const zipInputRef = React.useRef(null);
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [showSwitchModal, setShowSwitchModal] = React.useState(false);
  const [wsName, setWsName] = React.useState("");
  const inputRef = React.useRef(null);

  const triggerFileInputClick = () => {
    fileInputRef.current.click();
  };

  const openNewModal = () => {
    setWsName("");
    setShowNewModal(true);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
  };

  const handleCreate = () => {
    if (wsName.trim()) {
      props.handleAddWorkspace(wsName.trim());
      setShowNewModal(false);
      setShowSwitchModal(false);
      setWsName("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") setShowNewModal(false);
  };

  const workspaces = props.workspaces || [];
  const currentIdx = workspaces.findIndex((w) => w.dbName === props.activeDb);
  const currentName = currentIdx >= 0 ? workspaces[currentIdx].name : "Default";

  return (
    <>
      <div className="sort-bar-container">
        {/* Workspace bar */}
        <div className="workspace-bar">
          <span className="workspace-label">Workspace:</span>
          <span className="workspace-name">{currentName}</span>
          <button onClick={() => setShowSwitchModal(true)} className="ws-nav-btn" title="Switch Workspace" aria-label="Switch workspace">
            <ArrowLeftRight size={14} />
          </button>
          <button onClick={openNewModal} className="ws-nav-btn" title="New Workspace" aria-label="Create new workspace">
            <Plus size={14} />
          </button>
        </div>
        {/* Sort & actions */}
        <div className="sort-bar">
          <div className="sort-bar-left">
            <ArrowUpDown size={13} />
            <select
              id="sort-selection"
              value={props.sortby || "4"}
              aria-label="Sort notes by"
              onChange={(e) => props.handleSortNotes(e.target.value)}
            >
              <option value="4">Modified: Newest</option>
              <option value="5">Modified: Oldest</option>
              <option value="2">Created: Newest</option>
              <option value="3">Created: Oldest</option>
              <option value="0">Title: A-Z</option>
              <option value="1">Title: Z-A</option>
              {props.sortby === "manual" && <option value="manual">Manual</option>}
            </select>
          </div>
          <div className="sort-bar-right">
            <input ref={fileInputRef} type="file" accept=".md" className="hidden" aria-label="Select markdown file" onChange={props.handleNotesUpload} />
            <input ref={zipInputRef} type="file" accept=".zip" className="hidden" aria-label="Select ZIP archive" onChange={props.handleZipImport} />
            <button onClick={triggerFileInputClick} className="icon-btn" title="Upload Note (.md)" aria-label="Upload a markdown note">
              <Upload size={14} />
            </button>
            <button onClick={() => zipInputRef.current.click()} className="icon-btn" title="Import Archive (.zip)" aria-label="Import notes from ZIP archive">
              <Archive size={14} />
            </button>
            <button onClick={props.handleNotesBackup} className="icon-btn" title="Download Backup (.zip)" aria-label="Download all notes as ZIP">
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Switch Workspace Modal */}
      {showSwitchModal && (
        <div className="modal-overlay" onClick={() => setShowSwitchModal(false)}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="switch-ws-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="switch-ws-title">Switch Workspace</h3>
              <button className="icon-btn" onClick={() => setShowSwitchModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <ul className="ws-list">
                {workspaces.map((w) => (
                  <li
                    key={w.dbName}
                    className={`ws-list-item ${w.dbName === props.activeDb ? "ws-list-item-active" : ""}`}
                  >
                    <span
                      className="ws-list-name"
                      onClick={() => { props.handleSwitchWorkspace(w.dbName); setShowSwitchModal(false); }}
                    >
                      {w.name}
                    </span>
                    <div className="ws-list-actions">
                      {w.dbName === props.activeDb && <Check size={14} className="ws-list-check" />}
                      {w.dbName !== "notesdb" && (
                        <>
                          <button
                            className="ws-action-btn"
                            title="Rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newName = prompt("Rename workspace:", w.name);
                              if (newName && newName.trim()) {
                                props.handleRenameWorkspace(w.dbName, newName.trim());
                              }
                            }}
                          >
                            <PencilLine size={13} />
                          </button>
                          <button
                            className="ws-action-btn ws-action-danger"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              const name = w.name;
                              const dbName = w.dbName;
                              props.showConfirm(
                                "Delete Workspace",
                                `Delete workspace "${name}"? All notes in this workspace will be lost.`,
                                () => props.handleDeleteWorkspace(dbName),
                                { confirmText: "Delete", danger: true }
                              );
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={() => { setShowSwitchModal(false); openNewModal(); }}>
                <Plus size={14} /> New Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Workspace Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="new-ws-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 id="new-ws-title">New Workspace</h3>
              <button className="icon-btn" onClick={() => setShowNewModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <label className="modal-label">Workspace name</label>
              <input
                ref={inputRef}
                type="text"
                className="modal-input"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Work, Personal, Archive..."
              />
              <p className="modal-hint">Each workspace has its own separate database of notes.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleCreate} disabled={!wsName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NoteSort;
