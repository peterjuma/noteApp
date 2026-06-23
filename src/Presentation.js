import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import { md2html } from "./useMarkDown";
import * as noteDB from "./services/notesDB";
import { parseDeck } from "./services/slides";
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Monitor, LayoutGrid, Timer, RotateCcw } from "lucide-react";

// Allow noteapp-img: protocol for inline images stored in IndexedDB (matches NoteMain)
const PURIFY_URI_REGEX = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|noteapp-img):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;
const PURIFY_OPTS = { ALLOWED_URI_REGEXP: PURIFY_URI_REGEX };

// Lazy-load mermaid only when a slide actually contains a diagram
let mermaidModule = null;
async function getMermaid() {
  if (!mermaidModule) {
    const m = await import("mermaid");
    mermaidModule = m.default;
    mermaidModule.initialize({ startOnLoad: false, theme: "default" });
  }
  return mermaidModule;
}

// Render markdown -> sanitized HTML, with optional mermaid + image post-processing.
function SlideView({ markdown, className, postProcess = true }) {
  const ref = useRef(null);
  const html = useMemo(
    () => DOMPurify.sanitize(md2html.render(markdown || ""), PURIFY_OPTS),
    [markdown]
  );

  useEffect(() => {
    if (!postProcess) return undefined;
    const container = ref.current;
    if (!container) return undefined;
    let cancelled = false;

    const resolveImages = async () => {
      const images = container.querySelectorAll('img[src^="noteapp-img:"]');
      for (const img of images) {
        const id = img.getAttribute("src").replace("noteapp-img:", "");
        const url = await noteDB.getImageURL(id);
        if (cancelled) return;
        if (url) img.src = url;
        else img.alt = `[Image not found: ${id}]`;
      }
    };

    const renderMermaid = async () => {
      const blocks = container.querySelectorAll("code.language-mermaid");
      if (blocks.length === 0) return;
      const mermaid = await getMermaid();
      if (cancelled) return;
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const pre = block.parentNode;
        if (!pre || !pre.parentNode) continue;
        const diagram = document.createElement("div");
        diagram.className = "mermaid-diagram";
        try {
          const id = `present-mermaid-${i}-${Math.random().toString(36).slice(2, 8)}`;
          const { svg } = await mermaid.render(id, block.textContent.trim());
          if (cancelled) return;
          diagram.innerHTML = DOMPurify.sanitize(svg, { ADD_TAGS: ["foreignObject"], ADD_ATTR: ["requiredExtensions"] });
          pre.replaceWith(diagram);
        } catch {
          /* leave code block as-is on failure */
        }
      }
    };

    resolveImages();
    renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [html, postProcess]);

  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Presentation({ title, body, darkMode, onClose }) {
  const deck = useMemo(() => parseDeck(body), [body]);
  const slides = deck.map((d) => d.content);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const rootRef = useRef(null);
  const startRef = useRef(Date.now());

  const total = slides.length;
  const clamp = useCallback((i) => Math.max(0, Math.min(total - 1, i)), [total]);
  const next = useCallback(() => setIndex((i) => clamp(i + 1)), [clamp]);
  const prev = useCallback(() => setIndex((i) => clamp(i - 1)), [clamp]);

  const current = deck[index] || { content: "", notes: "" };
  const upcoming = deck[index + 1];

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const resetTimer = useCallback(() => {
    startRef.current = Date.now();
    setElapsed(0);
  }, []);

  // Elapsed timer ticks only while presenter mode is active.
  useEffect(() => {
    if (!presenterMode) return undefined;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
    return () => clearInterval(id);
  }, [presenterMode]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(total - 1);
          break;
        case "Escape":
          if (showOverview) setShowOverview(false);
          else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
          else onClose();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "s":
        case "S":
          setPresenterMode((v) => !v);
          break;
        case "o":
        case "O":
          setShowOverview((v) => !v);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, total, onClose, toggleFullscreen, showOverview]);

  // Track native fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const navControls = (
    <div className="present-controls">
      <button className="present-nav-btn" onClick={prev} disabled={index === 0} aria-label="Previous slide" title="Previous (←)">
        <ChevronLeft size={20} />
      </button>
      <span className="present-counter-inline" aria-live="polite">{index + 1} / {total}</span>
      <button className="present-nav-btn" onClick={next} disabled={index === total - 1} aria-label="Next slide" title="Next (→)">
        <ChevronRight size={20} />
      </button>
    </div>
  );

  return (
    <div className={`present-overlay ${darkMode ? "present-dark" : ""}`} ref={rootRef} role="dialog" aria-modal="true" aria-label="Presentation">
      <div className="present-progress" aria-hidden="true">
        <div className="present-progress-bar" style={{ width: `${total > 1 ? (index / (total - 1)) * 100 : 100}%` }} />
      </div>

      <div className="present-topbar">
        <span className="present-title" title={title}>{title || "Untitled"}</span>
        <div className="present-topbar-actions">
          <button className={`present-icon-btn ${showOverview ? "present-icon-btn-active" : ""}`} onClick={() => setShowOverview((v) => !v)} title="Slide overview (o)" aria-label="Slide overview" aria-pressed={showOverview}>
            <LayoutGrid size={18} />
          </button>
          <button className={`present-icon-btn ${presenterMode ? "present-icon-btn-active" : ""}`} onClick={() => setPresenterMode((v) => !v)} title="Presenter view (s)" aria-label="Presenter view" aria-pressed={presenterMode}>
            <Monitor size={18} />
          </button>
          <button className="present-icon-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"} aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button className="present-icon-btn" onClick={onClose} title="Exit presentation (Esc)" aria-label="Exit presentation">
            <X size={20} />
          </button>
        </div>
      </div>

      {showOverview ? (
        <div className="present-overview">
          <div className="present-overview-grid">
            {deck.map((d, i) => (
              <button
                key={i}
                className={`present-thumb ${i === index ? "present-thumb-active" : ""}`}
                onClick={() => { setIndex(i); setShowOverview(false); }}
                title={`Go to slide ${i + 1}`}
              >
                <div className="present-thumb-canvas">
                  <SlideView markdown={d.content} className="present-thumb-content markdown-body" postProcess={false} />
                </div>
                <span className="present-thumb-badge">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      ) : presenterMode ? (
        <div className="present-presenter">
          <div className="present-presenter-main">
            <span className="present-pane-label">Current</span>
            <div className="present-slide-frame">
              <SlideView key={`cur-${index}`} markdown={current.content} className="present-slide markdown-body" />
            </div>
            {navControls}
          </div>
          <div className="present-presenter-side">
            <div className="present-timer">
              <Timer size={16} />
              <span className="present-timer-value">{fmtClock(elapsed)}</span>
              <button className="present-icon-btn present-timer-reset" onClick={resetTimer} title="Reset timer" aria-label="Reset timer">
                <RotateCcw size={15} />
              </button>
            </div>
            <span className="present-pane-label">Next</span>
            <div className="present-slide-frame present-slide-frame-sm">
              {upcoming ? (
                <SlideView key={`nxt-${index}`} markdown={upcoming.content} className="present-slide markdown-body" postProcess={false} />
              ) : (
                <div className="present-end-placeholder">End of presentation</div>
              )}
            </div>
            <span className="present-pane-label">Notes</span>
            <div className="present-notes">
              {current.notes ? (
                <SlideView key={`notes-${index}`} markdown={current.notes} className="present-notes-body markdown-body" postProcess={false} />
              ) : (
                <p className="present-notes-empty">No notes for this slide.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="present-stage" onClick={(e) => { if (e.target === e.currentTarget) next(); }}>
            <div className="present-slide-frame">
              <SlideView key={index} markdown={current.content} className="present-slide markdown-body" />
            </div>
          </div>

          <button className="present-nav present-nav-prev" onClick={prev} disabled={index === 0} aria-label="Previous slide" title="Previous (←)">
            <ChevronLeft size={28} />
          </button>
          <button className="present-nav present-nav-next" onClick={next} disabled={index === total - 1} aria-label="Next slide" title="Next (→)">
            <ChevronRight size={28} />
          </button>

          <div className="present-counter" aria-live="polite">{index + 1} / {total}</div>
        </>
      )}
    </div>
  );
}

