import React, { Component, Fragment } from "react";

function NoteSort(props) {
  // A ref to programmatically trigger the file input
  const fileInputRef = React.useRef(null);

  // Trigger file input click programmatically
  const triggerFileInputClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="note-sort-bar">
      <label>
        Sort by:
        <select
          id="sort-selection"
          defaultValue="4" // Default to "Modified: Newest"
          onChange={(e) => props.handleSortNotes(e.target.value)} // Pass the selected value
        >
          <option value="choose">Choose here</option>
          <option value="3">Created: Oldest</option>
          <option value="2">Created: Newest</option>
          <option value="0">Title: A-Z</option>
          <option value="1">Title: Z-A</option>
          <option value="4">Modified: Newest</option>
          <option value="5">Modified: Oldest</option>
        </select>
      </label>
      <div className="backupbtn">
        {/* Add a hidden file input to upload a note from a markdown file */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          style={{ display: 'none' }}
          onChange={props.handleNotesUpload}
        />
        <span tooltip="Upload Note" flow="left">
          <i
            className="fas fa-upload btn btn-ext"
            onClick={triggerFileInputClick}
          ></i>
        </span>
        <span tooltip="Download Backup" flow="left">
          <i
            className="fas fa-download btn btn-ext"
            onClick={props.handleNotesBackup}
          ></i>
        </span>
      </div>
    </div>
  );
}

export default NoteSort;
