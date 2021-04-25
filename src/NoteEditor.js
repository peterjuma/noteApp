import React, { Fragment, useRef, useState } from "react";
import NotePreview from "./NotePreview";
import Editor from "@monaco-editor/react";

function NoteEditor(props) {
  var note = props.editNoteData;
  const ButtonStyle = {
    border: "1px solid #dcdcde",
  };
  const styles = {
    main_editor: {
      paddingLeft: "5px",
      paddingRight: "1px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      width: props.splitscreen ? "50%" : "100%",
    },
    buttons: {
      display: "inline-flex",
      float: "right",
      borderLeft: "1px solid #dcdcde",
    },
  };

  const [toggleState, setToggleState] = useState({
    theme: "vs-dark",
    description: "Light Mode",
    themeclass: "fas fa-sun btn fa-lg",
  });

  const toggleTheme = () => {
    toggleDarkMode(toggleState, setToggleState);
  };

  const toggleDarkMode = (toggleState, setToggleState) => {
    toggleState.theme == "vs-dark"
      ? setToggleState({
          theme: "vs-light",
          description: "Dark Mode",
          themeclass: "fas fa-moon btn fa-lg",
        })
      : setToggleState({
          theme: "vs-dark",
          description: "Light Mode",
          themeclass: "fas fa-sun btn fa-lg",
        });
  };

  return (
    <div className="right-row">
      <div></div>
      <div style={styles.main_editor}>
        <div className="title-header">
          <input
            name="title"
            type="text"
            id="notetitle"
            data-action={note.action}
            value={note.notetitle}
            placeholder="Title"
            autoComplete="off"
            onChange={(e) => props.handleNoteEditor("title", e)}
          />
        </div>
        <div className="md-editor-tools" id="mdtools">
          <i
            className="fas fa-bold btn"
            onClick={(e) => props.processInput("bold")}
          ></i>
          <i
            className="fas fa-italic btn"
            onClick={(e) => props.processInput("italic")}
          ></i>
          <i
            className="fas fa-heading btn"
            onClick={(e) => props.processInput("heading")}
          ></i>
          <i
            className="fas fa-link btn"
            onClick={(e) => props.processInput("link")}
          ></i>
          <i
            className="fas fa-list-ol btn"
            onClick={(e) => props.processInput("olist")}
          ></i>
          <i
            className="fas fa-list btn"
            onClick={(e) => props.processInput("ulist")}
          ></i>
          <i
            className="fas fa-quote-left btn"
            onClick={(e) => props.processInput("blockquote")}
          ></i>
          <i
            className="far fa-image btn"
            onClick={(e) => props.processInput("image")}
          ></i>
          <i
            className="fas fa-terminal btn"
            onClick={(e) => props.processInput("backticks")}
          ></i>
          <i
            className="fas fa-code btn"
            onClick={(e) => props.processInput("codeblock")}
          ></i>
          <i
            className="far fa-check-square btn"
            onClick={(e) => props.processInput("tasklist")}
          ></i>
          <i
            className="fas fa-table btn"
            onClick={(e) => props.processInput("table")}
          ></i>
          <i
            className="fas fa-strikethrough btn"
            onClick={(e) => props.processInput("strike")}
          ></i>
          <div style={styles.buttons}>
            <i
              className="fas fa-columns btn fa-lg"
              onClick={() => {
                props.handleSplitScreen();
              }}
            >
              <span class="tooltiptext">Split Screen</span>
            </i>
            <i className={toggleState.themeclass} onClick={() => toggleTheme()}>
              <span class="tooltiptext">{toggleState.description}</span>
            </i>
          </div>
        </div>
        <div className="md-txtarea">
          <div className="texteditor scrollbar">
            <Editor
              theme={toggleState.theme}
              language="markdown"
              defaultLanguage="markdown"
              defaultValue="## Enter Markdown text here..."
              data-action={note.action}
              value={note.notebody}
              id="notetitle"
              onChange={(e) => props.handleNoteEditor("body", e)}
              onPaste={(e) => props.handlePaste(e)}
              onKeyDown={(e) => props.handleKeyEvent(e)}
              loading={"Loading..."}
              options={{
                minimap: {
                  enabled: false,
                },
                lineNumbers: false,
                wordWrap: "on",
                wrappingIndent: "none",
                verticalScrollbarSize: 17,
                horizontalScrollbarSize: 17,
                arrowSize: 30,
                padding: {
                  top: "20",
                },
                tabCompletion: "on",
              }}
            />
          </div>

          <div className="right-bottom-bar">
            <div className="saveCancelBar">
              <i
                className="far fa-save btn-save-cancel fa-2x"
                onClick={(e) => props.handleSaveNote(e, note)}
                data-action={note.action}
              ></i>
              <i
                className="far fa-window-close btn-save-cancel fa-2x"
                onClick={(e) => props.handleCancel(e, note)}
              ></i>
            </div>
          </div>
        </div>
      </div>
      {props.splitscreen && <NotePreview note={note} />}
    </div>
  );
}

export default NoteEditor;
