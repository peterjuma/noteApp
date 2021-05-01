import React, { Fragment, useRef, useState, useEffect } from "react";
import NotePreview from "./NotePreview";
import keyCodes from "./KeyCodes";
import { html2md, md2html } from "./useMarkDown";
import marked from "marked";

function NoteEditor(props) {
  var note = props.editNoteData;
  // Set default screen size  - full
  const [splitscreen, setSplitscreen] = useState(false);

  const styles = {
    main_editor: {
      paddingLeft: "5px",
      paddingRight: "1px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      width: splitscreen ? "50%" : "100%",
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
  // Toggle screensize
  const handleSplitScreen = () => {
    setSplitscreen(!splitscreen);
  };
  const curscreensize = splitscreen
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
    handleSplitScreen();
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
  //  Toggle theme
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

  // Handle Input
  const [bodytxt, setBodyTxt] = useState(note.notebody);
  const [title, setTitle] = useState(note.notetitle);
  const textareaRef = useRef();
  const titleRef = useRef();

  const [cusor, setCursor] = useState({
    start: textareaRef.selectionStart,
    end: textareaRef.selectionEnd,
  });
  const handleBlurEvent = () => {
    textareaRef.current.setSelectionRange(cusor.start, cusor.end);
  };
  const handleBodyChange = (e) => {
    // props.handleNoteEditor(e);
    setBodyTxt(e.target.value);
    setCursor({
      start: e.target.selectionStart,
      end: e.target.selectionEnd,
    });
  };
  const handleTitleChange = (e) => {
    // props.handleNoteEditor(e);
    setTitle(e.target.value);
  };

  const handleKeyEvent = (event) => {
    if (event.code === "Tab") {
      processInput("tab");
      event.preventDefault();
    } else if (event.key === '"') {
      processInput("doublequote");
      event.preventDefault();
    } else if (event.key === "(") {
      processInput("brackets");
      event.preventDefault();
    } else if (event.key === "{") {
      processInput("curlybrackets");
      event.preventDefault();
    } else if (event.key === "[") {
      processInput("squarebrackets");
      event.preventDefault();
    } else if (event.key === "<") {
      processInput("anglebrackets");
      event.preventDefault();
    } else if (event.key === "`") {
      processInput("backticks");
      event.preventDefault();
    } else if (event.ctrlKey && event.code === "KeyB") {
      processInput("bold");
    } else if (event.ctrlKey && event.code === "KeyI") {
      processInput("italic");
    } else if (event.ctrlKey && event.code === "KeyL") {
      processInput("link");
    }
  };

  // Button Inputs

  const processInput = (eventcode) => {
    // obtain the object reference for the textarea>
    var txtarea = document.querySelector("textarea");
    // obtain the index of the first selected character
    var start = txtarea.selectionStart;
    // obtain the index of the last selected character
    var finish = txtarea.selectionEnd;
    //obtain all Text
    var allText = txtarea.value;
    // obtain the selected text
    var sel = allText.substring(start, finish);
    var img = `![alt text](${sel})`;
    var link = `[link](${sel})`;
    keyCodes["image"].pattern = img;
    keyCodes["link"].pattern = link;
    var keyCode = keyCodes[eventcode];
    if (keyCode.regEx) {
      var transsel = "";
      var match = /\r|\n/.exec(sel);
      if (match) {
        var lines = sel.split("\n");
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].length > 0 && lines[i] !== undefined) {
            transsel += `${keyCode.pattern} ${lines[i]}\n`;
          }
        }
        sel = transsel;
      } else {
        sel = sel.replace(/^/gm, `${keyCode.pattern} `);
      }
      var newText = `${allText.substring(0, start)}${sel}${allText.substring(
        finish,
        allText.length
      )}`;
      if (newText) {
        setBodyTxt(newText);
        if (eventcode === "tab") {
          setCursor({
            start: start + sel.length,
            end: start + sel.length,
          });
        } else {
          setCursor({
            start: start + keyCode.offsetStart,
            end: start + keyCode.offsetStart,
          });
        }
      }
    } else {
      if (keyCode.pattern !== "") {
        if (eventcode == "image" || eventcode == "link") {
          var newText = `${allText.substring(0, start)}${
            keyCode.pattern
          }${allText.substring(finish, allText.length)}`;
        } else {
          var newText = `${allText.substring(0, start)}${sel}${
            keyCode.pattern
          }${allText.substring(finish, allText.length)}`;
        }
      } else {
        var newText = `${allText.substring(0, start)}${keyCode.open}${sel}${
          keyCode.close
        }${allText.substring(finish, allText.length)}`;
      }
      if (newText) {
        setBodyTxt(newText);
        setCursor({
          start: start + keyCode.offsetStart,
          end: finish + keyCode.offsetEnd,
        });
      }
    }
    txtarea.blur();
    txtarea.focus();
  };
  // Paste Event
  const handlePaste = (e) => {
    // Prevent the default action
    e.preventDefault();
    if (e.clipboardData) {
      // Get the copied text from the clipboard
      const text = e.clipboardData
        ? (e.originalEvent || e).clipboardData.getData("text/plain")
        : // For IE
        window.clipboardData
        ? window.clipboardData.getData("Text")
        : "";
      // Get the copied text from the clipboard
      const html = e.clipboardData
        ? (e.originalEvent || e).clipboardData.getData("text/html")
        : // For IE
        window.clipboardData
        ? window.clipboardData.getData("Html")
        : "";
      let pasteData;
      if (html) {
        // console.log(html);
        html2md.keep(["pre", "code"]);
        pasteData = html2md.turndown(html);
      } else {
        /<[a-z][\s\S]*>/i.test(text)
          ? (pasteData = html2md.turndown(marked(text)))
          : (pasteData = text);
      }
      if (document.queryCommandSupported("insertText")) {
        document.execCommand("insertText", false, pasteData);
      } else {
        // Insert text at the current position of caret
        const range = document.processInputection().getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(pasteData);
        range.insertNode(textNode);
        range.selectNodeContents(textNode);
        range.collapse(false);
        const selection = window.processInputection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Handle Cancel Button

  const handleCancel = () => {
    if (note.action === "updatenote") {
      return document.getElementById(note.noteid).click();
    }
    if (document.querySelectorAll(".note-list-item").length > 0) {
      return document.querySelectorAll(".note-list-item")[0].click();
    }
    return props.handleClickHomeBtn();
  };

  //  Handle Save Noye Button Click

  const handleSave = (e) => {
    note.notetitle = title;
    note.notebody = bodytxt;
    props.handleSaveNote(e, note);
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
            value={title}
            placeholder="Title"
            autoComplete="off"
            ref={titleRef}
            onChange={(e) => handleTitleChange(e)}
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
            onClick={(e) => processInput("bold")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Bold</span>
          </i>
          <i
            className="fas fa-italic md_btn"
            onClick={(e) => processInput("italic")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Italic</span>
          </i>
          <i
            className="fas fa-heading md_btn"
            onClick={(e) => processInput("heading")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Header</span>
          </i>
          <i
            className="fas fa-link md_btn"
            onClick={(e) => processInput("link")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Link</span>
          </i>
          <i
            className="fas fa-list-ol md_btn"
            onClick={(e) => processInput("olist")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Ordered List</span>
          </i>
          <i
            className="fas fa-list md_btn"
            onClick={(e) => processInput("ulist")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Unordered List</span>
          </i>
          <i
            className="fas fa-quote-left md_btn"
            onClick={(e) => processInput("blockquote")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Quote</span>
          </i>
          <i
            className="far fa-image md_btn"
            onClick={(e) => processInput("image")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Image Link</span>
          </i>
          <i
            className="fas fa-terminal md_btn"
            onClick={(e) => processInput("backticks")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Backticks</span>
          </i>
          <i
            className="fas fa-code md_btn"
            onClick={(e) => processInput("codeblock")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Fenced Code</span>
          </i>
          <i
            className="far fa-check-square md_btn"
            onClick={(e) => processInput("tasklist")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Tasklist</span>
          </i>
          <i
            className="fas fa-table md_btn"
            onClick={(e) => processInput("table")}
            style={toggleState.buttonstyle}
          >
            <span className="tooltiptext">Table</span>
          </i>
          <i
            className="fas fa-strikethrough md_btn"
            onClick={(e) => processInput("strike")}
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
              name="notebody"
              onChange={(e) => handleBodyChange(e)}
              onPaste={(e) => handlePaste(e)}
              onKeyDown={(e) => handleKeyEvent(e)}
              data-action={note.action}
              value={bodytxt}
              id="notebody"
              data-action={note.action}
              ref={textareaRef}
              onBlur={(e) => handleBlurEvent(e)}
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
                onClick={(e) => handleSave(e)}
                data-action={note.action}
              ></i>
              <i
                className="far fa-window-close btn-save-cancel fa-2x"
                onClick={(e) => handleCancel()}
              ></i>
            </div>
          </div>
        </div>
      </div>
      {splitscreen && (
        <NotePreview note={{ notebody: bodytxt, notetitle: title }} />
      )}
    </div>
  );
}

export default NoteEditor;
