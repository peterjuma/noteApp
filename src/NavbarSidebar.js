import React from "react";
import { Menu, Plus, Search, Settings, TableProperties, StickyNote, Upload, Layers, X, Moon, Sun, ChevronRight, Home, SlidersHorizontal, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
  const [searchValue, setSearchValue] = React.useState("");
  const [tagFilterOpen, setTagFilterOpen] = React.useState(false);
  const tagFilterRef = React.useRef();
  const [tagAutoComplete, setTagAutoComplete] = React.useState([]);
  const [tagACIndex, setTagACIndex] = React.useState(-1);
  const [hamburgerOpen, setHamburgerOpen] = React.useState(false);
  const [wsSubmenuOpen, setWsSubmenuOpen] = React.useState(false);
  const [showNewWs, setShowNewWs] = React.useState(false);
  const [newWsName, setNewWsName] = React.useState("");
  const newWsInputRef = React.useRef();
  const hamburgerRef = React.useRef();

  const workspaces = props.workspaces || [];

  // Close tag filter when clicking outside
  React.useEffect(() => {
    if (!tagFilterOpen) return;
    const handleClickOutside = (e) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(e.target)) {
        setTagFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tagFilterOpen]);

  // Collect all unique tags from notes
  const allTags = React.useMemo(() => {
    if (!props.allNotes) return [];
    const counts = {};
    for (const n of props.allNotes) {
      for (const t of n.tags || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [props.allNotes]);

  const closeHamburger = React.useCallback(() => {
    setHamburgerOpen(false);
    setWsSubmenuOpen(false);
    setShowNewWs(false);
    setNewWsName("");
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchValue(val);
    props.handleSearchNotes(e);

    // Tag autocomplete: trigger when typing "tag:" prefix
    const tagMatch = val.match(/^tag:(.*)$/i);
    if (tagMatch !== null) {
      const partial = tagMatch[1].toLowerCase();
      const filtered = allTags
        .filter((t) => t.name.includes(partial))
        .slice(0, 10);
      setTagAutoComplete(filtered);
      setTagACIndex(-1);
    } else {
      setTagAutoComplete([]);
      setTagACIndex(-1);
    }
  };

  const clearSearch = () => {
    setSearchValue("");
    props.handleSearchNotes({ target: { value: "" } });
    if (searchRef.current) searchRef.current.focus();
  };

  const handleSearchKeyDown = (e) => {
    // Tag autocomplete navigation
    if (tagAutoComplete.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setTagACIndex((i) => Math.min(i + 1, tagAutoComplete.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setTagACIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter" && tagACIndex >= 0) {
        e.preventDefault();
        const selected = `tag:${tagAutoComplete[tagACIndex].name}`;
        setSearchValue(selected);
        props.handleSearchNotes({ target: { value: selected } });
        setTagAutoComplete([]);
        setTagACIndex(-1);
        return;
      }
      if (e.key === "Escape") {
        setTagAutoComplete([]);
        setTagACIndex(-1);
        return;
      }
    }
    if (e.key === "Escape") {
      setSearchValue("");
      props.handleSearchNotes({ target: { value: "" } });
      e.target.blur();
    }
  };

  // Close hamburger when clicking outside
  React.useEffect(() => {
    if (!hamburgerOpen) return;
    const handleClickOutside = (e) => {
      if (hamburgerRef.current && !hamburgerRef.current.contains(e.target)) {
        closeHamburger();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hamburgerOpen, closeHamburger]);

  // Focus the new-workspace input when shown
  React.useEffect(() => {
    if (showNewWs && newWsInputRef.current) newWsInputRef.current.focus();
  }, [showNewWs]);

  const handleCreateWorkspace = () => {
    if (newWsName.trim() && props.onAddWorkspace) {
      props.onAddWorkspace(newWsName.trim());
      setNewWsName("");
      setShowNewWs(false);
      closeHamburger();
    }
  };

  const isPageActive = props.showSettings || props.showTableConverter;

  const sidebarTitle = props.showSettings
    ? "Settings"
    : props.showTableConverter
      ? "Table Converter"
      : props.workspaceName && props.workspaceName !== "Default"
        ? props.workspaceName
        : "Notes";

  // Hamburger menu content (shared between collapsed and expanded)
  const hamburgerMenu = hamburgerOpen && (
    <div className="sidebar-hamburger-menu" role="menu">
      <button className="sidebar-hamburger-item" role="menuitem" onClick={(e) => { closeHamburger(); if (props.onClosePages) props.onClosePages(); props.handleClickHomeBtn(e); }}>
        <Home size={15} />
        <span>Home</span>
      </button>
      <div className="sidebar-hamburger-divider" role="separator" />
      <button className="sidebar-hamburger-item" role="menuitem" onClick={() => { closeHamburger(); props.onOpenSettings(); }}>
        <Settings size={15} />
        <span>Settings</span>
      </button>
      <button className="sidebar-hamburger-item" role="menuitem" onClick={() => { closeHamburger(); props.onOpenTableConverter(); }}>
        {props.showTableConverter ? <StickyNote size={15} /> : <TableProperties size={15} />}
        <span>{props.showTableConverter ? "Back to Notes" : "Table Converter"}</span>
      </button>
      <button className="sidebar-hamburger-item" role="menuitem" onClick={() => { closeHamburger(); uploadRef.current && uploadRef.current.click(); }} disabled={isPageActive}>
        <Upload size={15} />
        <span>Upload .md</span>
      </button>
      <div className="sidebar-hamburger-divider" role="separator" />
      {workspaces.length > 0 && (
        <div
          className="sidebar-hamburger-item sidebar-hamburger-submenu-trigger"
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={wsSubmenuOpen}
          onMouseEnter={() => setWsSubmenuOpen(true)}
          onMouseLeave={() => { setWsSubmenuOpen(false); setShowNewWs(false); setNewWsName(""); }}
          onClick={() => setWsSubmenuOpen(v => !v)}
        >
          <Layers size={15} />
          <span>Workspaces</span>
          <ChevronRight size={13} className="sidebar-hamburger-submenu-arrow" />
          {wsSubmenuOpen && (
            <ul className="sidebar-hamburger-submenu" role="menu" onClick={(e) => e.stopPropagation()}>
              {workspaces.map((w) => (
                <li key={w.dbName} className={`sidebar-hamburger-item ${w.dbName === props.activeDb ? "sidebar-hamburger-item-active" : ""}`} role="menuitem" onClick={() => { props.onSwitchWorkspace(w.dbName); closeHamburger(); }}>
                  {w.name}
                </li>
              ))}
              <li className="sidebar-hamburger-divider" role="separator" />
              {!showNewWs ? (
                <li className="sidebar-hamburger-item" role="menuitem" onClick={(e) => { e.stopPropagation(); setShowNewWs(true); }}>
                  <Plus size={13} style={{ marginRight: 4 }} />Create workspace
                </li>
              ) : (
                <li className="sidebar-hamburger-inline-create" onClick={(e) => e.stopPropagation()}>
                  <input ref={newWsInputRef} type="text" className="ws-create-input" placeholder="Workspace name..." value={newWsName} onChange={(e) => setNewWsName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreateWorkspace(); if (e.key === "Escape") { setShowNewWs(false); setNewWsName(""); } }} />
                  <button className="ws-create-btn" onClick={handleCreateWorkspace} disabled={!newWsName.trim()}>Create</button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
      <div className="sidebar-hamburger-divider" role="separator" />
      <button className="sidebar-hamburger-item" role="menuitem" onClick={() => { closeHamburger(); if (props.onToggleDarkMode) props.onToggleDarkMode(); }}>
        {props.darkMode ? <Sun size={15} /> : <Moon size={15} />}
        <span>{props.darkMode ? "Light Mode" : "Dark Mode"}</span>
      </button>

    </div>
  );

  if (props.sidebarCollapsed) {
    return (
      <nav aria-label="Sidebar navigation" className="sidebar-collapsed-nav">
        <div className="sidebar-hamburger-wrapper" ref={hamburgerRef}>
          <button onClick={() => setHamburgerOpen(v => !v)} className={`icon-btn ${hamburgerOpen ? "icon-btn-active" : ""}`} title="Menu" aria-label="Menu" aria-expanded={hamburgerOpen} aria-haspopup="menu">
            <Menu size={18} />
          </button>
          {hamburgerMenu}
        </div>
        <input ref={uploadRef} type="file" accept=".md" style={{ display: "none" }} onChange={(e) => { if (props.onUploadNote) props.onUploadNote(e); e.target.value = ""; }} />
        <span className="toolbar-divider" style={{ height: 1, width: 24, margin: "2px 0" }} />
        {props.isHomePage || props.isEditing ? (
          <button onClick={props.onToggleCollapse} className="icon-btn" title="Expand sidebar" aria-label="Expand sidebar">
            <PanelLeftOpen size={18} />
          </button>
        ) : (
          <button data-action="addnote" onClick={(e) => { if (isPageActive && props.onClosePages) props.onClosePages(); props.handleEditNoteBtn(e, note); }} className="icon-btn" title="New Note" aria-label="New note">
            <Plus size={18} style={{ pointerEvents: "none" }} />
          </button>
        )}
      </nav>
    );
  }

  return (
    <nav aria-label="Sidebar navigation">
      {/* Header: Hamburger + Title + New Note */}
      <div className="sidebar-header">
        <div className="sidebar-hamburger-wrapper" ref={hamburgerRef}>
          <button onClick={() => setHamburgerOpen(v => !v)} className={`icon-btn ${hamburgerOpen ? "icon-btn-active" : ""}`} title="Menu" aria-label="Menu" aria-expanded={hamburgerOpen} aria-haspopup="menu">
            <Menu size={18} />
          </button>
          {hamburgerMenu}
        </div>
        <h4 className="sidebar-title">{sidebarTitle}</h4>
        {props.isEditing ? (
          <button onClick={props.onToggleCollapse} className="icon-btn" title="Collapse sidebar" aria-label="Collapse sidebar">
            <PanelLeftClose size={18} />
          </button>
        ) : (
          <button data-action="addnote" onClick={(e) => { if (isPageActive && props.onClosePages) props.onClosePages(); props.handleEditNoteBtn(e, note); }} className="icon-btn sidebar-new-note-btn" title="New Note (⌘⇧I)" aria-label="Create new note">
            <Plus size={18} style={{ pointerEvents: "none" }} />
          </button>
        )}
      </div>
      {/* Always-visible search */}
      <div className="sidebar-search">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search notes… ⌘K"
          ref={searchRef}
          aria-label="Search notes"
          autoComplete="off"
          name="noteapp-search"
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
        {searchValue && (
          <>
            {props.searchResultCount != null && (
              <span className="search-count">{props.searchResultCount}</span>
            )}
            <button className="search-clear-btn" onClick={clearSearch} aria-label="Clear search" title="Clear search">
              <X size={13} />
            </button>
          </>
        )}
        {allTags.length > 0 && (
          <div className="tag-filter-wrapper" ref={tagFilterRef}>
            <button
              className={`tag-filter-btn ${tagFilterOpen ? "tag-filter-btn-active" : ""} ${searchValue.startsWith("tag:") ? "tag-filter-btn-filtering" : ""}`}
              onClick={() => setTagFilterOpen(v => !v)}
              title="Filter by tag"
              aria-label="Filter by tag"
            >
              <SlidersHorizontal size={13} />
            </button>
            {tagFilterOpen && (
              <ul className="tag-filter-dropdown">
                {allTags.map((t) => (
                  <li
                    key={t.name}
                    className={`tag-filter-item ${searchValue === `tag:${t.name}` ? "tag-filter-item-active" : ""}`}
                    onClick={() => {
                      const query = searchValue === `tag:${t.name}` ? "" : `tag:${t.name}`;
                      setSearchValue(query);
                      props.handleSearchNotes({ target: { value: query } });
                      setTagFilterOpen(false);
                    }}
                  >
                    <span className="tag-filter-item-name">{t.name}</span>
                    <span className="tag-filter-item-count">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {/* Tag autocomplete dropdown — appears when typing tag: */}
      {tagAutoComplete.length > 0 && (
        <ul className="search-tag-autocomplete">
          {tagAutoComplete.map((t, i) => (
            <li
              key={t.name}
              className={`search-tag-ac-item ${i === tagACIndex ? "search-tag-ac-item-active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                const selected = `tag:${t.name}`;
                setSearchValue(selected);
                props.handleSearchNotes({ target: { value: selected } });
                setTagAutoComplete([]);
                setTagACIndex(-1);
              }}
            >
              <span className="search-tag-ac-name">{t.name}</span>
              <span className="search-tag-ac-count">{t.count}</span>
            </li>
          ))}
        </ul>
      )}
      <input ref={uploadRef} type="file" accept=".md" style={{ display: "none" }} onChange={(e) => { if (props.onUploadNote) props.onUploadNote(e); e.target.value = ""; }} />
    </nav>
  );
}

export default NavbarSidebar;
