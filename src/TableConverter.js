import { useState } from "react";
import { convert, detectFormat } from "./services/tableConverter";
import { X, Copy, Check } from "lucide-react";

const FORMATS = [
  { id: "csv", label: "CSV" },
  { id: "tsv", label: "TSV" },
  { id: "markdown", label: "Markdown" },
  { id: "html", label: "HTML" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
];

function TableConverter({ onClose, onInsert, darkMode, fullPage }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fromFormat, setFromFormat] = useState("csv");
  const [toFormat, setToFormat] = useState("markdown");
  const [copied, setCopied] = useState(false);

  const handleInputChange = (val) => {
    setInput(val);
    if (val.trim()) {
      const detected = detectFormat(val);
      setFromFormat(detected);
      const target = detected === "markdown" ? "csv" : "markdown";
      setToFormat(target);
      setOutput(convert(val, detected, target));
    } else {
      setOutput("");
    }
  };

  const handleConvert = () => {
    if (input.trim()) {
      setOutput(convert(input, fromFormat, toFormat));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const formatLabel = FORMATS.find(f => f.id === fromFormat)?.label || fromFormat;

  const content = (
    <>
      <div className={fullPage ? "tc-header" : "modal-header"}>
        <h3>Table Converter</h3>
        {!fullPage && <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>}
      </div>

      <div className="tc-body-vertical">
        {/* Input */}
        <div className="tc-panel">
          <div className="tc-panel-header">
            <span className="tc-label">
              Input
              {input.trim() && <span className="tc-detected">Detected: {formatLabel}</span>}
            </span>
            <select value={fromFormat} onChange={(e) => setFromFormat(e.target.value)} className="tc-select">
              {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <textarea
            className="tc-textarea"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste CSV, JSON, HTML, SQL, or Markdown table here..."
            spellCheck={false}
          />
        </div>

        {/* Format tabs + actions */}
        <div className="tc-convert-bar">
          <div className="tc-format-tabs">
            {FORMATS.map(f => (
              <button
                key={f.id}
                className={`tc-tab ${toFormat === f.id ? "tc-tab-active" : ""}`}
                onClick={() => { setToFormat(f.id); if (input.trim()) setOutput(convert(input, fromFormat, f.id)); }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn-cancel" onClick={handleCopy} disabled={!output} style={{ padding: "4px 12px", fontSize: "12px" }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          {onInsert && (
            <button className="btn-save" onClick={() => { onInsert(toFormat === "markdown" ? output : convert(input, fromFormat, "markdown")); onClose(); }} disabled={!output} style={{ padding: "4px 12px", fontSize: "12px" }}>
              Insert
            </button>
          )}
        </div>

        {/* Output */}
        <div className="tc-panel">
          <textarea
            className="tc-textarea"
            value={output}
            readOnly
            placeholder="Converted output will appear here..."
            spellCheck={false}
          />
        </div>
      </div>

      <div className={fullPage ? "tc-footer" : "modal-footer"}>
        <button className="btn-cancel" onClick={onClose}>{fullPage ? "Back to Notes" : "Close"}</button>
      </div>
    </>
  );

  if (fullPage) {
    return <div className="tc-fullpage">{content}</div>;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog table-converter-modal" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

export default TableConverter;
