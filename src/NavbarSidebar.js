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
          <span tooltip="Home" flow="right">
            <i
              id="homeBtn"
              onClick={(e) => props.handleClickHomeBtn(e)}
              className="fa fa-home btn"
              aria-hidden="true"
            ></i>
          </span>
          <h4>Notes</h4>
          <span tooltip="Add Note" flow="left">
            <i
              id="addNoteBtn"
              data-action="addnote"
              onClick={(e) => props.handleEditNoteBtn(e, note)}
              className="fa fa-plus btn"
              aria-hidden="true"
            ></i>
          </span>
        </div>
      </div>
      <div className="search-bar">
        {/* search button */}
        <span className="search-icon">
          <i className="fa fa-search"></i>
        </span>
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
