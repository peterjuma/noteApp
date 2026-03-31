import { Download, Trash2, FolderOutput, Copy, Check, FileText, Clock, PencilLine, Share2, MoreVertical, ChevronRight, Pin, Info, X } from "lucide-react";

const SidebarIcon = ({ size = 16, collapsed, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {/* Outer rectangle */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    {/* Sidebar divider */}
    <line x1="9" y1="3" x2="9" y2="21" />
    {/* Directional chevron */}
    {collapsed ? (
      <polyline points="14 10 17 12 14 14" />
    ) : (
      <polyline points="17 10 14 12 17 14" />
    )}
  </svg>
);
import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { md2html } from "./useMarkDown";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveSubmenuOpen, setMoveSubmenuOpen] = useState(false);
  const [showNoteInfo, setShowNoteInfo] = useState(false);
  const menuRef = useRef();

  const otherWorkspaces = (props.workspaces || []).filter(w => w.dbName !== props.activeDb);
  const isPinned = props.isPinned || false;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMoveSubmenuOpen(false);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, closeMenu]);

  if (!isActive) return null;

  const handlePdfDownload = async () => {
    if (exportingPdf || !props.handleDownloadPdf) return;
    setExportingPdf(true);
    closeMenu();
    try {
      await props.handleDownloadPdf(note);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopy = () => {
    const rawHtml = DOMPurify.sanitize(md2html.render(note.notebody || ""));
    const plainText = note.notebody || "";
    copyNoteToClipboard(rawHtml, plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Compute word/char counts for note info
  const wordCount = (note.notebody || "").trim() ? (note.notebody || "").trim().split(/\s+/).length : 0;
  const charCount = (note.notebody || "").length;

  const formatDate = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
    <nav className="view-toolbar" aria-label="Note actions">
      {/* Left: Collapse toggle */}
      {props.onToggleCollapse && (
        <button onClick={props.onToggleCollapse} className={`icon-btn ${props.sidebarCollapsed ? "icon-btn-sidebar-collapsed" : ""}`} title={props.sidebarCollapsed ? "Show sidebar" : "Hide sidebar"} aria-label={props.sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}>
          <SidebarIcon size={20} collapsed={props.sidebarCollapsed} />
        </button>
      )}
      <div style={{ flex: 1 }} />
      <span className="toolbar-group">
        <button onClick={handleCopy} className="view-toolbar-text-btn" title="Copy note (rich HTML + markdown)" aria-label="Copy note">
          {copied ? <><Check size={13} style={{ marginRight: 4 }} />Copied</> : <><Copy size={13} style={{ marginRight: 4 }} />Copy</>}
        </button>
        <button data-action="updatenote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="view-toolbar-text-btn" title="Edit" aria-label="Edit this note">
          <PencilLine size={13} style={{ marginRight: 4 }} />Edit
        </button>
      </span>
      <div className="note-actions-menu-wrapper" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`icon-btn ${menuOpen ? "icon-btn-active" : ""}`}
          title="More actions"
          aria-label="More actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="note-actions-menu" role="menu">
            {/* Pin toggle */}
            <button className="note-actions-menu-item" role="menuitem" onClick={() => {
              closeMenu();
              if (isPinned) {
                if (props.onUnpinNote) props.onUnpinNote(note.noteid);
              } else {
                if (props.onPinNote) props.onPinNote(note.noteid);
              }
            }}>
              <Pin size={15} className={isPinned ? "note-actions-pin-active" : ""} />
              <span>{isPinned ? "Unpin" : "Pin to top"}</span>
            </button>
            <div className="note-actions-menu-divider" role="separator" />
            <button className="note-actions-menu-item" role="menuitem" onClick={handlePdfDownload} disabled={exportingPdf}>
              <FileText size={15} />
              <span>Download PDF</span>
            </button>
            <button className="note-actions-menu-item" role="menuitem" onClick={() => { closeMenu(); props.handleDownloadNote(note); }}>
              <Download size={15} />
              <span>Download Markdown</span>
            </button>
            {navigator.share && (
              <button className="note-actions-menu-item" role="menuitem" onClick={() => {
                closeMenu();
                navigator.share({
                  title: note.notetitle || "Untitled Note",
                  text: note.notebody || "",
                }).catch(() => {});
              }}>
                <Share2 size={15} />
                <span>Share</span>
              </button>
            )}
            {otherWorkspaces.length > 0 && (
              <div
                className="note-actions-menu-item note-actions-submenu-trigger"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={moveSubmenuOpen}
                onMouseEnter={() => setMoveSubmenuOpen(true)}
                onMouseLeave={() => setMoveSubmenuOpen(false)}
                onClick={() => setMoveSubmenuOpen(v => !v)}
              >
                <FolderOutput size={15} />
                <span>Move to…</span>
                <ChevronRight size={13} className="note-actions-submenu-arrow" />
                {moveSubmenuOpen && (
                  <ul className="note-actions-submenu" role="menu">
                    {otherWorkspaces.map((w) => (
                      <li key={w.dbName} className="note-actions-menu-item" role="menuitem" onClick={(e) => { e.stopPropagation(); closeMenu(); if (props.handleMoveNote) props.handleMoveNote(note, w.dbName); }}>
                        {w.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <button className="note-actions-menu-item" role="menuitem" onClick={() => { closeMenu(); if (props.onShowHistory) props.onShowHistory(note); }}>
              <Clock size={15} />
              <span>Version History</span>
            </button>
            <button className="note-actions-menu-item" role="menuitem" onClick={() => { closeMenu(); setShowNoteInfo(true); }}>
              <Info size={15} />
              <span>Note Info</span>
            </button>
            <div className="note-actions-menu-divider" role="separator" />
            <button className="note-actions-menu-item note-actions-menu-item-danger" role="menuitem" onClick={(e) => { closeMenu(); props.handleDeleteNote(e, note); }}>
              <Trash2 size={15} />
              <span>Delete</span>
              <span className="menu-shortcut">⌫</span>
            </button>
          </div>
        )}
      </div>
    </nav>

    {/* Note Info Dialog */}
    {showNoteInfo && (
      <div className="note-info-overlay" onClick={() => setShowNoteInfo(false)}>
        <div className="note-info-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="note-info-header">
            <h3>Note Info</h3>
            <button className="icon-btn" onClick={() => setShowNoteInfo(false)} aria-label="Close">
              <X size={15} />
            </button>
          </div>
          <table className="note-info-table">
            <tbody>
              <tr><td>Created</td><td>{formatDate(props.noteCreatedAt)}</td></tr>
              <tr><td>Modified</td><td>{formatDate(props.noteUpdatedAt)}</td></tr>
              <tr><td>Words</td><td>{wordCount.toLocaleString()}</td></tr>
              <tr><td>Characters</td><td>{charCount.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    )}
    </>
  );
}

export default NavbarMain;
