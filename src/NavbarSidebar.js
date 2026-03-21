import React from "react";
import { Home, Plus, Search, Moon, Sun, Archive, ChevronsLeft, ChevronsRight } from "lucide-react";

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
        <button data-action="addnote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="Add Note" aria-label="Add note">
          <Plus size={18} style={{ pointerEvents: "none" }} />
        </button>
        <button onClick={props.onToggleArchive} className={`icon-btn ${props.viewingArchive ? "icon-btn-active" : ""}`} title="Archive" aria-label="Archive">
          <Archive size={16} />
        </button>
        <button onClick={props.onToggleDarkMode} className="icon-btn" title={props.darkMode ? "Light" : "Dark"} aria-label="Toggle theme">
          {props.darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={() => searchRef.current && searchRef.current.focus()} className="icon-btn" title="Search" aria-label="Search">
          <Search size={16} />
        </button>
      </nav>
    );
  }

  return (
    <nav aria-label="Sidebar navigation">
      <div className="sidebar-header">
        <button
          onClick={(e) => props.handleClickHomeBtn(e)}
          className="icon-btn"
          title="Home"
          aria-label="Go to home page"
        >
          <Home size={18} />
        </button>
        <h4 className="sidebar-title">{props.viewingArchive ? "Archive" : "Notes"}</h4>
        <div style={{ display: "flex", gap: "2px" }}>
          <button
            onClick={props.onToggleArchive}
            className={`icon-btn ${props.viewingArchive ? "icon-btn-active" : ""}`}
            title={props.viewingArchive ? "Back to Notes" : "View Archive"}
            aria-label={props.viewingArchive ? "Back to notes" : "View archived notes"}
          >
            <Archive size={16} />
          </button>
          <button
            onClick={props.onToggleDarkMode}
            className="icon-btn"
            title={props.darkMode ? "Light Mode" : "Dark Mode"}
            aria-label={props.darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {props.darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            data-action="addnote"
            onClick={(e) => props.handleEditNoteBtn(e, note)}
            className="icon-btn"
            title="Add Note"
          >
            <Plus size={18} style={{ pointerEvents: "none" }} />
          </button>
          <button onClick={props.onToggleCollapse} className="icon-btn" title="Collapse" aria-label="Collapse sidebar">
            <ChevronsLeft size={16} />
          </button>
        </div>
      </div>
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
    </nav>
  );
}

export default NavbarSidebar;
