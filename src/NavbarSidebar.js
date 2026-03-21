import React from "react";
import { Home, Plus, Search, Moon, Sun, Archive, ChevronsLeft, ChevronsRight, TableProperties, StickyNote, Upload, Download, FolderUp } from "lucide-react";

function NavbarSidebar(props) {
  var note = {
    noteid: Date.now().toString(),
    notetitle: "",
    notebody: "",
    activepage: "",
    action: "addnote",
  };
  const searchRef = React.useRef();
  const fileInputRef = React.useRef();
  const zipInputRef = React.useRef();
  const [searchVisible, setSearchVisible] = React.useState(false);

  if (props.sidebarCollapsed) {
    return (
      <nav aria-label="Sidebar navigation" className="sidebar-collapsed-nav">
        <button onClick={props.onToggleCollapse} className="icon-btn" title="Expand" aria-label="Expand sidebar">
          <ChevronsRight size={18} />
        </button>
        <button onClick={(e) => props.handleClickHomeBtn(e)} className="icon-btn" title="Home" aria-label="Home">
          <Home size={18} />
        </button>
        <button data-action="addnote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="Add" aria-label="Add note">
          <Plus size={18} style={{ pointerEvents: "none" }} />
        </button>
        <button onClick={props.onToggleArchive} className={`icon-btn ${props.viewingArchive ? "icon-btn-active" : ""}`} title="Archive" aria-label="Archive">
          <Archive size={16} />
        </button>
        <button onClick={() => setSearchVisible(v => !v)} className={`icon-btn ${searchVisible ? "icon-btn-active" : ""}`} title="Search" aria-label="Toggle search">
          <Search size={16} />
        </button>
        <button onClick={() => fileInputRef.current.click()} className="icon-btn" title="Upload" aria-label="Upload note">
          <Upload size={16} />
        </button>
        <button onClick={props.handleNotesBackup} className="icon-btn" title="Backup" aria-label="Download backup">
          <Download size={16} />
        </button>
        <button onClick={props.onOpenTableConverter} className="icon-btn" title="Tables" aria-label="Table Converter">
          <TableProperties size={16} />
        </button>
        <button onClick={props.onToggleDarkMode} className="icon-btn" title={props.darkMode ? "Light" : "Dark"} aria-label="Toggle theme">
          {props.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <input ref={fileInputRef} type="file" accept=".md" className="hidden" aria-label="Select markdown file" onChange={props.handleNotesUpload} />
        <input ref={zipInputRef} type="file" accept=".zip" className="hidden" aria-label="Select ZIP archive" onChange={props.handleZipImport} />
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
          {props.showTableConverter
            ? "Table Converter"
            : props.viewingArchive
              ? "Archive"
              : props.workspaceName && props.workspaceName !== "Default"
                ? `${props.workspaceName} Notes`
                : "Notes"
          }
        </h4>
        <button onClick={props.onToggleCollapse} className="icon-btn" title="Collapse" aria-label="Collapse sidebar">
          <ChevronsLeft size={16} />
        </button>
      </div>
      {/* Action bar */}
      <div className="sidebar-actions">
        <span className="toolbar-group">
          <button onClick={props.onToggleArchive} className={`icon-btn ${props.viewingArchive ? "icon-btn-active" : ""}`} title={props.viewingArchive ? "Back to Notes" : "Archive"} aria-label={props.viewingArchive ? "Back to notes" : "View archive"} disabled={props.showTableConverter}>
            <Archive size={15} />
          </button>
          <button onClick={props.onOpenTableConverter} className={`icon-btn ${props.showTableConverter ? "icon-btn-active" : ""}`} title={props.showTableConverter ? "Back to Notes" : "Table Converter"} aria-label={props.showTableConverter ? "Back to notes" : "Open table converter"}>
            {props.showTableConverter ? <StickyNote size={15} /> : <TableProperties size={15} />}
          </button>
        </span>
        <span className="toolbar-divider" />
        <span className="toolbar-group">
          <button onClick={() => setSearchVisible(v => !v)} className={`icon-btn ${searchVisible ? "icon-btn-active" : ""}`} title="Search" aria-label="Toggle search" disabled={props.showTableConverter}>
            <Search size={15} />
          </button>
          <button onClick={() => fileInputRef.current.click()} className="icon-btn" title="Upload Note" aria-label="Upload a markdown note" disabled={props.showTableConverter}>
            <Upload size={15} />
          </button>
          <button onClick={() => zipInputRef.current.click()} className="icon-btn" title="Import Archive" aria-label="Import notes from ZIP archive" disabled={props.showTableConverter}>
            <FolderUp size={15} />
          </button>
          <button onClick={props.handleNotesBackup} className="icon-btn" title="Download Backup" aria-label="Download all notes as ZIP" disabled={props.showTableConverter}>
            <Download size={15} />
          </button>
        </span>
        <span className="toolbar-divider" />
        <span className="toolbar-group">
          <button onClick={props.onToggleDarkMode} className="icon-btn" title={props.darkMode ? "Light Mode" : "Dark Mode"} aria-label="Toggle theme">
            {props.darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button data-action="addnote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="New Note" aria-label="Create new note" disabled={props.showTableConverter}>
            <Plus size={16} style={{ pointerEvents: "none" }} />
          </button>
        </span>
      </div>
      {/* Search — toggled via toolbar icon, hidden when table converter is active */}
      {!props.showTableConverter && searchVisible && (
      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search notes, tags..."
          ref={searchRef}
          aria-label="Search notes"
          autoFocus
          onChange={(e) => props.handleSearchNotes(e)}
        />
      </div>
      )}
      <input ref={fileInputRef} type="file" accept=".md" className="hidden" aria-label="Select markdown file" onChange={props.handleNotesUpload} />
      <input ref={zipInputRef} type="file" accept=".zip" className="hidden" aria-label="Select ZIP archive" onChange={props.handleZipImport} />
    </nav>
  );
}

export default NavbarSidebar;
