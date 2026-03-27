import { Download, Trash2, FolderOutput, Copy, Check, FileText, Clock, PencilLine } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";
import { md2html } from "./useMarkDown";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);
  const moveDropdownRef = useRef();

  const otherWorkspaces = (props.workspaces || []).filter(w => w.dbName !== props.activeDb);

  // Close move dropdown when clicking outside
  useEffect(() => {
    if (!moveDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(e.target)) {
        setMoveDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moveDropdownOpen]);

  if (!isActive) return null;

  const handlePdfDownload = async () => {
    if (exportingPdf || !props.handleDownloadPdf) return;
    setExportingPdf(true);
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
      <span className="toolbar-group">
        <button onClick={handleCopy} className="view-toolbar-text-btn" title="Copy note (rich HTML + markdown)" aria-label="Copy note">
          {copied ? <><Check size={13} style={{ marginRight: 4 }} />Copied</> : <><Copy size={13} style={{ marginRight: 4 }} />Copy</>}
        </button>
        <button data-action="updatenote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="view-toolbar-text-btn" title="Edit" aria-label="Edit this note">
          <PencilLine size={13} style={{ marginRight: 4 }} />Edit
        </button>
      </span>
      <div style={{ flex: 1 }} />
      <span className="toolbar-group">
        <button onClick={handlePdfDownload} className="icon-btn" title="Download PDF" aria-label="Download as PDF" disabled={exportingPdf}>
          <FileText size={15} />
        </button>
        <button onClick={() => props.handleDownloadNote(note)} className="icon-btn" title="Download .md" aria-label="Download as markdown file">
          <Download size={15} />
        </button>
        <div className="ws-switcher-wrapper" ref={moveDropdownRef} style={{ position: "relative" }}>
          <button onClick={() => setMoveDropdownOpen(v => !v)} className={`icon-btn ${moveDropdownOpen ? "icon-btn-active" : ""}`} title="Move to..." aria-label="Move to another workspace" disabled={otherWorkspaces.length === 0}>
            <FolderOutput size={15} />
          </button>
          {moveDropdownOpen && (
            <ul className="ws-switcher-dropdown" style={{ left: "auto", right: 0 }}>
              {otherWorkspaces.map((w) => (
                <li key={w.dbName} className="ws-switcher-item" onClick={() => { setMoveDropdownOpen(false); if (props.handleMoveNote) props.handleMoveNote(note, w.dbName); }}>
                  {w.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={() => props.onShowHistory && props.onShowHistory(note)} className="icon-btn" title="Version History" aria-label="Version history">
          <Clock size={15} />
        </button>
      </span>
      <span className="toolbar-divider" />
      <span className="toolbar-group">
        <button onClick={(e) => props.handleDeleteNote(e, note)} className="icon-btn icon-btn-danger" title="Delete" aria-label="Delete this note">
          <Trash2 size={15} />
        </button>
      </span>
    </nav>
  );
}

export default NavbarMain;
