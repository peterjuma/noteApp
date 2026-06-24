import { useState, useEffect, useRef, useCallback } from "react";
import { Search, FileText, Clock } from "lucide-react";
import Fuse from "fuse.js";

export default function QuickSwitcher({ allNotes, onSelect, onClose, darkMode }) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Build a lightweight titles-only Fuse index
  const fuseRef = useRef(null);
  if (!fuseRef.current && allNotes.length) {
    fuseRef.current = new Fuse(allNotes, {
      keys: [{ name: "title", weight: 0.7 }, { name: "tags", weight: 0.3 }],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
  }

  const results = query.trim()
    ? (fuseRef.current?.search(query) || []).map((r) => r.item).slice(0, 15)
    : allNotes.slice(0, 15); // Show recent when empty

  // Reset active index when results change
  useEffect(() => setActiveIdx(0), [query]);

  // Auto-focus input
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIdx];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && results[activeIdx]) { onSelect(results[activeIdx]); return; }
  }, [results, activeIdx, onSelect, onClose]);

  const bodyPreview = (note) => {
    const text = (note.body || note.notebody || "").replace(/[#*>`_~\[\]]/g, "").trim();
    return text.length > 80 ? text.slice(0, 80) + "…" : text;
  };

  return (
    <div className="qs-overlay" onClick={onClose}>
      <div className={`qs-modal ${darkMode ? "qs-dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="qs-input-row">
          <Search size={16} className="qs-search-icon" />
          <input
            ref={inputRef}
            className="qs-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to note…"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <ul className="qs-list" ref={listRef} role="listbox">
          {results.length === 0 && (
            <li className="qs-empty">No matching notes</li>
          )}
          {results.map((note, i) => (
            <li
              key={note.noteid}
              className={`qs-item ${i === activeIdx ? "qs-item-active" : ""}`}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => onSelect(note)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <FileText size={14} className="qs-item-icon" />
              <div className="qs-item-content">
                <span className="qs-item-title">{note.title || note.notetitle || "Untitled"}</span>
                <span className="qs-item-preview">{bodyPreview(note)}</span>
              </div>
              {!query.trim() && <Clock size={12} className="qs-item-recent" />}
            </li>
          ))}
        </ul>
        <div className="qs-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
