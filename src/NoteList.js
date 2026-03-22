import { Pin, PinOff, GripVertical } from "lucide-react";

function NoteList(props) {
  const { note, isPinned, isActive, handlePinNote, handleUnpinNote } = props;

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (isPinned) {
      handleUnpinNote(note.noteid);
    } else {
      handlePinNote(note.noteid);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.handleNoteListItemClick(e, note);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = e.target.nextElementSibling;
      if (next) next.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = e.target.previousElementSibling;
      if (prev) prev.focus();
    }
  };

  return (
    <li
      className={`note-item ${isActive ? "note-item-active" : ""}`}
      id={note.noteid}
      tabIndex={0}
      role="option"
      aria-selected={isActive}
      onClick={(e) => props.handleNoteListItemClick(e, note)}
      onKeyDown={handleKeyDown}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", note.noteid);
        e.dataTransfer.effectAllowed = "move";
        e.target.classList.add("note-item-dragging");
      }}
      onDragEnd={(e) => {
        e.target.classList.remove("note-item-dragging");
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        e.target.closest(".note-item")?.classList.add("note-item-dragover");
      }}
      onDragLeave={(e) => {
        e.target.closest(".note-item")?.classList.remove("note-item-dragover");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.target.closest(".note-item")?.classList.remove("note-item-dragover");
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== note.noteid) {
          if (props.onReorder) props.onReorder(draggedId, note.noteid);
          // If dropping into pinned section and note isn't pinned, pin it
          if (isPinned && props.handlePinNote) {
            // Only pin if not already pinned (handlePinNote checks internally)
            props.handlePinNote(draggedId);
          }
        }
      }}
    >
      <span className="drag-handle" role="img" aria-label="Drag to reorder">
        <GripVertical size={14} />
      </span>
      <span className="note-item-title">{note.title}</span>
      <button
        onClick={handlePinClick}
        className={`pin-btn ${isPinned ? "pin-btn-pinned" : "pin-btn-unpinned"}`}
        title={isPinned ? "Unpin this note" : "Pin this note"}
        aria-label={isPinned ? "Unpin this note" : "Pin this note"}
        tabIndex={-1}
      >
        {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>
    </li>
  );
}

export default NoteList;
