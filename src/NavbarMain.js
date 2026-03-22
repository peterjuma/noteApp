import { Download, Trash2, Printer, FolderOutput, Copy, Check } from "lucide-react";
import { useState } from "react";
import DOMPurify from "dompurify";
import { md2html } from "./useMarkDown";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;
  const [copied, setCopied] = useState(false);

  if (!isActive) return null;

  const handlePrint = () => {
    window.print();
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
          Edit
        </button>
      </span>
      <div style={{ flex: 1 }} />
      <span className="toolbar-group">
        <button onClick={handlePrint} className="icon-btn" title="Print / Export PDF" aria-label="Print or export as PDF">
          <Printer size={15} />
        </button>
        <button onClick={() => props.handleDownloadNote(note)} className="icon-btn" title="Download" aria-label="Download as markdown file">
          <Download size={15} />
        </button>
        <button onClick={() => props.handleMoveNote && props.handleMoveNote(note)} className="icon-btn" title="Move to..." aria-label="Move to another workspace">
          <FolderOutput size={15} />
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
