import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Minus, X, Check, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

// Parse markdown table → { rows: string[][], alignments: string[] }
function parseMarkdownTable(md) {
  const lines = md.trim().split("\n").filter((l) => l.trim());
  const rows = [];
  const alignments = [];
  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim().replace(/^\|/, "").replace(/\|$/, "");
    const cells = stripped.split("|").map((c) => c.trim());
    if (i === 1 && cells.every((c) => /^:?-+:?$/.test(c))) {
      cells.forEach((c, idx) => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        alignments[idx] = left && right ? "center" : right ? "right" : "left";
      });
      continue;
    }
    rows.push(cells);
  }
  // Default alignment if separator was missing
  if (alignments.length === 0 && rows.length > 0) {
    rows[0].forEach(() => alignments.push("left"));
  }
  return { rows, alignments };
}

// Serialize rows + alignments → markdown
function serializeMarkdown(rows, alignments) {
  if (rows.length === 0) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  // Normalize rows to same column count
  const norm = rows.map((r) => {
    const padded = [...r];
    while (padded.length < cols) padded.push("");
    return padded;
  });
  // Column widths
  const widths = Array.from({ length: cols }, (_, c) =>
    Math.max(3, ...norm.map((r) => (r[c] || "").length))
  );
  let md = "";
  for (let r = 0; r < norm.length; r++) {
    md += "| " + norm[r].map((cell, c) => (cell || "").padEnd(widths[c])).join(" | ") + " |\n";
    if (r === 0) {
      md +=
        "| " +
        widths
          .map((w, c) => {
            const a = alignments[c] || "left";
            const dashes = "-".repeat(Math.max(1, w - (a === "center" ? 2 : a === "right" ? 1 : 0)));
            if (a === "center") return ":" + dashes + ":";
            if (a === "right") return dashes + ":";
            return dashes + "-".repeat(w - dashes.length); // left-aligned, just dashes
          })
          .join(" | ") +
        " |\n";
    }
  }
  return md;
}

export default function TableEditor({ initialMarkdown, onSave, onCancel, darkMode }) {
  const { rows: initRows, alignments: initAlign } = parseMarkdownTable(initialMarkdown || "| Col 1 | Col 2 | Col 3 |\n| --- | --- | --- |\n|  |  |  |");
  const [rows, setRows] = useState(initRows);
  const [alignments, setAlignments] = useState(initAlign);
  const cellRefs = useRef({});

  const cols = Math.max(...rows.map((r) => r.length), 1);

  const focusCell = useCallback((r, c) => {
    setTimeout(() => {
      const el = cellRefs.current[`${r}-${c}`];
      if (el) el.focus();
    }, 10);
  }, []);

  // Focus first data cell on mount
  useEffect(() => focusCell(1, 0), []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCell = (r, c, value) => {
    setRows((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, Array(cols).fill("")]);
    focusCell(rows.length, 0);
  };

  const removeRow = (idx) => {
    if (rows.length <= 2) return; // Keep header + at least 1 row
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCol = () => {
    setRows((prev) => prev.map((row) => [...row, ""]));
    setAlignments((prev) => [...prev, "left"]);
    focusCell(0, cols);
  };

  const removeCol = (idx) => {
    if (cols <= 1) return;
    setRows((prev) => prev.map((row) => row.filter((_, i) => i !== idx)));
    setAlignments((prev) => prev.filter((_, i) => i !== idx));
  };

  const cycleAlignment = (idx) => {
    setAlignments((prev) => {
      const next = [...prev];
      next[idx] = next[idx] === "left" ? "center" : next[idx] === "center" ? "right" : "left";
      return next;
    });
  };

  const handleCellKeyDown = (e, r, c) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        if (c > 0) focusCell(r, c - 1);
        else if (r > 0) focusCell(r - 1, cols - 1);
      } else {
        if (c < cols - 1) focusCell(r, c + 1);
        else if (r < rows.length - 1) focusCell(r + 1, 0);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (r < rows.length - 1) focusCell(r + 1, c);
      else { addRow(); }
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSave = () => {
    onSave(serializeMarkdown(rows, alignments));
  };

  const alignIcon = (a) =>
    a === "center" ? <AlignCenter size={12} /> : a === "right" ? <AlignRight size={12} /> : <AlignLeft size={12} />;

  return (
    <div className={`te-overlay ${darkMode ? "te-dark" : ""}`} onClick={onCancel}>
      <div className="te-modal" onClick={(e) => e.stopPropagation()}>
        <div className="te-header">
          <span className="te-title">Table Editor</span>
          <div className="te-actions">
            <button className="te-btn te-btn-save" onClick={handleSave} title="Apply"><Check size={14} /> Apply</button>
            <button className="te-btn" onClick={onCancel} title="Cancel"><X size={14} /></button>
          </div>
        </div>
        <div className="te-grid-wrap">
          <table className="te-grid">
            <thead>
              <tr>
                <th className="te-corner"></th>
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} className="te-col-header">
                    <button className="te-align-btn" onClick={() => cycleAlignment(c)} title={`Align: ${alignments[c] || "left"}`}>
                      {alignIcon(alignments[c] || "left")}
                    </button>
                    {cols > 1 && (
                      <button className="te-remove-btn" onClick={() => removeCol(c)} title="Remove column"><Minus size={10} /></button>
                    )}
                  </th>
                ))}
                <th className="te-add-col">
                  <button className="te-add-btn" onClick={addCol} title="Add column"><Plus size={12} /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  <td className="te-row-header">
                    {r === 0 ? "H" : r}
                    {rows.length > 2 && r > 0 && (
                      <button className="te-remove-btn" onClick={() => removeRow(r)} title="Remove row"><Minus size={10} /></button>
                    )}
                  </td>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={c} className={`te-cell ${r === 0 ? "te-cell-header" : ""}`}>
                      <input
                        ref={(el) => { cellRefs.current[`${r}-${c}`] = el; }}
                        type="text"
                        value={row[c] || ""}
                        onChange={(e) => updateCell(r, c, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                        className="te-cell-input"
                        style={{ textAlign: alignments[c] || "left" }}
                        placeholder={r === 0 ? "Header" : ""}
                      />
                    </td>
                  ))}
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="te-footer">
          <button className="te-btn" onClick={addRow}><Plus size={12} /> Add Row</button>
          <span className="te-hint"><kbd>Tab</kbd> next cell · <kbd>Enter</kbd> next row · <kbd>Esc</kbd> cancel</span>
        </div>
      </div>
    </div>
  );
}
