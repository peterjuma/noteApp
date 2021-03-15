import react from "react";

function NavbarSidebar(props) {
    // console.log(props.homeContent);
    var note = {
        noteid: Math.random().toString(16).slice(2),
        notetitle: '',
        notebody: '',
        activepage: '',
        action: "addnote"
    }
    return (
        <div>
            <div className="nav-bar-left nav-bar">
                <div className="nav-left-icon">
                    <i id="homeBtn" onClick={((e) => props.handleClickHomeBtn(e))} className="fa fa-home fa-lg btn" aria-hidden="true"></i>
                    <h4>All Notes</h4>
                    <i id="addNoteBtn" data-action="addnote" onClick={((e) => props.handleEditNote(e, note))} className="fa fa-plus fa-lg btn" aria-hidden="true"></i>
                </div>
            </div>
            <div className="search-bar">
                <i className="fa fa-search searchButton" aria-hidden="true"></i>
                <input 
                    type="search" 
                    placeholder="Search Notes" 
                    className="search-field" 
                    onChange={((e) => props.handleSearchNotes(e))}
                />
            </div>
        </div>
    )
}

export default NavbarSidebar