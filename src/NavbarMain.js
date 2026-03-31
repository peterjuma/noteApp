import { Download, Trash2, FolderOutput, Copy, Check, FileText, Clock, PencilLine, Share2, MoreVertical, ChevronRight } from "lucide-react";
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
  const menuRef = useRef();

  const otherWorkspaces = (props.workspaces || []).filter(w => w.dbName !== props.activeDb);

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
    const html = DOMPurify.sanitize(md2html.render(note.notebody || ""));
    const plainText = note.notebody || "";
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    });
    navigator.clipboard.write([item]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <nav className="view-toolbar" aria-label="Note actions">
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
            <div className="note-actions-menu-divider" role="separator" />
            <button className="note-actions-menu-item note-actions-menu-item-danger" role="menuitem" onClick={(e) => { closeMenu(); props.handleDeleteNote(e, note); }}>
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default NavbarMain;
