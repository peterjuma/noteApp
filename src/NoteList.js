import React from "react";

function NoteList(props) {
  const { note, isPinned, handlePinNote, handleUnpinNote } = props;
  const listItemClasses = note.action === "addnote"
    ? "note-list-item note-list-item-clicked"
    : "note-list-item";

  const handleClick = () => {
    if (isPinned) {
      handleUnpinNote(note.noteid);
    } else {
      handlePinNote(note.noteid);
    }
  };

  return (
    <li
      className="note-list-item"
      id={note.noteid}
      onClick={(e) => props.handleNoteListItemClick(e, note)}
      onMouseOver={(e) => props.handleMouseOver(e, note)}
      onMouseOut={(e) => props.handleMouseOut(e)}
    >
      <span className="note-title">{note.title}</span>

      {/* Pin/Unpin button */}
      <span className="pin-icon-container"
      style={{ position: 'absolute', right: '2.5px', top: '50%', transform: 'translateY(-50%)' }}
      >
        <button
          onClick={handleClick}
          className={`pin-btn ${isPinned ? 'unpin' : ''}`}
          title={isPinned ? "Unpin this note" : "Pin this note"}
        >
          <i className="fas fa-thumbtack"></i>
        </button>
      </span>
    </li>
  );
}

export default NoteList;
