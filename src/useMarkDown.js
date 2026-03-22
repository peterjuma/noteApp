// Markdown
import markdownitEmoji from "markdown-it-emoji";
import markdownitTaskLists from "markdown-it-task-lists";
import markdownitAnchor from "markdown-it-anchor";
import markdownitKatex from "markdown-it-katex";
import markdownitFootnote from "markdown-it-footnote";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";
import hljs from "highlight.js";

// ─── Turndown (HTML → Markdown) ───
const html2md = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
const gfm = turndownPluginGfm.gfm;
html2md.use(gfm);

// Zendesk wraps list-item content in <div>/<span> — strip wrappers, keep text
html2md.addRule("zendeskListItemWrapper", {
  filter: function (node) {
    return (
      (node.nodeName === "DIV" || node.nodeName === "SPAN") &&
      node.parentNode &&
      node.parentNode.nodeName === "LI"
    );
  },
  replacement: function (content) {
    return content.trim();
  },
});

// Zendesk uses <br> inside <li> — convert to newline instead of double-newline
html2md.addRule("zendeskBrInList", {
  filter: function (node) {
    return (
      node.nodeName === "BR" &&
      node.parentNode &&
      (node.parentNode.nodeName === "LI" || node.parentNode.nodeName === "TD")
    );
  },
  replacement: function () {
    return "\n";
  },
});

// Zendesk sometimes generates empty <p> tags in lists — collapse to newline
html2md.addRule("zendeskEmptyParagraph", {
  filter: function (node) {
    return node.nodeName === "P" && node.textContent.trim() === "" && !node.querySelector("img");
  },
  replacement: function () {
    return "\n";
  },
});

// ─── Markdown-It (Markdown → HTML) ───
const md2html = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
  highlight: function (str, lang) {
    // Don't highlight mermaid — rendered as diagrams
    if (lang === "mermaid") return "";

    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
      } catch (e) {
        /* fall through */
      }
    }

    // Auto-detect when no language specified (require high relevance to avoid false positives)
    if (!lang) {
      try {
        const result = hljs.highlightAuto(str);
        if (result.language && result.relevance > 7) {
          return result.value;
        }
      } catch (e) {
        /* fall through */
      }
    }

    return ""; // use markdown-it default escaping
  },
});
md2html.use(markdownitEmoji);
md2html.use(markdownitTaskLists);
md2html.use(markdownitKatex);
md2html.use(markdownitFootnote);
md2html.use(markdownitAnchor, {
  permalink: false,
  slugify: (s) =>
    s
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/(^-|-$)/g, ""),
});

export { html2md, md2html };
