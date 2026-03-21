import React from "react";
import { Home, Plus, Search, Moon, Sun, Archive, ChevronsLeft, ChevronsRight, TableProperties } from "lucide-react";

function NavbarSidebar(props) {
  var note = {
    noteid: Date.now().toString(),
    notetitle: "",
    notebody: "",
    activepage: "",
    action: "addnote",
  };
  const searchRef = React.useRef();

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
        <button onClick={props.onOpenTableConverter} className="icon-btn" title="Tables" aria-label="Table Converter">
          <TableProperties size={16} />
        </button>
        <button onClick={props.onToggleDarkMode} className="icon-btn" title={props.darkMode ? "Light" : "Dark"} aria-label="Toggle theme">
          {props.darkMode ? <Sun size={16} /> : <Moon size={16} />}
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
      {/* Action bar: Archive, Dark, TableConverter, Add */}
      <div className="sidebar-actions">
        <button onClick={props.onToggleArchive} className={`icon-btn ${props.viewingArchive ? "icon-btn-active" : ""}`} title={props.viewingArchive ? "Back to Notes" : "Archive"} aria-label={props.viewingArchive ? "Back to notes" : "View archive"} disabled={props.showTableConverter}>
          <Archive size={15} />
        </button>
        <button onClick={props.onToggleDarkMode} className="icon-btn" title={props.darkMode ? "Light Mode" : "Dark Mode"} aria-label="Toggle theme">
          {props.darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button onClick={props.onOpenTableConverter} className={`icon-btn ${props.showTableConverter ? "icon-btn-active" : ""}`} title="Table Converter" aria-label="Open table converter">
          <TableProperties size={15} />
        </button>
        <div style={{ flex: 1 }} />
        <button data-action="addnote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="New Note" aria-label="Create new note" disabled={props.showTableConverter}>
          <Plus size={16} style={{ pointerEvents: "none" }} />
        </button>
      </div>
      {/* Search — hidden when table converter is active */}
      {!props.showTableConverter && (
      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search notes, tags..."
          ref={searchRef}
          aria-label="Search notes"
          onChange={(e) => props.handleSearchNotes(e)}
        />
      </div>
      )}
    </nav>
  );
}

export default NavbarSidebar;
