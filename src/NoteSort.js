function NoteSort(props) {
  return (
    <div className="sort-order-selector">
      <label>
        Sort by:
        <select
          id="sort-selection"
          defaultValue="2" // Default to "Created: Newest"
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
        <span tooltip="Download Backup" flow="left">
          <i
            className="fas fa-download btn"
            onClick={props.handleNotesBackup}
          ></i>
        </span>
      </div>
    </div>
  );
}


export default NoteSort;
