import react from "react";

function NavbarMain(props) {
  var isActive = props.display;
  var note = props.notesData;
  return (
    <div className={isActive === true ? "nav-bar" : "hidden"}>
      <div>
        <span tooltip="Copy" flow="down">
          <i
            className="far fa-copy btn"
            id="copyBtn"
            onClick={(e) => props.handleCopyEvent(e, note.notebody)}
          ></i>
        </span>
        <span tooltip="Edit" flow="down">
          <i
            className="far fa-edit btn"
            id="editbtn"
            data-action="updatenote"
            onClick={(e) => props.handleEditNoteBtn(e, note)}
          >
            {" "}
          </i>
        </span>

        <div style={{ float: "right" }}>
          <span tooltip="Download" flow="down">
            <i
              className="far fa-arrow-alt-circle-down btn"
              aria-hidden="true"
              // style={{ float: "right" }}
              onClick={(e) => props.handleDownloadNote(note)}
            ></i>
          </span>
          <span tooltip="Delete" flow="down">
            <i
              className="far fa-trash-alt btn"
              aria-hidden="true"
              onClick={(e) => props.handleDeleteNote(e, note)}
            ></i>
          </span>
        </div>
      </div>
    </div>
  );
}
export default NavbarMain;
