// Copy formatter — produces inline-styled HTML that survives paste into
// rich text editors (Zendesk, Gmail, Google Docs, Outlook, Notion, etc.)
//
// Rich editors strip <style> tags, <link> tags, and CSS classes on paste.
// Only inline style="" attributes survive. This module post-processes
// rendered markdown HTML to embed all visual styling inline.

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO_STACK = "SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace";
const COLOR = "#24292f";
const MUTED = "#656d76";
const BORDER = "#d0d7de";
const CODE_BG = "#f6f8fa";
const BLOCKQUOTE_BORDER = "#d0d7de";

// Inline style map — applied by tag name
const TAG_STYLES = {
  // Container
  _root: `font-family: ${FONT_STACK}; font-size: 14px; line-height: 1.6; color: ${COLOR}; word-wrap: break-word;`,

  // Block elements
  p: "margin: 0 0 16px 0; padding: 0;",
  h1: `font-size: 24px; font-weight: 600; margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid ${BORDER}; line-height: 1.25;`,
  h2: `font-size: 20px; font-weight: 600; margin: 24px 0 16px 0; padding-bottom: 6px; border-bottom: 1px solid ${BORDER}; line-height: 1.25;`,
  h3: "font-size: 16px; font-weight: 600; margin: 24px 0 16px 0; line-height: 1.25;",
  h4: "font-size: 14px; font-weight: 600; margin: 24px 0 16px 0; line-height: 1.25;",
  h5: "font-size: 12px; font-weight: 600; margin: 24px 0 16px 0; line-height: 1.25;",
  h6: `font-size: 12px; font-weight: 600; margin: 24px 0 16px 0; line-height: 1.25; color: ${MUTED};`,

  // Lists
  ul: "margin: 0 0 16px 0; padding-left: 2em;",
  ol: "margin: 0 0 16px 0; padding-left: 2em;",
  li: "margin: 4px 0;",

  // Code
  pre: `background: ${CODE_BG}; border-radius: 6px; padding: 16px; overflow: auto; margin: 0 0 16px 0; font-size: 13px; line-height: 1.45;`,
  code_inline: `background: ${CODE_BG}; padding: 2px 6px; border-radius: 4px; font-family: ${MONO_STACK}; font-size: 85%;`,
  code_block: `font-family: ${MONO_STACK}; font-size: 13px; line-height: 1.45; color: ${COLOR}; background: none; padding: 0; border: none;`,

  // Tables
  table: `border-collapse: collapse; border-spacing: 0; margin: 0 0 16px 0; width: auto; overflow: auto; font-size: 13px;`,
  th: `font-weight: 600; padding: 8px 13px; border: 1px solid ${BORDER}; background: ${CODE_BG}; text-align: left;`,
  td: `padding: 8px 13px; border: 1px solid ${BORDER}; text-align: left;`,

  // Blockquotes
  blockquote: `margin: 0 0 16px 0; padding: 0 16px; border-left: 4px solid ${BLOCKQUOTE_BORDER}; color: ${MUTED};`,

  // Horizontal rule
  hr: `height: 2px; padding: 0; margin: 24px 0; background-color: ${BORDER}; border: 0;`,

  // Links
  a: "color: #0969da; text-decoration: none;",

  // Images
  img: "max-width: 100%;",

  // Strong / emphasis
  strong: "font-weight: 600;",
  em: "font-style: italic;",
  del: "text-decoration: line-through;",

  // Task list checkboxes
  input: "margin: 0 4px 0 0; vertical-align: middle;",
};

/**
 * Apply inline styles to all elements in an HTML string.
 * Returns HTML ready for clipboard that survives paste into any rich editor.
 */
export function formatHtmlForCopy(rawHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="_root">${rawHtml}</div>`,
    "text/html"
  );
  const root = doc.getElementById("_root");
  if (!root) return rawHtml;

  // Apply root styles
  root.setAttribute("style", TAG_STYLES._root);

  // Walk all elements and apply inline styles
  const elements = root.querySelectorAll("*");

  // First pass: remove UI elements by class before classes are stripped
  root.querySelectorAll(".copy-code-button, .code-lang-label, button").forEach(
    (el) => el.remove()
  );

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();

    // Skip removed elements
    if (!el.parentNode) continue;

    // Remove classes and data attributes that won't survive paste anyway
    el.removeAttribute("class");
    // Keep id for anchors, href for links, src for images, type/checked for checkboxes

    // Determine which style to apply
    let style = "";

    if (tag === "code") {
      // Distinguish inline code from code blocks
      const isBlock = el.parentElement && el.parentElement.tagName.toLowerCase() === "pre";
      style = isBlock ? TAG_STYLES.code_block : TAG_STYLES.code_inline;
    } else if (TAG_STYLES[tag]) {
      style = TAG_STYLES[tag];
    }

    // Merge with any existing inline style
    if (style) {
      const existing = el.getAttribute("style") || "";
      el.setAttribute("style", existing ? `${style} ${existing}` : style);
    }

    // Remove copy buttons, language labels, and other UI elements
    if (
      tag === "button" ||
      el.getAttribute("data-copy") ||
      (el.getAttribute("style") || "").includes("copy")
    ) {
      el.remove();
    }
  }

  // Insert <br> between adjacent block elements so spacing survives
  // in editors (like Zendesk) that strip margins on paste
  const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "BLOCKQUOTE", "UL", "OL", "TABLE", "HR"]);
  const blocks = root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, pre, blockquote, ul, ol, table, hr");
  for (const block of blocks) {
    const next = block.nextElementSibling;
    if (next && BLOCK_TAGS.has(next.tagName)) {
      block.parentNode.insertBefore(doc.createElement("br"), next);
    }
  }

  return root.innerHTML;
}

/**
 * Copy note content to clipboard with rich formatting.
 * Writes both text/html (for rich editors) and text/plain (for plain text editors).
 */
export async function copyNoteToClipboard(html, markdown) {
  const styledHtml = formatHtmlForCopy(html);
  const item = new ClipboardItem({
    "text/html": new Blob([styledHtml], { type: "text/html" }),
    "text/plain": new Blob([markdown], { type: "text/plain" }),
  });
  return navigator.clipboard.write([item]);
}

/**
 * Format a browser selection's HTML for clipboard copy.
 * Used by the onCopy handler to style partial selections.
 */
export function formatSelectionForCopy(selectionHtml) {
  return formatHtmlForCopy(selectionHtml);
}
