import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { md2html } from "./useMarkDown";
import mermaid from "mermaid";
import * as noteDB from "./services/notesDB";
import { suggestTags } from "./services/tagSuggester";
import { Sparkles, Check, X } from "lucide-react";

mermaid.initialize({ startOnLoad: false, theme: "default" });

// PlantUML text encoder (deflate + custom base64 for plantuml.com server)
function plantumlEncode(text) {
  function encode6bit(b) {
    if (b < 10) return String.fromCharCode(48 + b);
    b -= 10;
    if (b < 26) return String.fromCharCode(65 + b);
    b -= 26;
    if (b < 26) return String.fromCharCode(97 + b);
    b -= 26;
    if (b === 0) return "-";
    if (b === 1) return "_";
    return "?";
  }
  function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3f;
    return encode6bit(c1 & 0x3f) + encode6bit(c2 & 0x3f) + encode6bit(c3 & 0x3f) + encode6bit(c4 & 0x3f);
  }
  function encodeBytes(data) {
    let r = "";
    for (let i = 0; i < data.length; i += 3) {
      if (i + 2 === data.length) r += append3bytes(data[i], data[i + 1], 0);
      else if (i + 1 === data.length) r += append3bytes(data[i], 0, 0);
      else r += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
    return r;
  }
  // Use TextEncoder + pako-like raw deflate via browser DecompressionStream is complex,
  // so we use the simpler ~h hex encoding which PlantUML also supports
  const encoded = Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "~h" + encoded;
}

// Allow id attributes through DOMPurify for anchor navigation
DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
  if (data.attrName === "id") {
    data.forceKeepAttr = true;
  }
  // Allow noteapp-img: protocol in src
  if (data.attrName === "src" && data.attrValue && data.attrValue.startsWith("noteapp-img:")) {
    data.forceKeepAttr = true;
  }
});

function NoteMain(props) {
  var { notesData } = props;
  const bodyRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSuggestTags = () => {
    const suggested = suggestTags(notesData.notetitle, notesData.notebody, notesData.tags);
    setSuggestions(suggested);
    setShowSuggestions(true);
  };

  const handleAcceptTag = (tag) => {
    if (props.onAddTag) props.onAddTag(notesData.noteid, tag);
    setSuggestions(suggestions.filter(s => s !== tag));
    if (suggestions.length <= 1) setShowSuggestions(false);
  };

  const handleAcceptAll = () => {
    if (props.onAddTags) props.onAddTags(notesData.noteid, suggestions);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Reset suggestions when note changes
  useEffect(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, [notesData.noteid]);

  // Handle anchor clicks and mermaid rendering
  useEffect(() => {
    if (!bodyRef.current) return;

    // Mermaid diagrams — render sequentially (Mermaid can't handle concurrent renders)
    const renderMermaidDiagrams = async () => {
      const mermaidBlocks = bodyRef.current.querySelectorAll("code.language-mermaid");
      for (let i = 0; i < mermaidBlocks.length; i++) {
        const block = mermaidBlocks[i];
        const pre = block.parentNode;
        if (!pre || !pre.parentNode) continue;
        const container = document.createElement("div");
        container.className = "mermaid-diagram";
        try {
          const id = `mermaid-${i}-${Math.random().toString(36).slice(2, 8)}`;
          const { svg } = await mermaid.render(id, block.textContent.trim());
          container.innerHTML = DOMPurify.sanitize(svg, { ADD_TAGS: ["foreignObject"], ADD_ATTR: ["requiredExtensions"] });
          pre.replaceWith(container);
        } catch (err) {
          // Leave the code block as-is on failure, but log for debugging
          // eslint-disable-next-line no-console
          console.warn("Mermaid render failed for block", i, err);
        }
      }
    };
    renderMermaidDiagrams();

    // PlantUML diagrams — render via public PlantUML server
    const renderPlantUML = () => {
      if (!bodyRef.current) return;
      const blocks = bodyRef.current.querySelectorAll("code.language-plantuml");
      blocks.forEach((block) => {
        const pre = block.parentNode;
        if (!pre || !pre.parentNode) return;
        const src = block.textContent.trim();
        const encoded = plantumlEncode(src);
        const container = document.createElement("div");
        container.className = "plantuml-diagram";
        const img = document.createElement("img");
        img.src = `https://www.plantuml.com/plantuml/svg/${encoded}`;
        img.alt = "PlantUML diagram";
        img.style.maxWidth = "100%";
        container.appendChild(img);
        pre.replaceWith(container);
      });
    };
    renderPlantUML();

    // Resolve noteapp-img: references to blob URLs
    const resolveImages = async () => {
      if (!bodyRef.current) return;
      const images = bodyRef.current.querySelectorAll('img[src^="noteapp-img:"]');
      for (const img of images) {
        const id = img.getAttribute("src").replace("noteapp-img:", "");
        const url = await noteDB.getImageURL(id);
        if (url) {
          img.src = url;
        } else {
          img.alt = `[Image not found: ${id}]`;
        }
      }
    };
    resolveImages();

    // Anchor navigation — intercept clicks on hash links
    const handleClick = (e) => {
      const link = e.target.closest("a");
      if (!link) return;

      // Wiki-link navigation
      const wikiTitle = link.getAttribute("data-wiki-link");
      if (wikiTitle) {
        e.preventDefault();
        if (props.onWikiLink) props.onWikiLink(wikiTitle);
        return;
      }

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // Update URL: preserve #note/<slug> and append /<heading>
        const currentHash = window.location.hash;
        const notePrefix = currentHash.match(/^#note\/[^/]+/);
        if (notePrefix) {
          window.history.replaceState(null, "", `${notePrefix[0]}/${id}`);
        } else {
          window.history.replaceState(null, "", `#${id}`);
        }
      }
    };
    bodyRef.current.addEventListener("click", handleClick);
    const ref = bodyRef.current;

    // Scroll to hash on initial render
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const target = document.getElementById(id);
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }

    return () => ref.removeEventListener("click", handleClick);
  }, [notesData.notebody]);

  const formatDate = (ts) => {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="note-view" role="main">
      <div className="note-view-inner">
        <h1
          className="note-view-title"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(md2html.render(notesData.notetitle)),
          }}
        ></h1>
        {(notesData.created_at || notesData.updated_at) && (
          <div className="note-meta">
            {notesData.created_at && <span>Created {formatDate(notesData.created_at)}</span>}
            {notesData.updated_at && <span>Modified {formatDate(notesData.updated_at)}</span>}
          </div>
        )}
        {notesData.tags && notesData.tags.length > 0 && (
          <div className="note-tags">
            {notesData.tags.map((tag) => (
              <span key={tag} className="tag" onClick={() => props.onTagClick && props.onTagClick(tag)}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Tag suggestions — only show for notes without tags when enabled */}
        {props.tagSuggestEnabled !== false && notesData.action !== "homepage" && (!notesData.tags || notesData.tags.length === 0) && (
          <div className="tag-suggest-area">
            {!showSuggestions ? (
              <button onClick={handleSuggestTags} className="tag-suggest-btn" title="Suggest tags using AI">
                <Sparkles size={14} /> Suggest Tags
              </button>
            ) : suggestions.length > 0 ? (
              <div className="tag-suggestions">
                <span className="tag-suggest-label">Suggested:</span>
                {suggestions.map((tag) => (
                  <span key={tag} className="tag tag-suggested" onClick={() => handleAcceptTag(tag)}>
                    {tag} <Check size={12} />
                  </span>
                ))}
                <button onClick={handleAcceptAll} className="tag-suggest-accept">Accept All</button>
                <button onClick={() => setShowSuggestions(false)} className="tag-suggest-dismiss">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="tag-suggest-label" style={{ fontSize: "12px", color: "#9ca3af" }}>No suggestions — note may need more content</span>
            )}
          </div>
        )}
        <div
          className="markdown-body"
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md2html.render(notesData.notebody)) }}
          onCopy={(e) => props.handleCopyEvent(e)}
        ></div>
      </div>
    </main>
  );
}

export default NoteMain;
