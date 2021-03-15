import React from "react";

function NoteEditor(props) {
    var note = props.editNoteData;
    const ButtonStyle = {
        border: '1px solid #dcdcde'
    }
    return (
        <div className="main-editor">
            <div className="title-header">
                <input name="title" type="text" id="notetitle" data-action={note.action} value={note.notetitle} placeholder="Title" autoComplete="off" onChange={((e) => props.handleEditNote(e, note))} />
            </div>
            <div className="md-editor-tools" id="mdtools">
                <i className="fas fa-bold btn" onClick={((e) => props.processInput("bold"))}></i>
                <i className="fas fa-italic btn" onClick={((e) => props.processInput("italic"))}></i>
                <i className="fas fa-heading btn" onClick={((e) => props.processInput("heading"))}></i>
                <i className="fas fa-link btn" onClick={((e) => props.processInput("link"))}></i>
                <i className="fas fa-list-ol btn" onClick={((e) => props.processInput("olist"))}></i>
                <i className="fas fa-list btn" onClick={((e) => props.processInput("ulist"))}></i>
                <i className="fas fa-quote-left btn" onClick={((e) => props.processInput("blockquote"))}></i>
                <i className="far fa-image btn" onClick={((e) => props.processInput("image"))}></i>
                <i className="fas fa-terminal btn" onClick={((e) => props.processInput("backticks"))}></i>
                <i className="fas fa-code btn" onClick={((e) => props.processInput("codeblock"))}></i>
                <i className="far fa-check-square btn" onClick={((e) => props.processInput("tasklist"))}></i>
                <i className="fas fa-table btn" onClick={((e) => props.processInput("table"))}></i>
                <i className="fas fa-strikethrough btn" onClick={((e) => props.processInput("strike"))}></i>
            </div>
            <div className="md-txtarea">
                <textarea 
                    placeholder="Note" 
                    id="notebody" 
                    data-action={note.action}  
                    value={note.notebody} 
                    onChange={((e) => props.handleEditNote(e, note))} 
                    onPaste={((e) => props.handlePaste(e))} 
                    onKeyDown={((e) => props.handleKeyEvent(e))} 
                />
            </div> 
            <div className="right-bottom-bar">
                <div className="saveCancelBar"> 
                        <i className="far fa-save btn-save-cancel fa-2x" onClick={((e) => props.handleSaveNote(e, note))} data-action={note.action}></i>
                        <i className="far fa-window-close btn-save-cancel fa-2x" onClick={((e) => props.handleCancel(e, note))}></i>
                </div>
            </div>
        </div>
    )
}

export default NoteEditor;