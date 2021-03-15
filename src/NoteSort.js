import react from "react";
function NoteSort(props) {
    return (
        <div className="sort-order-selector">
            <label>Sort by:  
                <select id="sort-selection" defaultValue="<option> Choose here</option>" onChange={((e) => props.handleSortNotes())}>
                    <option> Choose here</option>
                    <option value="3">Created: Oldest</option>
                    <option value="2">Created: Newest</option>
                    <option value="0">Title: A-Z</option>
                    <option value="1">Title: Z-A</option>
                    <option value="4">Modified: Newest</option>
                    <option value="5">Modified: Oldest</option>
                </select>
            </label>
        </div>
    )
}

export default NoteSort