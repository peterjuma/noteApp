import { useState, useEffect, useRef } from "react";
import { X, RotateCcw, Clock, ChevronRight } from "lucide-react";
import DOMPurify from "dompurify";
import { md2html } from "./useMarkDown";
import * as db from "./services/notesDB";

function VersionHistory({ noteid, currentTitle, darkMode, activeDb, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const previewRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    db.getVersions(noteid, activeDb).then((v) => {
      if (!cancelled) {
        setVersions(v);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [noteid, activeDb]);

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    let relative;
    if (diffMin < 1) relative = "Just now";
    else if (diffMin < 60) relative = `${diffMin}m ago`;
    else if (diffHr < 24) relative = `${diffHr}h ago`;
    else relative = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return { relative, time, full: d.toLocaleString() };
  };

  const handleRestore = async (version) => {
    const restored = await db.restoreVersion(version.versionId, activeDb);
    if (restored && onRestore) {
      onRestore(restored);
    }
  };

  // Compute diff summary between versions
  const getDiffSummary = (version, prevVersion) => {
    if (!prevVersion) return "Initial version";
    const titleChanged = version.title !== prevVersion.title;
    const bodyLen = (version.body || "").length;
    const prevLen = (prevVersion.body || "").length;
    const diff = bodyLen - prevLen;
    const parts = [];
    if (titleChanged) parts.push("title changed");
    if (diff > 0) parts.push(`+${diff} chars`);
    else if (diff < 0) parts.push(`${diff} chars`);
    else if (!titleChanged) parts.push("no changes");
    return parts.join(", ");
  };

  return (
    <div className={`version-history-panel ${darkMode ? "version-history-dark" : ""}`}>
      {/* Header */}
      <div className="version-history-header">
        <div className="version-history-title">
          <Clock size={16} />
          <h3>Version History</h3>
        </div>
        <span className="version-history-note-title">{currentTitle}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="version-history-body">
        {/* Version list */}
        <div className="version-list">
          {loading ? (
            <div className="settings-empty"><p>Loading...</p></div>
          ) : versions.length === 0 ? (
            <div className="settings-empty"><p>No versions saved yet</p></div>
          ) : (
            versions.map((v, i) => {
              const date = formatDate(v.timestamp);
              const prev = versions[i + 1]; // next in array = previous in time
              return (
                <button
                  key={v.versionId}
                  className={`version-list-item ${selectedVersion?.versionId === v.versionId ? "version-list-item-active" : ""}`}
                  onClick={() => setSelectedVersion(v)}
                >
                  <div className="version-list-info">
                    <span className="version-list-date">{date.relative}</span>
                    <span className="version-list-time">{date.time}</span>
                    <span className="version-list-diff">{getDiffSummary(v, prev)}</span>
                  </div>
                  <ChevronRight size={14} className="version-list-arrow" />
                </button>
              );
            })
          )}
        </div>

        {/* Preview pane */}
        <div className="version-preview">
          {selectedVersion ? (
            <>
              <div className="version-preview-header">
                <span className="version-preview-date">
                  {new Date(selectedVersion.timestamp).toLocaleString()}
                </span>
                <button
                  className="btn-save"
                  style={{ padding: "4px 12px", fontSize: "12px" }}
                  onClick={() => handleRestore(selectedVersion)}
                >
                  <RotateCcw size={12} /> Restore this version
                </button>
              </div>
              <div className="version-preview-content" ref={previewRef}>
                <h2 className="version-preview-title">{selectedVersion.title}</h2>
                <div
                  className="markdown-body"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(md2html.render(selectedVersion.body || "")),
                  }}
                />
              </div>
            </>
          ) : (
            <div className="version-preview-empty">
              <Clock size={32} />
              <p>Select a version to preview</p>
              <p className="version-preview-hint">
                {versions.length} version{versions.length !== 1 ? "s" : ""} saved
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VersionHistory;
