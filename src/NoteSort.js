function NoteSort(props) {
  return (
    <div className="sort-bar-container">
      <div className="sort-bar">
        <div className="sort-bar-left">
          <span className="sort-label">Sort:</span>
          <select
            id="sort-selection"
            value={props.sortby || "4"}
            aria-label="Sort notes by"
            onChange={(e) => props.handleSortNotes(e.target.value)}
          >
            <option value="4">Modified: Newest</option>
            <option value="5">Modified: Oldest</option>
            <option value="2">Created: Newest</option>
            <option value="3">Created: Oldest</option>
            <option value="0">Title: A-Z</option>
            <option value="1">Title: Z-A</option>
            {props.sortby === "manual" && <option value="manual">Manual</option>}
          </select>
        </div>
      </div>
    </div>
  );
}

export default NoteSort;
