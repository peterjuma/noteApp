import { useState, useEffect, useRef, useCallback } from "react";
import { Command } from "lucide-react";

export default function CommandPalette({ commands, onClose, darkMode }) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = query.trim()
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => setActiveIdx(0), [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIdx];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter" && filtered[activeIdx]) {
      filtered[activeIdx].action();
      onClose();
      return;
    }
  }, [filtered, activeIdx, onClose]);

  return (
    <div className="qs-overlay" onClick={onClose}>
      <div className={`qs-modal ${darkMode ? "qs-dark" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="qs-input-row">
          <Command size={16} className="qs-search-icon" />
          <input
            ref={inputRef}
            className="qs-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command…"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <ul className="qs-list" ref={listRef} role="listbox">
          {filtered.length === 0 && (
            <li className="qs-empty">No matching commands</li>
          )}
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              className={`qs-item ${i === activeIdx ? "qs-item-active" : ""}`}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => { cmd.action(); onClose(); }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {cmd.icon && <cmd.icon size={14} className="qs-item-icon" />}
              <span className="qs-item-title" style={{ flex: 1 }}>{cmd.label}</span>
              {cmd.shortcut && <kbd className="qs-shortcut">{cmd.shortcut}</kbd>}
            </li>
          ))}
        </ul>
        <div className="qs-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> run</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
