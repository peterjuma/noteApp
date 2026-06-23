/**
 * Hybrid editor mode — inline live-preview for CodeMirror 6.
 *
 * Renders markdown inline as the user types:
 * - Headings: show at actual sizes, hide # markers on unfocused lines
 * - Bold/italic: render styled text, hide ** and _ markers on unfocused lines
 * - Links: render as styled text, hide URL on unfocused lines
 * - Images: show inline preview below the line
 * - Checkboxes: render actual checkbox widgets
 * - Horizontal rules: render as styled separators
 * - Strikethrough: render with line-through
 *
 * The key UX rule: when the cursor is ON a line, raw markdown is shown.
 * When the cursor leaves, the rendered version appears.
 *
 * Ported from notemd (peterjuma/notemd) and adapted to noteApp's module layout.
 */
import { ViewPlugin, Decoration, WidgetType } from "@codemirror/view";
import { RangeSetBuilder, Facet } from "@codemirror/state";
import emojiData from "markdown-it-emoji/lib/data/full.json";
import * as noteDB from "./services/notesDB";

// ─── Configuration facet: allows passing activeDb into the plugin ───

const hybridConfig = Facet.define({ combine: (values) => values[0] || {} });

// ─── Helpers ───

function getCodeFenceRanges(doc) {
  const ranges = [];
  let inFence = false;
  let fenceStart = 0;
  let fenceLang = "";
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const openMatch = line.text.match(/^```(\w*)/);
    if (openMatch) {
      if (inFence) {
        ranges.push({ from: fenceStart, to: line.to, lang: fenceLang });
        inFence = false;
      } else {
        fenceStart = line.from;
        fenceLang = openMatch[1] || "";
        inFence = true;
      }
    }
  }
  return ranges;
}

function isInsideCodeFence(pos, fenceRanges) {
  return fenceRanges.some((r) => pos >= r.from && pos <= r.to);
}

function getCursorLine(state) {
  return state.doc.lineAt(state.selection.main.head).number;
}

// ─── Widget: Checkbox ───

class CheckboxWidget extends WidgetType {
  constructor(checked) { super(); this.checked = checked; }
  toDOM() {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = this.checked;
    cb.disabled = true;
    cb.className = "cm-hybrid-checkbox";
    cb.setAttribute("aria-label", this.checked ? "Completed task" : "Incomplete task");
    return cb;
  }
  eq(other) { return other.checked === this.checked; }
}

// ─── Widget: Image Preview ───

class ImageWidget extends WidgetType {
  constructor(src, alt, activeDb) { super(); this.src = src; this.alt = alt; this.activeDb = activeDb; }
  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-hybrid-image-wrapper";
    const img = document.createElement("img");
    img.className = "cm-hybrid-image";
    img.loading = "lazy";

    // Parse size and alignment from alt text: "alt|300x200|center"
    let displayAlt = this.alt || "";
    const match = displayAlt.match(/^(.*?)(?:\|(\d+)(?:x(\d+))?)?(?:\|(center|left|right))?$/);
    if (match && (match[2] || match[4])) {
      displayAlt = (match[1] || "").trim();
      if (match[2]) img.style.width = `${match[2]}px`;
      if (match[3]) img.style.height = `${match[3]}px`;
      if (match[4] === "center") { wrapper.style.textAlign = "center"; }
      else if (match[4] === "right") { wrapper.style.textAlign = "right"; }
    }
    img.alt = displayAlt;

    if (this.src.startsWith("noteapp-img:")) {
      const id = this.src.replace("noteapp-img:", "");
      img.alt = this.alt || `[Loading ${id}...]`;
      noteDB.getImageURL(id, this.activeDb).then((url) => {
        if (url) { img.src = url; }
        else { img.alt = `[Image not found: ${id}]`; img.className = "cm-hybrid-image cm-hybrid-image-missing"; }
      }).catch(() => { img.alt = "[Image load error]"; });
    } else {
      img.src = this.src;
    }
    wrapper.appendChild(img);
    return wrapper;
  }
  eq(other) { return other.src === this.src && other.activeDb === this.activeDb; }
}

// ─── Widget: Emoji ───

class EmojiWidget extends WidgetType {
  constructor(emoji) { super(); this.emoji = emoji; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-hybrid-emoji";
    span.textContent = this.emoji;
    return span;
  }
  eq(other) { return other.emoji === this.emoji; }
}

// ─── Widget: Bullet ───

class BulletWidget extends WidgetType {
  constructor(ordered, index) { super(); this.ordered = ordered; this.index = index; }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-hybrid-bullet";
    span.textContent = this.ordered ? `${this.index}.` : "•";
    return span;
  }
  eq(other) { return other.ordered === this.ordered && other.index === this.index; }
}

// ─── Heading Marks ───

const HEADING_CLASSES = {
  1: "cm-hybrid-h1",
  2: "cm-hybrid-h2",
  3: "cm-hybrid-h3",
  4: "cm-hybrid-h4",
  5: "cm-hybrid-h5",
  6: "cm-hybrid-h6",
};

// ─── Build Decorations ───

function buildHybridDecorations(view) {
  const builder = new RangeSetBuilder();
  const doc = view.state.doc;
  const cursorLine = getCursorLine(view.state);
  const fences = getCodeFenceRanges(doc);
  const config = view.state.facet(hybridConfig);
  const activeDb = config.activeDb || "notesdb";

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    const isCursorLine = i === cursorLine;
    const lineFrom = line.from;

    if (isInsideCodeFence(lineFrom, fences)) continue;

    // ── Headings: hide # markers and apply heading class on unfocused lines ──
    if (!isCursorLine) {
      const headingMatch = text.match(/^(#{1,6})\s+/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const cls = HEADING_CLASSES[level];
        if (cls) {
          // Hide the # markers
          builder.add(lineFrom, lineFrom + headingMatch[0].length, Decoration.replace({}));
          // Style the heading text
          builder.add(lineFrom, line.to, Decoration.mark({ class: cls }));
        }
        continue;
      }
    }

    // ── Horizontal rule — line decoration (not replace, to avoid tile errors) ──
    if (!isCursorLine && /^(-{3,}|\*{3,}|_{3,})\s*$/.test(text)) {
      builder.add(lineFrom, lineFrom, Decoration.line({ class: "cm-hybrid-hr-line" }));
      continue;
    }

    // ── Checkboxes: - [ ] and - [x] ──
    const checkMatch = text.match(/^(\s*[-*]\s)\[([xX ])\]\s/);
    if (checkMatch && !isCursorLine) {
      const checked = checkMatch[2].toLowerCase() === "x";
      const markerEnd = lineFrom + checkMatch[0].length;
      const bulletEnd = lineFrom + checkMatch[1].length;
      builder.add(bulletEnd, markerEnd, Decoration.replace({
        widget: new CheckboxWidget(checked),
      }));
    }

    // ── Blockquotes: > text — line decoration to avoid overlap ──
    if (!isCursorLine && /^>\s/.test(text)) {
      builder.add(lineFrom, lineFrom, Decoration.line({ class: "cm-hybrid-blockquote" }));
    }

    // ── Bullet lists: - item, * item ──
    if (!isCursorLine && !checkMatch) {
      const bulletMatch = text.match(/^(\s*)([-*])\s/);
      if (bulletMatch) {
        const markerStart = lineFrom + bulletMatch[1].length;
        const markerEnd = markerStart + bulletMatch[2].length + 1;
        builder.add(markerStart, markerEnd, Decoration.replace({
          widget: new BulletWidget(false, 0),
        }));
      }
      // Ordered lists: 1. item
      const orderedMatch = text.match(/^(\s*)(\d+)\.\s/);
      if (orderedMatch) {
        const markerStart = lineFrom + orderedMatch[1].length;
        const markerEnd = markerStart + orderedMatch[2].length + 2;
        builder.add(markerStart, markerEnd, Decoration.replace({
          widget: new BulletWidget(true, parseInt(orderedMatch[2])),
        }));
      }
    }

    // ── Inline styles on unfocused lines ──
    if (!isCursorLine) {
      // Bold **text** or __text__
      for (const match of text.matchAll(/(\*\*|__)(.+?)\1/g)) {
        const start = lineFrom + match.index;
        const markerLen = match[1].length;
        builder.add(start, start + markerLen, Decoration.replace({}));
        builder.add(start + markerLen, start + markerLen + match[2].length, Decoration.mark({ class: "cm-hybrid-bold" }));
        builder.add(start + markerLen + match[2].length, start + match[0].length, Decoration.replace({}));
      }

      // Italic *text* or _text_ (but not ** or __)
      for (const match of text.matchAll(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g)) {
        const content = match[1] || match[2];
        if (!content) continue;
        const start = lineFrom + match.index;
        builder.add(start, start + 1, Decoration.replace({}));
        builder.add(start + 1, start + 1 + content.length, Decoration.mark({ class: "cm-hybrid-italic" }));
        builder.add(start + 1 + content.length, start + match[0].length, Decoration.replace({}));
      }

      // Strikethrough ~~text~~
      for (const match of text.matchAll(/~~(.+?)~~/g)) {
        const start = lineFrom + match.index;
        builder.add(start, start + 2, Decoration.replace({}));
        builder.add(start + 2, start + 2 + match[1].length, Decoration.mark({ class: "cm-hybrid-strikethrough" }));
        builder.add(start + 2 + match[1].length, start + match[0].length, Decoration.replace({}));
      }

      // Images ![alt](src) — MUST run before links to track used ranges
      const imageOffsets = new Set();
      for (const match of text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
        const start = lineFrom + match.index;
        const src = match[2];
        if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("noteapp-img:")) {
          builder.add(start + match[0].length, start + match[0].length, Decoration.widget({
            widget: new ImageWidget(src, match[1], activeDb),
            side: 1,
          }));
        }
        // Mark character offsets within this line so link regex skips them
        for (let p = match.index; p < match.index + match[0].length; p++) imageOffsets.add(p);
      }

      // Links [text](url) — skip if inside an image match
      for (const match of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
        if (imageOffsets.has(match.index)) continue;
        const start = lineFrom + match.index;
        const textStart = start + 1;
        const textEnd = textStart + match[1].length;
        builder.add(start, textStart, Decoration.replace({})); // hide [
        builder.add(textStart, textEnd, Decoration.mark({ class: "cm-hybrid-link" }));
        builder.add(textEnd, start + match[0].length, Decoration.replace({})); // hide ](url)
      }

      // Inline code `text`
      for (const match of text.matchAll(/(?<!`)`(?!`)([^`\n]+?)`(?!`)/g)) {
        const start = lineFrom + match.index;
        builder.add(start, start + 1, Decoration.replace({}));
        builder.add(start + 1, start + 1 + match[1].length, Decoration.mark({ class: "cm-hybrid-code" }));
        builder.add(start + 1 + match[1].length, start + match[0].length, Decoration.replace({}));
      }

      // ==highlight==
      for (const match of text.matchAll(/==([^=\n]+?)==/g)) {
        const start = lineFrom + match.index;
        builder.add(start, start + 2, Decoration.replace({}));
        builder.add(start + 2, start + 2 + match[1].length, Decoration.mark({ class: "cm-hybrid-highlight" }));
        builder.add(start + 2 + match[1].length, start + match[0].length, Decoration.replace({}));
      }

      // Emoji shortcodes :name:
      for (const match of text.matchAll(/:([a-z0-9_+-]+):/g)) {
        const emoji = emojiData[match[1]];
        if (emoji) {
          const start = lineFrom + match.index;
          builder.add(start, start + match[0].length, Decoration.replace({
            widget: new EmojiWidget(emoji),
          }));
        }
      }

      // Wiki links [[note title]]
      for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
        const start = lineFrom + match.index;
        builder.add(start, start + 2, Decoration.replace({}));
        builder.add(start + 2, start + 2 + match[1].length, Decoration.mark({ class: "cm-hybrid-wikilink" }));
        builder.add(start + 2 + match[1].length, start + match[0].length, Decoration.replace({}));
      }

      // HTML <img> tags — render inline preview
      for (const match of text.matchAll(/<img\s[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
        const src = match[1];
        if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("noteapp-img:")) {
          const alt = (match[0].match(/alt=["']([^"']*)["']/i) || [])[1] || "";
          const start = lineFrom + match.index;
          builder.add(start + match[0].length, start + match[0].length, Decoration.widget({
            widget: new ImageWidget(src, alt, activeDb),
            side: 1,
          }));
        }
      }
    }
  }

  return builder.finish();
}

// ─── ViewPlugin (inline decorations only) ───

const hybridViewPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      try {
        this.decorations = buildHybridDecorations(view);
      } catch {
        this.decorations = Decoration.none;
      }
    }
    update(update) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        try {
          this.decorations = buildHybridDecorations(update.view);
        } catch {
          // If decoration building fails (e.g. overlapping ranges), keep previous decorations
        }
      }
    }
  },
  { decorations: (v) => v.decorations }
);

/**
 * Create the hybrid editor extensions with configuration.
 * @param {{ activeDb?: string }} options
 * @returns {import("@codemirror/state").Extension[]} Array of extensions to add to the editor
 */
export function createHybridEditorExtensions({ activeDb = "notesdb" } = {}) {
  return [
    hybridConfig.of({ activeDb }),
    hybridViewPlugin,
  ];
}

// Legacy static export (uses default config)
export const hybridEditorPlugin = hybridViewPlugin;
