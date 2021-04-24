// Markdown
import markdownitEmoji from "markdown-it-emoji";
import markdownitTaskLists from "markdown-it-task-lists";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";
// Turndown
const html2md = new TurndownService();
const gfm = turndownPluginGfm.gfm;
html2md.use(gfm);
// Markdown-It & markdownitEmoji
const md2html = new MarkdownIt();
md2html.use(markdownitEmoji);
// Task List

md2html.use(markdownitTaskLists);

export { html2md, md2html };
