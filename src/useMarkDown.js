// Markdown
import markdownitEmoji from "markdown-it-emoji";
import markdownitTaskLists from "markdown-it-task-lists";
import markdownitAnchor from "markdown-it-anchor";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";
// Turndown
const html2md = new TurndownService();
const gfm = turndownPluginGfm.gfm;
html2md.use(gfm);
// Markdown-It
const md2html = new MarkdownIt({ html: true, linkify: true });
md2html.use(markdownitEmoji);
md2html.use(markdownitTaskLists);
md2html.use(markdownitAnchor, {
  permalink: false,
  slugify: (s) => s.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, ""),
});

export { html2md, md2html };
