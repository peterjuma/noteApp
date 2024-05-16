import React, { Fragment, useRef, useState, useEffect } from "react";
import keyCodes from "./KeyCodes";
import { html2md, md2html } from "./useMarkDown";
import { marked } from 'marked';
import InputNumber from "react-input-number";


function NoteEditor(props) {

  var note = props.editNoteData;
  const [fontsize, setFontsize] = useState(16);
  const [splitscreen, setSplitscreen] = useState(false);
  const initialBody = note.notebody || '';
  const initialTitle = note.notetitle || '';
  const [bodytxt, setBodyTxt] = useState(initialBody);
  const [title, setTitle] = useState(initialTitle);
  const titleRef = useRef();
  const [history, setHistory] = useState([initialBody]); // Initialize history with the initial or an empty text
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const textAreaRef = useRef();
  const previewRef = useRef();
  const [cusor, setCursor] = useState({ start: 0, end: 0 });

  const styles = {
    main_editor: {
      paddingLeft: "5px",
      paddingRight: "1px",
      height: "100vh",
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
      padding: "30px",
      fontSize: `${fontsize}px`,
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
    inputNum: {
      width: "4.26rem",
      height: "2.7rem",
      borderRadius: "4px 2px 2px 4px",
      color: "#292a2b",
      padding: "0.1ex 1ex",
      border: "1px solid #ccc",
      fontWeight: 250,
      textShadow: "1px 1px 1px rgba(0, 0, 0, 0.1)",
      outline: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    dark: {
      backgroundColor: "hsl(0, 0%, 14%)",
      color: "#afafaf",
    },
    light: {
      backgroundColor: "#fafafa",
      color: "#000000",
    },
    mdtools_dark: {
      backgroundColor: "hsl(0, 0%, 14%)",
      color: "#292a2b",
    },
    btn_dark: {
      backgroundColor: "hsl(0, 0%, 14%)",
      color: "#afafaf",
    },
    mdtools_light: {
      color: "#333",
      backgroundColor: "#fff",
    },
    btn_light: {
      backgroundColor: "#fff",
      color: "#777",
    },
    note_preview: {
      width: "50%",
      height: "100%",
      borderLeft: "1px solid #dcdcde",
    },
    title: {
      paddingTop: "40px",
      paddingBottom: "10px",
      margin: "0 50px", // Adjusted margins to provide padding on smaller screens
      borderBottom: "1px solid #eee",
      whiteSpace: "nowrap", // Prevents the text from wrapping to the next line
      overflow: "auto", // Keeps the text within the bounds of its container
    },
    body: {
      color: "#24292e",
      fontFamily:
        "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji",
      fontSize: "16px",
      lineHeight: "1.5",
      wordWrap: "break-word",
      overflow: "auto",
      height: "calc(100% - 150px)",
      padding: "40px 50px 50px",
    },
    bottom: {
      position: "flex",
      bottom: "0",
      // borderTop: "1px solid #dcdcde",
      // height: "50px",
      margin: "0 50px",
      width: "100%",
    },
  };

  // Toggle screensize
  
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

  const handleSplitScreen = () => setSplitscreen(!splitscreen);

  const toolbarItems = [
    { icon: 'fa-bold', command: 'bold', tooltip: 'Bold' },
    { icon: 'fa-italic', command: 'italic', tooltip: 'Italic' },
    { icon: 'fa-heading', command: 'heading', tooltip: 'Heading' },
    { icon: 'fa-link', command: 'link', tooltip: 'Link' },
    { icon: 'fa-list-ol', command: 'olist', tooltip: 'Ordered List' },
    { icon: 'fa-list', command: 'ulist', tooltip: 'Unordered List' },
    { icon: 'fa-quote-left', command: 'blockquote', tooltip: 'Blockquote' },
    { icon: 'fa-image', command: 'image', tooltip: 'Image' },
    { icon: 'fa-terminal', command: 'backticks', tooltip: 'Backticks' },
    { icon: 'fa-code', command: 'codeblock', tooltip: 'Fenced Code' },
    { icon: 'fa-check-square', command: 'tasklist', tooltip: 'Tasklist' },
    { icon: 'fa-table', command: 'table', tooltip: 'Table' },
    { icon: 'fa-strikethrough', command: 'strike', tooltip: 'Strikethrough' },
    // { icon: 'fa-undo', command: 'undo', tooltip: 'Undo' },
    // { icon: 'fa-redo', command: 'redo', tooltip: 'Redo' },
  ];

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
    const keyBindings = {
      '"': "doublequote",
      '(': "brackets",
      '{': "curlybrackets",
      '[': "squarebrackets",
      '<': "anglebrackets",
      '`': "backticks",
      'Tab': "tab",
      'KeyB': "bold",
      'KeyI': "italic",
      'KeyL': "link"
    };
    // Check if the key pressed is bound to a command
    const command = event.ctrlKey ? keyBindings[event.code] : keyBindings[event.key];
  
    if (command) {
      processInput(command);
      event.preventDefault();  // Prevent the default action of the key press
    }
  };
  
  const processInput = (eventcode) => {
    const txtarea = document.querySelector("textarea");
    const start = txtarea.selectionStart;
    const finish = txtarea.selectionEnd;
    const allText = bodytxt;
    const selectedText = allText.substring(start, finish);
    const keyCode = keyCodes[eventcode];
    let newText;
    let lines = []; 
    let tabReplacement = '';
  
  
    if (eventcode === 'tab') {
      // Handling tab insertion for multiple lines
      tabReplacement = '\t';  // You can adjust this to '    ' (four spaces) if preferred
      lines = allText.substring(start, finish).split('\n');
      const indentedText = lines.map(line => `${tabReplacement}${line}`).join('\n');
      newText = `${allText.substring(0, start)}${indentedText}${allText.substring(finish)}`;
      setCursor({
        start: start + tabReplacement.length,
        end: start + indentedText.length - (lines.length > 1 ? 0 : tabReplacement.length)
      });
    } else if (['image', 'link'].includes(eventcode)) {
      // Special handling for links and images
      const pattern = eventcode === 'image' ? `![alt text](${selectedText})` : `[link](${selectedText})`;
      newText = `${allText.substring(0, start)}${pattern}${allText.substring(finish)}`;
    } else if (keyCode.regEx) {
      // Apply regex pattern transformation
      const transformedText = selectedText.split('\n').map(line => 
        line ? `${keyCode.pattern} ${line}` : line
      ).join('\n');
      newText = `${allText.substring(0, start)}${transformedText}${allText.substring(finish)}`;
    } else if (keyCode.pattern) {
      // Encapsulate selected text with pattern
      newText = `${allText.substring(0, start)}${keyCode.pattern}${selectedText}${keyCode.pattern}${allText.substring(finish)}`;
    } else {
      // Wrap selected text with open/close tags
      newText = `${allText.substring(0, start)}${keyCode.open}${selectedText}${keyCode.close}${allText.substring(finish)}`;
    }
  
    if (newText && newText !== bodytxt) {
      setBodyTxt(newText);
      const cursorOffset = keyCode.offsetEnd || keyCode.pattern.length || (keyCode.close ? keyCode.close.length : 0);
      setCursor({
        start: start + cursorOffset,
        end: finish + cursorOffset + (lines.length - 1) * tabReplacement.length
      });
    }
  };
  
  
  
  // Handle Text selection / cursor position
  useEffect(() => {
    textAreaRef.current.selectionStart = cusor.start;
    textAreaRef.current.selectionEnd = cusor.end;
    textAreaRef.current.focus();
  }, [bodytxt]);

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
  const handleCancelBtn = () => {
    if (note.action === "updatenote") {
      return document.getElementById(note.noteid).click();
    }
    if (document.querySelectorAll(".note-list-item").length > 0) {
      return document.querySelectorAll(".note-list-item")[0].click();
    }
    return props.handleClickHomeBtn();
  };

  //  Handle Save Noye Button Click
  const handleSaveBtn = (e) => {
    note.notetitle = title;
    note.notebody = bodytxt;
    props.handleSaveNote(e, note);
    props.handleSortNotes("4");
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
          <div className="md-editor-tools" id="mdtools" style={toggleState.theme === "vs-light" ? styles.mdtools_light : styles.mdtools_dark}>
              {toolbarItems.map((item) => (
                <span key={item.command} tooltip={item.tooltip}>
                  <i className={`fas ${item.icon} md_btn`} onClick={() => processInput(item.command)} style={toggleState.buttonstyle}></i>
                </span>
              ))}
              {/* Font size adjuster and other controls */}
              <span className="input-div">
                <i className="fas fa-angle-left fa-lg fnt_btn" onClick={() => setFontsize(fontsize - 1)}></i>
                <InputNumber
                  min={10}
                  max={48}
                  step={1}
                  value={fontsize}
                  onChange={setFontsize}
                  style={toggleState.theme === "vs-light" ? styles.inputNum : styles.inputNum}
                />
                <i className="fas fa-angle-right fa-lg fnt_btn" onClick={() => setFontsize(fontsize + 1)}></i>
              </span>

              {/* Screen toggle and theme toggle controls */}
              <div style={styles.buttons}>
                <span tooltip={screenSize.description}>
                  <i className={screenSize.buttonClass} onClick={toggleScreen} style={toggleState.buttonstyle}></i>
                </span>
                <span tooltip={toggleState.description}>
                  <i className={toggleState.themeclass} onClick={toggleTheme} style={toggleState.buttonstyle}></i>
                </span>
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
              ref={textAreaRef}
              selectionend={cusor.end}
              selectionstart={cusor.start}
              style={
                toggleState.theme === "vs-light"
                  ? { ...styles.textarea, ...styles.light }
                  : { ...styles.textarea, ...styles.dark }
              }
            />
          </div>

          <div className="right-bottom-bar">
            <div className="saveCancelBar">
              <span tooltip="Save" flow="right">
                <i
                  className="far fa-save btn-save-cancel fa-2x"
                  onClick={(e) => handleSaveBtn(e)}
                  data-action={note.action}
                ></i>
              </span>
              <span tooltip="Cancel" flow="left">
                <i
                  className="far fa-window-close btn-save-cancel fa-2x"
                  onClick={(e) => handleCancelBtn()}
                ></i>
              </span>
            </div>
          </div>
        </div>
      </div>
      {splitscreen && (
          <div style={styles.note_preview} ref={previewRef}>
            <h2 style={styles.title} dangerouslySetInnerHTML={{ __html: marked(title || "") }}></h2>
            <div style={styles.body} dangerouslySetInnerHTML={{ __html: marked(bodytxt || "") }}></div>
          </div>
      )}
    </div>
  );
}

export default NoteEditor;
