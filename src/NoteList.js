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
      // style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} // Align elements
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <span>{note.title}</span>
      <span className="pin-icon-container" 
      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
      >
        <button 
        onClick={handleClick} 
        className="pin-btn" 
        style={{ background: 'none', border: 'none', cursor: 'pointer' }} 
        title={isPinned ? "Unpin this note" : "Pin this note"} 
        >
          {isPinned ? (
            <i className="fas fa-ban fnt_btn pinned"></i>
          ) : (
            <i className="fas fa-thumbtack fnt_btn unpinned"></i>
          )}
        </button>
      </span>
    </li>
  );
}

export default NoteList;
