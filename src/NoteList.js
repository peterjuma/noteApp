import { useState, useEffect, useCallback, useRef } from "react";
import { Pin, PinOff, GripVertical, Trash2 } from "lucide-react";

function NoteList(props) {
  const {
    note, isPinned, isActive, isSelected, selectedCount, searchQuery,
    handlePinNote, handleUnpinNote,
    handleToggleSelectNote, handleSelectRange,
    handleBulkDeleteNotes, handleClearSelection,
  } = props;

  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);

  const closeMenu = useCallback(() => setContextMenu(null), []);

  // Highlight matching text in title
  const highlightTitle = (title, query) => {
    if (!query || query.startsWith("body:")) return title;
    const clean = query.replace(/^(title:|tag:)/, "").trim();
    if (!clean) return title;
    try {
      const regex = new RegExp(`(${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const parts = title.split(regex);
      if (parts.length === 1) return title;
      return parts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
      );
    } catch {
      return title;
    }
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu();
    };
    const handleEsc = (e) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [contextMenu, closeMenu]);

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (isPinned) {
      handleUnpinNote(note.noteid);
    } else {
      handlePinNote(note.noteid);
    }
  };

  const handleClick = (e) => {
    const isMeta = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    if (isMeta) {
      e.preventDefault();
      handleToggleSelectNote(note.noteid);
      return;
    }
    if (isShift) {
      e.preventDefault();
      handleSelectRange();
      return;
    }
    // Normal click: clear selection and navigate
    if (selectedCount > 0) handleClearSelection();
    props.handleNoteListItemClick(e, note);
  };

  const handleContextMenu = (e) => {
    // Only show bulk-delete context menu when there's a selection
    if (selectedCount === 0 && !isSelected) return;
    e.preventDefault();
    // If right-clicking an unselected note while others are selected, add it to selection
    if (!isSelected && selectedCount > 0) {
      handleToggleSelectNote(note.noteid);
    }
    // If right-clicking a single unselected note with no selection, select it first
    if (!isSelected && selectedCount === 0) {
      handleToggleSelectNote(note.noteid);
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        handleToggleSelectNote(note.noteid);
      } else if (e.shiftKey) {
        handleSelectRange();
      } else {
        if (selectedCount > 0) handleClearSelection();
        props.handleNoteListItemClick(e, note);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = e.target.nextElementSibling;
      if (next) next.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = e.target.previousElementSibling;
      if (prev) prev.focus();
    } else if (e.key === "Escape" && selectedCount > 0) {
      handleClearSelection();
    }
  };

  const itemClasses = [
    "note-item",
    isActive && !isSelected ? "note-item-active" : "",
    isSelected ? "note-item-selected" : "",
  ].filter(Boolean).join(" ");

  return (
    <li
      className={itemClasses}
      id={note.noteid}
      tabIndex={0}
      role="option"
      aria-selected={isActive || isSelected}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", note.noteid);
        e.dataTransfer.effectAllowed = "move";
        e.target.classList.add("note-item-dragging");
      }}
      onDragEnd={(e) => {
        e.target.classList.remove("note-item-dragging");
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        e.target.closest(".note-item")?.classList.add("note-item-dragover");
      }}
      onDragLeave={(e) => {
        e.target.closest(".note-item")?.classList.remove("note-item-dragover");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.target.closest(".note-item")?.classList.remove("note-item-dragover");
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== note.noteid) {
          if (props.onReorder) props.onReorder(draggedId, note.noteid);
          if (isPinned && props.handlePinNote) {
            props.handlePinNote(draggedId);
          }
        }
      }}
    >
      <span className="drag-handle" role="img" aria-label="Drag to reorder">
        <GripVertical size={14} />
      </span>
      <span className="note-item-title">{highlightTitle(note.title, searchQuery)}</span>
      <button
        onClick={handlePinClick}
        className={`pin-btn ${isPinned ? "pin-btn-pinned" : "pin-btn-unpinned"}`}
        title={isPinned ? "Unpin this note" : "Pin this note"}
        aria-label={isPinned ? "Unpin this note" : "Pin this note"}
        tabIndex={-1}
      >
        {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="note-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="note-context-menu-item note-context-menu-danger"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              handleBulkDeleteNotes();
            }}
          >
            <Trash2 size={14} />
            Delete {selectedCount > 1 ? `${selectedCount} notes` : "note"}
          </button>
        </div>
      )}
    </li>
  );
}

export default NoteList;
