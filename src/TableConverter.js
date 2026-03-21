import { useState } from "react";
import { convert, detectFormat } from "./services/tableConverter";
import { X, Copy, ArrowRight, Check } from "lucide-react";

const FORMATS = [
  { id: "csv", label: "CSV" },
  { id: "tsv", label: "TSV" },
  { id: "markdown", label: "Markdown" },
  { id: "html", label: "HTML" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
];

function TableConverter({ onClose, onInsert, darkMode }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [fromFormat, setFromFormat] = useState("csv");
  const [toFormat, setToFormat] = useState("markdown");
  const [copied, setCopied] = useState(false);

  const handleInputChange = (val) => {
    setInput(val);
    const detected = detectFormat(val);
    setFromFormat(detected);
    if (val.trim()) {
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog table-converter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Table Converter</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="tc-body">
          {/* Input */}
          <div className="tc-panel">
            <div className="tc-panel-header">
              <span className="tc-label">Input</span>
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

          {/* Arrow + Convert */}
          <div className="tc-middle">
            <button onClick={handleConvert} className="tc-convert-btn" title="Convert">
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Output */}
          <div className="tc-panel">
            <div className="tc-panel-header">
              <span className="tc-label">Output</span>
              <select value={toFormat} onChange={(e) => { setToFormat(e.target.value); if (input.trim()) setOutput(convert(input, fromFormat, e.target.value)); }} className="tc-select">
                {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <textarea
              className="tc-textarea"
              value={output}
              readOnly
              placeholder="Converted output will appear here..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <button className="btn-cancel" onClick={handleCopy} disabled={!output}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
          {onInsert && (
            <button className="btn-save" onClick={() => { onInsert(toFormat === "markdown" ? output : convert(input, fromFormat, "markdown")); onClose(); }} disabled={!output}>
              Insert Markdown
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TableConverter;
