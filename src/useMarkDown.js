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

// ─── KQL (Kusto Query Language) ───
hljs.registerLanguage("kql", function () {
  const KEYWORDS = [
    "let", "set", "declare", "pattern", "query_parameters", "restrict", "access",
    "alias", "database", "materialize", "range", "toscalar",
  ];
  const OPERATORS = [
    "where", "project", "extend", "summarize", "render", "join", "union",
    "sort", "order", "top", "limit", "take", "count", "distinct", "sample",
    "search", "reduce", "mv-expand", "mv-apply", "parse", "parse-where",
    "evaluate", "invoke", "make-series", "lookup", "print", "as", "consume",
    "find", "fork", "facet", "getschema", "serialize", "project-away",
    "project-keep", "project-rename", "project-reorder", "externaldata",
    "datatable", "partition", "scan", "narrow",
  ];
  const FUNCTIONS = [
    "ago", "now", "datetime", "timespan", "time", "bin", "floor", "ceiling",
    "startofday", "startofweek", "startofmonth", "startofyear", "endofday",
    "endofweek", "endofmonth", "endofyear", "dayofweek", "dayofmonth",
    "dayofyear", "hourofday", "weekofyear", "monthofyear", "getyear",
    "getmonth", "format_datetime", "format_timespan", "todatetime", "totimespan",
    "todecimal", "todouble", "tolong", "toint", "tostring", "tobool",
    "strlen", "substring", "trim", "trim_start", "trim_end", "tolower",
    "toupper", "strcat", "strcat_delim", "replace", "replace_string",
    "replace_regex", "reverse", "split", "extract", "extract_all",
    "parse_json", "parse_xml", "parse_url", "parse_urlquery", "parse_path",
    "parse_ipv4", "parse_ipv6", "parse_csv", "parse_command_line",
    "indexof", "countof", "has", "has_any", "has_all", "contains",
    "startswith", "endswith", "matches", "isempty", "isnotempty",
    "isnull", "isnotnull", "isnan", "isinf", "isfinite",
    "sum", "avg", "min", "max", "count", "dcount", "dcountif", "countif",
    "sumif", "avgif", "minif", "maxif", "percentile", "percentiles",
    "stdev", "stdevif", "variance", "varianceif", "make_bag", "make_list",
    "make_set", "arg_max", "arg_min", "any", "take_any",
    "array_length", "array_concat", "array_slice", "array_index_of",
    "pack", "pack_all", "pack_array", "bag_keys", "bag_merge",
    "todynamic", "toreal", "toguid", "hash", "iff", "iif", "case",
    "coalesce", "max_of", "min_of", "not", "binary_and", "binary_or",
    "binary_xor", "binary_not", "base64_encode_tostring", "base64_decode_tostring",
    "row_number", "prev", "next", "ingestion_time", "cursor_after",
  ];
  return {
    name: "Kusto Query Language",
    aliases: ["kusto"],
    case_insensitive: true,
    keywords: {
      keyword: KEYWORDS.join(" "),
      operator: OPERATORS.join(" "),
      built_in: FUNCTIONS.join(" "),
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: "string",
        begin: /h?"""/, end: /"""/,
      },
      {
        className: "string",
        begin: /@"/, end: /"/,
      },
      hljs.C_NUMBER_MODE,
      {
        className: "type",
        begin: /\b(?:bool|datetime|decimal|dynamic|guid|int|long|real|string|timespan)\b/,
      },
      {
        className: "operator",
        begin: /[|!<>=~+\-*\/]/,
      },
    ],
  };
});

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
md2html.use(markdownitFootnote);
md2html.use(markdownitKatex);
md2html.use(markdownitAnchor, {
  permalink: false,
  slugify: (s) =>
    s
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/(^-|-$)/g, ""),
});

// Wiki-style note linking: [[note title]]
function wikiLinkPlugin(md) {
  md.inline.ruler.after("escape", "wiki_link", function (state, silent) {
    const start = state.pos;
    const max = state.posMax;
    if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5b) return false; // [[
    const end = state.src.indexOf("]]", start + 2);
    if (end === -1 || end > max) return false;
    const content = state.src.slice(start + 2, end).trim();
    if (!content) return false;
    if (!silent) {
      const token = state.push("wiki_link", "", 0);
      token.content = content;
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.wiki_link = function (tokens, idx) {
    const title = md.utils.escapeHtml(tokens[idx].content);
    const encoded = encodeURIComponent(tokens[idx].content);
    return `<a class="wiki-link" href="#wikilink/${encoded}">[[${title}]]</a>`;
  };
}
md2html.use(wikiLinkPlugin);

export { html2md, md2html };
