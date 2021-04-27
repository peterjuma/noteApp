import React, { Fragment, useRef, useState, useEffect } from "react";
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
      backgroundColor: "#2c2c2c",
      color: "#ffffff",
    },
    light: {
      backgroundColor: "#fafafa",
      color: "#000000",
    },
    mdtools_dark: {
      backgroundColor: "#5c5c5c",
      color: "#000000",
    },
    mdtools_light: {
      color: "#333",
      backgroundColor: "#fff",
    },
    btn_light: {
      backgroundColor: "#fff",
      color: "#777",
    },
    btn_dark: {
      backgroundColor: "#5c5c5c",
      color: "#fff",
    },
  };

  const [toggleState, setToggleState] = useState({
    theme: "vs-light",
    description: "Dark Mode",
    themeclass: "fas fa-moon fa-lg md_btn",
    buttonstyle: { ...styles.btn_light },
  });

  const toggleTheme = () => {
    toggleDarkMode(toggleState, setToggleState);
  };

  const toggleDarkMode = (toggleState, setToggleState) => {
    toggleState.theme == "vs-dark"
      ? setToggleState({
          theme: "vs-light",
          description: "Dark Mode",
          themeclass: "fas fa-moon fa-lg md_btn",
          buttonstyle: { ...styles.btn_light },
        })
      : setToggleState({
          theme: "vs-dark",
          description: "Light Mode",
          themeclass: "fas fa-sun fa-lg md_btn",
          buttonstyle: { ...styles.btn_dark },
        });
  };

  const curscreensize = props.splitscreen
    ? {
        split: true,
        buttonClass: "far fa-window-maximize fa-lg md_btn",
        description: "Full Screen",
      }
    : {
        split: false,
        buttonClass: "fas fa-columns fa-lg md_btn",
        description: "Split Screen",
      };

  const [screenSize, setScreenSize] = useState(curscreensize);

  const toggleScreen = () => {
    screenSizer(screenSize, setScreenSize);
    props.handleSplitScreen();
  };

  const screenSizer = (screenSize, setScreenSize) => {
    screenSize.split
      ? setScreenSize({
          split: false,
          buttonClass: "fas fa-columns fa-lg md_btn",
          description: "Split Screen",
        })
      : setScreenSize({
          split: true,
          buttonClass: "far fa-window-maximize fa-lg md_btn",
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
        <div
          className="md-editor-tools"
          id="mdtools"
          style={
            toggleState.theme === "vs-light"
              ? { ...styles.mdtools_light }
              : { ...styles.mdtools_dark }
          }
        >
          <i
            className="fas fa-bold md_btn"
            onClick={(e) => props.processInput("bold")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Bold</span>
          </i>
          <i
            className="fas fa-italic md_btn"
            onClick={(e) => props.processInput("italic")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Italic</span>
          </i>
          <i
            className="fas fa-heading md_btn"
            onClick={(e) => props.processInput("heading")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Header</span>
          </i>
          <i
            className="fas fa-link md_btn"
            onClick={(e) => props.processInput("link")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Link</span>
          </i>
          <i
            className="fas fa-list-ol md_btn"
            onClick={(e) => props.processInput("olist")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Ordered List</span>
          </i>
          <i
            className="fas fa-list md_btn"
            onClick={(e) => props.processInput("ulist")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Unordered List</span>
          </i>
          <i
            className="fas fa-quote-left md_btn"
            onClick={(e) => props.processInput("blockquote")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Quote</span>
          </i>
          <i
            className="far fa-image md_btn"
            onClick={(e) => props.processInput("image")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Image Link</span>
          </i>
          <i
            className="fas fa-terminal md_btn"
            onClick={(e) => props.processInput("backticks")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Backticks</span>
          </i>
          <i
            className="fas fa-code md_btn"
            onClick={(e) => props.processInput("codeblock")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Fenced Code</span>
          </i>
          <i
            className="far fa-check-square md_btn"
            onClick={(e) => props.processInput("tasklist")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Tasklist</span>
          </i>
          <i
            className="fas fa-table md_btn"
            onClick={(e) => props.processInput("table")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Table</span>
          </i>
          <i
            className="fas fa-strikethrough md_btn"
            onClick={(e) => props.processInput("strike")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Strikethrough</span>
          </i>
          <div style={styles.buttons}>
            <i
              className={screenSize.buttonClass}
              onClick={() => {
                toggleScreen();
              }}
              style={toggleState.buttonstyle}
            >
              <span className="tooltiptext">{screenSize.description}</span>
            </i>
            <i
              className={toggleState.themeclass}
              onClick={(e) => toggleTheme()}
              style={toggleState.buttonstyle}
            >
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
