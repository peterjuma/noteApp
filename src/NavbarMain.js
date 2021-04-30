import react from "react";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;
  return (
    <div className={isActive === true ? "nav-bar" : "hidden"}>
      <div>
        <i
          className="far fa-copy btn"
          id="copyBtn"
          onClick={(e) => props.handleCopyNote(e, note)}
        ></i>
        <i
          className="far fa-edit btn"
          id="editbtn"
          data-action="updatenote"
          onClick={(e) => props.handleEditNoteBtn(e, note)}
        >
          {" "}
        </i>
        <i
          className="far fa-trash-alt btn"
          aria-hidden="true"
          style={{ float: "right" }}
          onClick={(e) => props.handleDeleteNote(e, note)}
        ></i>
        <i
          className="far fa-arrow-alt-circle-down btn"
          aria-hidden="true"
          style={{ float: "right" }}
          onClick={(e) => props.handleDownloadNote(note)}
        ></i>
      </div>
    </div>
  );
}
export default NavbarMain;
