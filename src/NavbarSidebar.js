import React from "react";

function NavbarSidebar(props) {
  // console.log(props.homeContent);
  var note = {
    noteid: Math.random().toString(16).slice(2),
    notetitle: "",
    notebody: "",
    activepage: "",
    action: "addnote",
  };
  const searchRef = React.useRef();

  return (
    <div>
      <div className="nav-bar-left">
        <div className="nav-left-icon">
          <i
            id="homeBtn"
            onClick={(e) => props.handleClickHomeBtn(e)}
            className="fa fa-home btn"
            aria-hidden="true"
          ></i>
          <h4>Notes</h4>
          <i
            id="addNoteBtn"
            data-action="addnote"
            onClick={(e) => props.handleEditNoteBtn(e, note)}
            className="fa fa-plus btn"
            aria-hidden="true"
          ></i>
        </div>
      </div>
      <div className="search-bar">
        <i
          className="fa fa-search searchButton"
          aria-hidden="true"
          onClick={() => {
            searchRef.current.focus();
          }}
        ></i>
        <input
          type="search"
          placeholder="Search Notes"
          className="search-field"
          ref={searchRef}
          onChange={(e) => props.handleSearchNotes(e)}
        />
      </div>
    </div>
  );
}

export default NavbarSidebar;
