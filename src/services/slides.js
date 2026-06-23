/**
 * Split markdown into individual slides on horizontal-rule separators
 * (lines containing only `---`, `***`, or `___`, optionally space-separated).
 * Separators inside fenced code blocks are ignored. A note with no separators
 * yields a single slide.
 * @param {string} markdown
 * @returns {string[]} non-empty slide bodies (always at least one entry)
 */
export function splitSlides(markdown) {
  if (!markdown || !markdown.trim()) return [""];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const isSeparator = (line) => /^\s{0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/.test(line);
  const slides = [];
  let current = [];
  let inFence = false;
  let fenceMarker = "";
  for (const line of lines) {
    // Don't split on separators inside fenced code blocks
    const fenceMatch = line.match(/^\s{0,3}(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
      } else if (line.trimStart().startsWith(fenceMarker)) {
        inFence = false;
      }
    }
    if (!inFence && isSeparator(line)) {
      slides.push(current.join("\n").trim());
      current = [];
    } else {
      current.push(line);
    }
  }
  slides.push(current.join("\n").trim());
  const filtered = slides.filter((s) => s.length > 0);
  if (filtered.length > 1) return filtered;

  // Fallback: a note with no separators can still be presented by splitting
  // on top-level `## ` headings, so every section becomes a slide.
  const text = (filtered[0] || "").trim();
  if ((text.match(/^##\s/gm) || []).length >= 2) {
    const byHeading = splitOnHeadings(text);
    if (byHeading.length > 1) return byHeading;
  }
  return filtered.length ? filtered : [""];
}

/**
 * Split markdown into sections on top-level `## ` headings, keeping each
 * heading with the content that follows it. Headings inside fenced code
 * blocks are ignored.
 * @param {string} markdown
 * @returns {string[]}
 */
function splitOnHeadings(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const slides = [];
  let current = [];
  let inFence = false;
  let fenceMarker = "";
  const hasContent = (arr) => arr.some((l) => l.trim());
  for (const line of lines) {
    const fenceMatch = line.match(/^\s{0,3}(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
      } else if (line.trimStart().startsWith(fenceMarker)) {
        inFence = false;
      }
    }
    if (!inFence && /^##\s/.test(line) && hasContent(current)) {
      slides.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (hasContent(current)) slides.push(current.join("\n").trim());
  return slides.filter(Boolean);
}


/**
 * Extract presenter (speaker) notes from a single slide's markdown.
 *
 * Two conventions are supported:
 *  - A lone `???` line (remark.js style): everything after it becomes notes.
 *  - HTML comments `<!-- ... -->` (Marp style): their contents become notes.
 *    An optional leading `note:` / `notes:` label is stripped.
 *
 * @param {string} slideMarkdown
 * @returns {{ content: string, notes: string }}
 */
export function extractNotes(slideMarkdown) {
  if (!slideMarkdown) return { content: "", notes: "" };
  let content = slideMarkdown;
  const notesParts = [];

  // remark-style separator: content before a lone `???`, notes after.
  const lines = content.split("\n");
  const sepIdx = lines.findIndex((l) => l.trim() === "???");
  if (sepIdx !== -1) {
    notesParts.push(lines.slice(sepIdx + 1).join("\n").trim());
    content = lines.slice(0, sepIdx).join("\n");
  }

  // HTML comment notes: <!-- ... -->
  content = content.replace(/<!--([\s\S]*?)-->/g, (_, inner) => {
    const text = inner.replace(/^\s*notes?:\s*/i, "").trim();
    if (text) notesParts.push(text);
    return "";
  });

  return {
    content: content.trim(),
    notes: notesParts.filter(Boolean).join("\n\n").trim(),
  };
}

/**
 * Parse a full markdown note into a deck of slides with their presenter notes.
 * @param {string} markdown
 * @returns {{ content: string, notes: string }[]}
 */
export function parseDeck(markdown) {
  return splitSlides(markdown).map(extractNotes);
}

