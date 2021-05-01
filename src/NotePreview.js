import React from "react";
import { md2html } from "./useMarkDown";

import marked from "marked";

function NotePreview({ note }) {
  const styles = {
    note_preview: {
      width: "50%",
      height: "100%",
      borderLeft: "1px solid #dcdcde",
    },
    title: {
      paddingTop: "40px",
      paddingBottom: "10px",
      //   paddingLeft: "50px",
      margin: "0 50px",
      borderBottom: "1px solid #eee",
      height: "100px",
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
      position: "absolute",
      bottom: "0",
      borderTop: "1px solid #dcdcde",
      height: "50px",
      width: "50%",
    },
  };
  return (
    <React.Fragment>
      <div style={styles.note_preview}>
        <h2
          style={styles.title}
          dangerouslySetInnerHTML={{ __html: marked(note.notetitle || "") }}
        ></h2>
        <div
          style={styles.body}
          dangerouslySetInnerHTML={{ __html: marked(note.notebody || "") }}
        ></div>
        <div style={styles.bottom}></div>
      </div>
    </React.Fragment>
  );
}

export default NotePreview;
