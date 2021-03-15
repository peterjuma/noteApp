import react from "react";

function NavbarMain(props) {
    var isActive = props.display
    var note = props.notesData;    
    return (
        <div className={isActive===true? "nav-bar":"hidden"}>
            <div className="nav-right-icon">
                <i className="far fa-copy fa-lg btn" id="copyBtn" onClick={((e) => props.handleCopyNote(e, note))}></i>
                <i className="far fa-edit fa-lg btn" id="editbtn" data-action="updatenote" onClick={((e) => props.handleEditNote(e, note))}> </i>
                <i className="far fa-trash-alt fa-lg btn" aria-hidden="true" style={{float: "right"}} onClick={((e) => props.handleDeleteNote(e, note))}></i>
                <i className="far fa-arrow-alt-circle-down fa-lg btn" aria-hidden="true" style={{float: "right"}} onClick={((e) => props.handleDownloadNote(e, note))}></i>
            </div>
        </div> 
    )
}
export default NavbarMain