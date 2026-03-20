import { Copy, Pencil, Download, Trash2, Printer } from "lucide-react";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;

  if (!isActive) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <nav className="view-toolbar" aria-label="Note actions">
      <div className="toolbar-group">
        <button onClick={(e) => props.handleCopyEvent(e, note.notebody)} className="icon-btn" title="Copy Markdown" aria-label="Copy note as markdown">
          <Copy size={18} />
        </button>
        <button data-action="updatenote" onClick={(e) => props.handleEditNoteBtn(e, note)} className="icon-btn" title="Edit" aria-label="Edit this note">
          <Pencil size={18} style={{ pointerEvents: "none" }} />
        </button>
      </div>
      <div className="toolbar-group">
        <button onClick={handlePrint} className="icon-btn" title="Print / Export PDF" aria-label="Print or export as PDF">
          <Printer size={18} />
        </button>
        <button onClick={() => props.handleDownloadNote(note)} className="icon-btn" title="Download Markdown" aria-label="Download as markdown file">
          <Download size={18} />
        </button>
        <button onClick={(e) => props.handleDeleteNote(e, note)} className="icon-btn icon-btn-danger" title="Delete" aria-label="Delete this note">
          <Trash2 size={18} />
        </button>
      </div>
    </nav>
  );
}

export default NavbarMain;
