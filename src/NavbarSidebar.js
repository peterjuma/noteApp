import React from "react";
import { Home, Plus, Search, ChevronsLeft, ChevronsRight, Settings, TableProperties, StickyNote, Upload, Layers } from "lucide-react";

function NavbarSidebar(props) {
  var note = {
    noteid: Date.now().toString(),
    notetitle: "",
    notebody: "",
    activepage: "",
    action: "addnote",
  };
  const searchRef = React.useRef();
  const uploadRef = React.useRef();
  const [searchVisible, setSearchVisible] = React.useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = React.useState(false);
  const wsDropdownRef = React.useRef();

  const workspaces = props.workspaces || [];
  const hasMultipleWorkspaces = workspaces.length > 0;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!wsDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target)) {
        setWsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wsDropdownOpen]);

  const isPageActive = props.showSettings || props.showTableConverter;

  if (props.sidebarCollapsed) {
    return (
      <nav aria-label="Sidebar navigation" className="sidebar-collapsed-nav">
        <button onClick={props.onToggleCollapse} className="icon-btn" title="Expand" aria-label="Expand sidebar">
          <ChevronsRight size={18} />
        </button>
        <button onClick={(e) => props.handleClickHomeBtn(e)} className="icon-btn" title="Home" aria-label="Home">
          <Home size={18} />
        </button>
        <button onClick={props.onOpenSettings} className={`icon-btn ${props.showSettings ? "icon-btn-active" : ""}`} title="Settings" aria-label="Settings">
          <Settings size={16} />
        </button>
        <button onClick={props.onOpenTableConverter} className={`icon-btn ${props.showTableConverter ? "icon-btn-active" : ""}`} title={props.showTableConverter ? "Back to Notes" : "Table Converter"} aria-label="Table Converter">
          {props.showTableConverter ? <StickyNote size={16} /> : <TableProperties size={16} />}
        </button>
        <button onClick={() => uploadRef.current && uploadRef.current.click()} className="icon-btn" title="Upload .md" aria-label="Upload a markdown file" disabled={isPageActive}>
          <Upload size={16} />
        </button>
        <input ref={uploadRef} type="file" accept=".md" style={{ display: "none" }} onChange={(e) => { if (props.onUploadNote) props.onUploadNote(e); e.target.value = ""; }} />
        {hasMultipleWorkspaces && (
          <div className="ws-switcher-wrapper" ref={wsDropdownRef}>
            <button onClick={() => setWsDropdownOpen(v => !v)} className={`icon-btn ${wsDropdownOpen ? "icon-btn-active" : ""}`} title="Switch workspace" aria-label="Switch workspace">
              <Layers size={16} />
            </button>
            {wsDropdownOpen && (
              <ul className="ws-switcher-dropdown">
                {workspaces.map((w) => (
                  <li key={w.dbName} className={`ws-switcher-item ${w.dbName === props.activeDb ? "ws-switcher-item-active" : ""}`} onClick={() => { props.onSwitchWorkspace(w.dbName); setWsDropdownOpen(false); }}>
                    {w.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <span className="toolbar-divider" style={{ height: 1, width: 24, margin: "2px 0" }} />
        <button data-action="addnote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="Add" aria-label="Add note" disabled={isPageActive}>
          <Plus size={18} style={{ pointerEvents: "none" }} />
        </button>
        <button onClick={() => setSearchVisible(v => !v)} className={`icon-btn ${searchVisible ? "icon-btn-active" : ""}`} title="Search" aria-label="Toggle search" disabled={isPageActive}>
          <Search size={16} />
        </button>
      </nav>
    );
  }

  return (
    <nav aria-label="Sidebar navigation">
      {/* Top bar: Home + Title + Collapse */}
      <div className="sidebar-header">
        <button onClick={(e) => props.handleClickHomeBtn(e)} className="icon-btn" title="Home" aria-label="Go to home page">
          <Home size={18} />
        </button>
        <h4 className="sidebar-title">
          {props.showSettings
            ? "Settings"
            : props.showTableConverter
              ? "Table Converter"
              : props.workspaceName && props.workspaceName !== "Default"
                ? props.workspaceName
                : "Notes"
          }
        </h4>
        <button onClick={props.onToggleCollapse} className="icon-btn" title="Collapse" aria-label="Collapse sidebar">
          <ChevronsLeft size={16} />
        </button>
      </div>
      {/* Action bar: pages on left, actions on right */}
      <div className="sidebar-actions">
        <span className="toolbar-group">
          <button onClick={props.onOpenSettings} className={`icon-btn ${props.showSettings ? "icon-btn-active" : ""}`} title="Settings" aria-label="Settings">
            <Settings size={15} />
          </button>
          <button onClick={props.onOpenTableConverter} className={`icon-btn ${props.showTableConverter ? "icon-btn-active" : ""}`} title={props.showTableConverter ? "Back to Notes" : "Table Converter"} aria-label="Table Converter">
            {props.showTableConverter ? <StickyNote size={15} /> : <TableProperties size={15} />}
          </button>
          <button onClick={() => uploadRef.current && uploadRef.current.click()} className="icon-btn" title="Upload .md" aria-label="Upload a markdown file" disabled={isPageActive}>
            <Upload size={15} />
          </button>
          <input ref={uploadRef} type="file" accept=".md" style={{ display: "none" }} onChange={(e) => { if (props.onUploadNote) props.onUploadNote(e); e.target.value = ""; }} />
          {hasMultipleWorkspaces && (
            <div className="ws-switcher-wrapper" ref={wsDropdownRef}>
              <button onClick={() => setWsDropdownOpen(v => !v)} className={`icon-btn ${wsDropdownOpen ? "icon-btn-active" : ""}`} title="Switch workspace" aria-label="Switch workspace">
                <Layers size={15} />
              </button>
              {wsDropdownOpen && (
                <ul className="ws-switcher-dropdown">
                  {workspaces.map((w) => (
                    <li key={w.dbName} className={`ws-switcher-item ${w.dbName === props.activeDb ? "ws-switcher-item-active" : ""}`} onClick={() => { props.onSwitchWorkspace(w.dbName); setWsDropdownOpen(false); }}>
                      {w.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </span>
        <span className="toolbar-divider" />
        <span className="toolbar-group">
          <button onClick={() => setSearchVisible(v => !v)} className={`icon-btn ${searchVisible ? "icon-btn-active" : ""}`} title="Search" aria-label="Toggle search" disabled={isPageActive}>
            <Search size={15} />
          </button>
          <button data-action="addnote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="New Note" aria-label="Create new note" disabled={isPageActive}>
            <Plus size={16} style={{ pointerEvents: "none" }} />
          </button>
        </span>
      </div>
      {/* Search */}
      {!isPageActive && searchVisible && (
      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search notes..."
          ref={searchRef}
          aria-label="Search notes"
          autoFocus
          onChange={(e) => props.handleSearchNotes(e)}
        />
      </div>
      )}
    </nav>
  );
}

export default NavbarSidebar;
