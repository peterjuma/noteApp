import { Download, Trash2, Printer, FolderOutput } from "lucide-react";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;

  if (!isActive) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <nav className="view-toolbar" aria-label="Note actions">
      <span className="toolbar-group">
        <button onClick={(e) => props.handleCopyEvent(e, note.notebody)} className="view-toolbar-text-btn" title="Copy" aria-label="Copy note as markdown">
          Copy
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
