import react from "react";
function NoteList(props) {
    var {note} = props
    var ListItemClasses = (note.action==="addnote" ? "note-list-item note-list-item-clicked" : "note-list-item" )
    return (
        <li className={ListItemClasses} id={note.noteid} onClick={((e) => props.handleClick(e, note))} onMouseOver={((e) => props.handleMouseOver(e, note))} onMouseOut={((e) => props.handleMouseOut(e))}>
            {note.title }
        </li>
    )
}

export default NoteList