import React from "react";
import { Home, Plus, Search, Moon, Sun } from "lucide-react";

function NavbarSidebar(props) {
  var note = {
    noteid: Date.now().toString(),
    notetitle: "",
    notebody: "",
    activepage: "",
    action: "addnote",
  };
  const searchRef = React.useRef();

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
        <h4 className="sidebar-title">Notes</h4>
        <div style={{ display: "flex", gap: "2px" }}>
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
        </div>
      </div>
      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search notes..."
          ref={searchRef}
          aria-label="Search notes"
          onChange={(e) => props.handleSearchNotes(e)}
        />
      </div>
    </nav>
  );
}

export default NavbarSidebar;
