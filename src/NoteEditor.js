import React, { Fragment, useRef, useState } from "react";
import NotePreview from "./NotePreview";

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
    textarea: {
      display: "flex",
      flexDirection: "column",
      maxWidth: "1440px",
      margin: "0 auto",
      width: "100%",
      padding: "50px 60px",
      fontSize: "16px",
      fontWeight: "400",
      overflow: "auto",
      lineHeight: "1.45",
      borderRadius: "0",
      resize: "none",
      boxShadow: "none",
      border: "none",
      height: "100%",
      borderRadius: "5px",
    },
    dark: {
      backgroundColor: "#121212",
      color: "#f0f6fc",
    },
    light: {
      backgroundColor: "#fafbfc",
      color: "#121212",
    },
  };

  const [toggleState, setToggleState] = useState({
    theme: "vs-light",
    description: "Dark Mode",
    themeclass: "fas fa-moon btn fa-lg",
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

  const [screenSize, setScreenSize] = useState({
    split: false,
    buttonClass: "fas fa-columns btn fa-lg",
    description: "Split Screen",
  });

  const toggleScreen = () => {
    screenSizer(screenSize, setScreenSize);
    props.handleSplitScreen();
  };

  const screenSizer = (screenSize, setScreenSize) => {
    screenSize.split
      ? setScreenSize({
          split: false,
          buttonClass: "fas fa-columns btn fa-lg",
          description: "Split Screen",
        })
      : setScreenSize({
          split: true,
          buttonClass: "far fa-window-maximize btn fa-lg",
          description: "Full Screen",
        });
  };

  return (
    <div className="right-row">
      <div></div>
      <div style={styles.main_editor}>
        <div className="title-header">
          <input
            name="notetitle"
            type="text"
            id="notetitle"
            data-action={note.action}
            value={note.notetitle}
            placeholder="Title"
            autoComplete="off"
            // onChange={(e) => props.handleNoteEditor("title", note)}
            onChange={(e) => props.handleNoteEditor(e)}
            style={
              toggleState.theme === "vs-light"
                ? { ...styles.light }
                : { ...styles.dark }
            }
          />
        </div>
        <div className="md-editor-tools" id="mdtools">
          <i
            className="fas fa-bold btn"
            onClick={(e) => props.processInput("bold")}
          >
            <span className="tooltiptext">Bold</span>
          </i>
          <i
            className="fas fa-italic btn"
            onClick={(e) => props.processInput("italic")}
          >
            <span className="tooltiptext">Italic</span>
          </i>
          <i
            className="fas fa-heading btn"
            onClick={(e) => props.processInput("heading")}
          >
            <span className="tooltiptext">Header</span>
          </i>
          <i
            className="fas fa-link btn"
            onClick={(e) => props.processInput("link")}
          >
            <span className="tooltiptext">Link</span>
          </i>
          <i
            className="fas fa-list-ol btn"
            onClick={(e) => props.processInput("olist")}
          >
            <span className="tooltiptext">Ordered List</span>
          </i>
          <i
            className="fas fa-list btn"
            onClick={(e) => props.processInput("ulist")}
          >
            <span className="tooltiptext">Unordered List</span>
          </i>
          <i
            className="fas fa-quote-left btn"
            onClick={(e) => props.processInput("blockquote")}
          >
            <span className="tooltiptext">Quote</span>
          </i>
          <i
            className="far fa-image btn"
            onClick={(e) => props.processInput("image")}
          >
            <span className="tooltiptext">Image Link</span>
          </i>
          <i
            className="fas fa-terminal btn"
            onClick={(e) => props.processInput("backticks")}
          >
            <span className="tooltiptext">Backticks</span>
          </i>
          <i
            className="fas fa-code btn"
            onClick={(e) => props.processInput("codeblock")}
          >
            <span className="tooltiptext">Fenced Code</span>
          </i>
          <i
            className="far fa-check-square btn"
            onClick={(e) => props.processInput("tasklist")}
          >
            <span className="tooltiptext">Tasklist</span>
          </i>
          <i
            className="fas fa-table btn"
            onClick={(e) => props.processInput("table")}
          >
            <span className="tooltiptext">Table</span>
          </i>
          <i
            className="fas fa-strikethrough btn"
            onClick={(e) => props.processInput("strike")}
          >
            <span className="tooltiptext">Strikethrough</span>
          </i>
          <div style={styles.buttons}>
            <i
              className={screenSize.buttonClass}
              onClick={() => {
                toggleScreen();
              }}
            >
              <span className="tooltiptext">{screenSize.description}</span>
            </i>
            <i className={toggleState.themeclass} onClick={() => toggleTheme()}>
              <span className="tooltiptext">{toggleState.description}</span>
            </i>
          </div>
        </div>
        <div className="md-txtarea">
          <div className="texteditor scrollbar">
            <textarea
              // onChange={(e) => props.handleNoteEditor("body", note)}
              name="notebody"
              onChange={(e) => props.handleNoteEditor(e)}
              onPaste={(e) => props.handlePaste(e)}
              onKeyDown={(e) => props.handleKeyEvent(e)}
              data-action={note.action}
              value={note.notebody}
              id="notetitle"
              data-action={note.action}
              style={
                toggleState.theme === "vs-light"
                  ? { ...styles.textarea, ...styles.light }
                  : { ...styles.textarea, ...styles.dark }
              }
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
