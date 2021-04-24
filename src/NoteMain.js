import { md2html } from "./useMarkDown";
function NoteMain(props) {
  // var jsonData = (JSON.stringify(props.notesData, null, 2)).replace(/\\n/g, '');
  var { notesData } = props;
  return (
    <div className="main">
      <div className="page-header">
        <h2
          id="notetitle-view"
          dangerouslySetInnerHTML={{
            __html: md2html.render(notesData.notetitle),
          }}
        ></h2>
      </div>
      <div
        className="markdown-body"
        id="notebody-view"
        dangerouslySetInnerHTML={{ __html: md2html.render(notesData.notebody) }}
        onCopy={(e) => props.handleCopyEvent(e)}
      ></div>
    </div>
  );
}

export default NoteMain;
