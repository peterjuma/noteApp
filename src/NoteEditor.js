import { useRef, useState, useEffect, useCallback } from "react";
import { html2md, md2html } from "./useMarkDown";
import DOMPurify from "dompurify";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { searchKeymap } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap, autocompletion } from "@codemirror/autocomplete";
import { vim } from "@replit/codemirror-vim";
import * as noteDB from "./services/notesDB";
import { suggestTags } from "./services/tagSuggester";
import { ensureDefaults as loadSnippets } from "./services/snippets";
import TableConverter from "./TableConverter";
import TableEditor from "./TableEditor";
import {
  Bold, Italic, Heading2, Link, ListOrdered, List, Quote, Paperclip, Image,
  Code, Braces, CheckSquare, Table, Strikethrough, Save, X,
  Columns2, Maximize2, Eye, EyeOff, Minus, Sparkles, Check,
  Indent, Outdent, ChevronDown, Hash, Minus as MinusIcon, GitBranch, Sigma,
  FileText, Network, Workflow, PieChart, GitMerge, Footprints, AlertTriangle,
  TerminalSquare, Regex, Brackets, Superscript, Subscript, Highlighter,
} from "lucide-react";

// Popular languages for the code block picker
const CODE_LANGUAGES = [
  "javascript", "typescript", "python", "java", "csharp", "go", "rust", "ruby",
  "php", "swift", "kotlin", "sql", "html", "css", "scss", "bash", "shell",
  "json", "yaml", "xml", "markdown", "dockerfile", "graphql", "kql", "r",
  "powershell", "lua", "perl", "scala", "haskell", "elixir", "clojure",
  "jsx", "tsx", "vue", "svelte", "toml", "ini", "nginx", "diff",
  "plaintext",
];

// Slash command definitions
const SLASH_COMMANDS = [
  { id: "heading", label: "Heading", icon: Hash, insert: "### ", description: "Section heading" },
  { id: "bold", label: "Bold", icon: Bold, insert: "**bold text**", description: "Bold text" },
  { id: "italic", label: "Italic", icon: Italic, insert: "_italic text_", description: "Italic text" },
  { id: "codeblock", label: "Code Block", icon: Braces, insert: "```\n\n```", description: "Fenced code block" },
  { id: "quote", label: "Quote", icon: Quote, insert: "> ", description: "Block quote" },
  { id: "ulist", label: "Bullet List", icon: List, insert: "- ", description: "Unordered list" },
  { id: "olist", label: "Numbered List", icon: ListOrdered, insert: "1. ", description: "Ordered list" },
  { id: "tasklist", label: "Task List", icon: CheckSquare, insert: "- [ ] ", description: "Checklist" },
  { id: "table", label: "Table", icon: Table, insert: "| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell     | Cell     |", description: "Markdown table" },
  { id: "hr", label: "Divider", icon: MinusIcon, insert: "\n---\n", description: "Horizontal rule" },
  { id: "link", label: "Link", icon: Link, insert: "[text](url)", description: "Hyperlink" },
  { id: "image", label: "Image", icon: Image, insert: "![alt](url)", description: "Image" },
  { id: "math", label: "Math Block", icon: Sigma, insert: "$$\n\n$$", description: "KaTeX math block" },
  { id: "inlinemath", label: "Inline Math", icon: Superscript, insert: "$E=mc^2$", description: "Inline KaTeX formula" },
  // ── Mermaid diagrams ──
  { id: "mermaid", label: "Flowchart", icon: GitBranch, insert: "```mermaid\nflowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]\n```", description: "Mermaid flowchart" },
  { id: "mermaid-sequence", label: "Sequence Diagram", icon: Network, insert: "```mermaid\nsequenceDiagram\n  participant A as Client\n  participant B as Server\n  A->>B: Request\n  B-->>A: Response\n```", description: "Mermaid sequence diagram" },
  { id: "mermaid-class", label: "Class Diagram", icon: Brackets, insert: "```mermaid\nclassDiagram\n  class Animal {\n    +String name\n    +makeSound()\n  }\n  class Dog {\n    +fetch()\n  }\n  Animal <|-- Dog\n```", description: "Mermaid class diagram" },
  { id: "mermaid-state", label: "State Diagram", icon: Workflow, insert: "```mermaid\nstateDiagram-v2\n  [*] --> Idle\n  Idle --> Processing : submit\n  Processing --> Done : complete\n  Processing --> Error : fail\n  Error --> Idle : retry\n  Done --> [*]\n```", description: "Mermaid state diagram" },
  { id: "mermaid-gantt", label: "Gantt Chart", icon: Footprints, insert: "```mermaid\ngantt\n  title Project Timeline\n  dateFormat YYYY-MM-DD\n  section Phase 1\n    Task A :a1, 2026-01-01, 30d\n    Task B :after a1, 20d\n  section Phase 2\n    Task C :2026-03-01, 25d\n```", description: "Mermaid Gantt chart" },
  { id: "mermaid-pie", label: "Pie Chart", icon: PieChart, insert: "```mermaid\npie title Distribution\n  \"Category A\" : 40\n  \"Category B\" : 30\n  \"Category C\" : 20\n  \"Other\" : 10\n```", description: "Mermaid pie chart" },
  { id: "mermaid-er", label: "ER Diagram", icon: GitMerge, insert: "```mermaid\nerDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  PRODUCT ||--o{ LINE_ITEM : \"ordered in\"\n```", description: "Mermaid entity-relationship diagram" },
  { id: "mermaid-mindmap", label: "Mindmap", icon: Network, insert: "```mermaid\nmindmap\n  root((Topic))\n    Branch A\n      Leaf 1\n      Leaf 2\n    Branch B\n      Leaf 3\n```", description: "Mermaid mindmap" },
  // ── Developer tools ──
  { id: "frontmatter", label: "Frontmatter", icon: FileText, insert: "---\ntitle: \ndate: " + new Date().toISOString().slice(0, 10) + "\ntags: []\n---\n", description: "YAML frontmatter" },
  { id: "details", label: "Details / Collapse", icon: ChevronDown, insert: "<details>\n<summary>Click to expand</summary>\n\nHidden content here.\n\n</details>", description: "Collapsible section" },
  { id: "footnote", label: "Footnote", icon: Subscript, insert: "Text with footnote[^1].\n\n[^1]: Footnote content here.", description: "Footnote reference" },
  { id: "kbd", label: "Keyboard Key", icon: TerminalSquare, insert: "<kbd>Ctrl</kbd>+<kbd>C</kbd>", description: "Keyboard shortcut tag" },
  { id: "highlight", label: "Highlight", icon: Highlighter, insert: "==highlighted text==", description: "Highlighted text" },
  { id: "abbr", label: "Abbreviation", icon: Regex, insert: "*[HTML]: Hyper Text Markup Language", description: "Abbreviation definition" },
  { id: "alert", label: "Alert / Callout", icon: AlertTriangle, insert: "> [!NOTE]\n> Useful information that users should know.", description: "GitHub-style alert callout" },
];

function NoteEditor(props) {
  const note = props.editNoteData;
  const darkMode = props.darkMode;
  const initialBody = note.notebody || "";
  const initialTitle = note.notetitle || "";
  const [bodytxt, setBodyTxt] = useState(initialBody);
  const [title, setTitle] = useState(initialTitle);
  const [splitscreen, setSplitscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50); // percentage for editor
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [tags, setTags] = useState(note.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [noteAction, setNoteAction] = useState(note.action);
  const autoSave = props.autoSave;
  const [editorSuggestions, setEditorSuggestions] = useState([]);
  const [showTableConverter, setShowTableConverter] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langFilter, setLangFilter] = useState("");
  const [slashMenu, setSlashMenu] = useState(null); // { pos, filter }
  const [varPrompt, setVarPrompt] = useState(null); // { variables: [{name, value}], template, from, to }
  const [showDiagramPicker, setShowDiagramPicker] = useState(false);
  const [vimModeLabel, setVimModeLabel] = useState(props.vimMode ? "NORMAL" : "");
  const [tableEdit, setTableEdit] = useState(null); // { from, to, markdown }
  const langPickerRef = useRef(null);
  const diagramPickerRef = useRef(null);
  const slashMenuRef = useRef(null);
  const titleRef = useRef();
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const insertMarkdownRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  // Word/character count
  const wordCount = bodytxt.trim() ? bodytxt.trim().split(/\s+/).length : 0;
  const charCount = bodytxt.length;

  // Mark dirty when content changes
  useEffect(() => {
    if (bodytxt !== initialBody || title !== initialTitle) {
      setIsDirty(true);
    }
  }, [bodytxt, title, initialBody, initialTitle]);

  // Autosave: debounced 3s, only when enabled and dirty
  useEffect(() => {
    if (!autoSave || !isDirty || !title.trim() || !bodytxt.trim()) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      // Silent save — stays in editor, no view switch
      const noteToSave = { ...note };
      noteToSave.notetitle = title;
      noteToSave.notebody = bodytxt;
      noteToSave.tags = tags;
      noteToSave.action = noteAction;
      props.handleSaveNote(null, noteToSave);
      if (noteAction === "addnote") setNoteAction("updatenote");
      setIsDirty(false);
      setLastSaved(new Date());
    }, 3000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [bodytxt, title, autoSave, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle autosave preference
  const toggleAutoSave = () => {
    if (props.onToggleAutoSave) props.onToggleAutoSave();
  };

  // Warn before navigating away with unsaved changes (browser close/refresh)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
  const imageInputRef = useRef(null);

  // Handle image file selection from toolbar
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const view = viewRef.current;
    if (!view) return;
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await noteDB.saveImage(id, file, file.name);
    const mdImage = `![${file.name}](noteapp-img:${id})`;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: mdImage },
      selection: { anchor: from + mdImage.length },
    });
    view.focus();
    e.target.value = ""; // Reset so same file can be selected again
  };

  // Detect markdown table around cursor and open visual editor
  const openTableEditorAtCursor = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc;
    const { head } = view.state.selection.main;
    const curLine = doc.lineAt(head);
    // Check if current line looks like a table row
    if (!/^\|.*\|$/.test(curLine.text.trim())) return;
    // Expand upward to find table start
    let startLine = curLine.number;
    while (startLine > 1) {
      const prev = doc.line(startLine - 1);
      if (!/^\|.*\|/.test(prev.text.trim())) break;
      startLine--;
    }
    // Expand downward to find table end
    let endLine = curLine.number;
    while (endLine < doc.lines) {
      const next = doc.line(endLine + 1);
      if (!/^\|.*\|/.test(next.text.trim())) break;
      endLine++;
    }
    const from = doc.line(startLine).from;
    const to = doc.line(endLine).to;
    const tableMd = doc.sliceString(from, to);
    setTableEdit({ from, to, markdown: tableMd });
  }, []);

  const toolbarItems = [
    { icon: Heading2, command: "heading", tooltip: "Heading", size: 15 },
    { icon: Bold, command: "bold", tooltip: "Bold (Ctrl+B)", size: 15 },
    { icon: Italic, command: "italic", tooltip: "Italic (Ctrl+I)", size: 15 },
    { divider: true },
    { icon: Quote, command: "blockquote", tooltip: "Quote", size: 15 },
    { icon: Code, command: "backticks", tooltip: "Inline Code (Ctrl+E)", size: 15 },
    { icon: Braces, command: "codeblockPicker", tooltip: "Code Block (with language)", size: 15 },
    { icon: Link, command: "link", tooltip: "Link (Ctrl+K)", size: 15 },
    { icon: Image, command: "image", tooltip: "Image Link", size: 15 },
    { icon: Paperclip, command: "uploadImage", tooltip: "Attach Image", size: 15 },
    { divider: true },
    { icon: List, command: "ulist", tooltip: "Bullet List", size: 15 },
    { icon: ListOrdered, command: "olist", tooltip: "Numbered List", size: 15 },
    { icon: CheckSquare, command: "tasklist", tooltip: "Task List", size: 15 },
    { icon: Indent, command: "indent", tooltip: "Indent (Tab)", size: 15 },
    { icon: Outdent, command: "outdent", tooltip: "Outdent (Shift+Tab)", size: 15 },
    { divider: true },
    { icon: Table, command: "editTable", tooltip: "Table Editor (visual)", size: 15 },
    { icon: GitBranch, command: "diagramPicker", tooltip: "Insert Diagram", size: 15 },
    { icon: Minus, command: "hr", tooltip: "Horizontal Rule", size: 15 },
    { icon: Strikethrough, command: "strike", tooltip: "Strikethrough", size: 15 },
    { icon: AlertTriangle, command: "alert", tooltip: "Alert Callout", size: 15 },
  ];

  // Markdown insertion logic
  const insertMarkdown = useCallback((command, extra) => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    let insert, selectFrom, selectTo;

    switch (command) {
      case "bold": {
        const text = selected || "bold text";
        insert = `**${text}**`;
        selectFrom = from + 2;
        selectTo = from + 2 + text.length;
        break;
      }
      case "italic": {
        const text = selected || "italic text";
        insert = `_${text}_`;
        selectFrom = from + 1;
        selectTo = from + 1 + text.length;
        break;
      }
      case "strike": {
        const text = selected || "text";
        insert = `~~${text}~~`;
        selectFrom = from + 2;
        selectTo = from + 2 + text.length;
        break;
      }
      case "backticks": {
        const text = selected || "code";
        insert = `\`${text}\``;
        selectFrom = from + 1;
        selectTo = from + 1 + text.length;
        break;
      }
      case "heading":
        insert = `### ${selected || "Heading"}`;
        selectFrom = from + 4;
        selectTo = from + insert.length;
        break;
      case "link": {
        const label = selected || "link text";
        insert = `[${label}](url)`;
        selectFrom = from + label.length + 3;
        selectTo = selectFrom + 3;
        break;
      }
      case "image": {
        const alt = selected || "alt text";
        insert = `![${alt}](url)`;
        selectFrom = from + alt.length + 4;
        selectTo = selectFrom + 3;
        break;
      }
      case "olist":
        insert = selected ? selected.split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n") : "1. ";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "ulist":
        insert = selected ? selected.split("\n").map((l) => `- ${l}`).join("\n") : "- ";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "tasklist":
        insert = selected ? selected.split("\n").map((l) => `- [ ] ${l}`).join("\n") : "- [ ] ";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "blockquote":
        insert = selected ? selected.split("\n").map((l) => `> ${l}`).join("\n") : "> ";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "codeblock": {
        const lang = typeof extra === "string" ? extra : "";
        insert = "\n```" + lang + "\n" + (selected || "") + "\n```\n";
        const offset = 4 + lang.length;
        selectFrom = from + offset;
        selectTo = from + offset + (selected ? selected.length : 0);
        break;
      }
      case "table":
        insert = "\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "hr":
        insert = "\n---\n";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "alert":
        insert = "> [!NOTE]\n> " + (selected || "Useful information here.");
        selectFrom = from + 14; selectTo = from + insert.length;
        break;
      default:
        return;
    }

    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: selected ? from + insert.length : selectFrom, head: selected ? from + insert.length : selectTo },
    });
    view.focus();
  }, []);

  // Insert code block with a specific language
  const insertCodeBlock = useCallback(
    (lang) => {
      insertMarkdown("codeblock", lang || "");
      setShowLangPicker(false);
      setLangFilter("");
    },
    [insertMarkdown],
  );

  // Indent / outdent selected lines (list nesting)
  const indentLines = useCallback((direction) => {
    const view = viewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const doc = view.state.doc;
    const startLine = doc.lineAt(from);
    const endLine = doc.lineAt(to);
    const changes = [];
    for (let i = startLine.number; i <= endLine.number; i++) {
      const line = doc.line(i);
      if (direction === "indent") {
        changes.push({ from: line.from, to: line.from, insert: "  " });
      } else {
        // Outdent: remove up to 2 leading spaces or 1 tab
        const text = line.text;
        if (text.startsWith("  ")) {
          changes.push({ from: line.from, to: line.from + 2, insert: "" });
        } else if (text.startsWith("\t")) {
          changes.push({ from: line.from, to: line.from + 1, insert: "" });
        }
      }
    }
    if (changes.length > 0) {
      view.dispatch({ changes });
    }
    view.focus();
  }, []);

  // Close language picker on outside click
  useEffect(() => {
    if (!showLangPicker) return;
    const handleClickOutside = (e) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target)) {
        setShowLangPicker(false);
        setLangFilter("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLangPicker]);

  // Close diagram picker on outside click
  useEffect(() => {
    if (!showDiagramPicker) return;
    const handleClickOutside = (e) => {
      if (diagramPickerRef.current && !diagramPickerRef.current.contains(e.target)) {
        setShowDiagramPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDiagramPicker]);

  // Keep ref in sync for keymap closures
  insertMarkdownRef.current = insertMarkdown;
  const saveFnRef = useRef(null);
  const setSlashMenuRef = useRef(setSlashMenu);
  setSlashMenuRef.current = setSlashMenu;

  // Close slash menu on outside click or Escape
  useEffect(() => {
    if (!slashMenu) return;
    const handleClickOutside = (e) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target)) {
        setSlashMenu(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSlashMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [slashMenu]);

  // Handle slash command selection
  const handleSlashCommand = useCallback((cmd) => {
    const view = viewRef.current;
    if (!view || !slashMenu) return;
    // Replace the "/" and any filter text with the command's insert text
    const line = view.state.doc.lineAt(slashMenu.pos);
    const slashStart = line.text.lastIndexOf("/");
    const from = slashStart >= 0 ? line.from + slashStart : slashMenu.pos;
    const to = view.state.selection.main.head;

    // Check for {{variable}} placeholders in template content
    const varMatches = [...new Set((cmd.insert.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))];
    if (varMatches.length > 0) {
      // Show variable prompt dialog
      setVarPrompt({
        variables: varMatches.map(name => ({ name, value: "" })),
        template: cmd.insert,
        from,
        to,
      });
      setSlashMenu(null);
      return;
    }

    view.dispatch({
      changes: { from, to, insert: cmd.insert },
      selection: { anchor: from + cmd.insert.length },
    });
    setSlashMenu(null);
    view.focus();
  }, [slashMenu]);

  // Insert template after variable prompt is filled
  const handleVarPromptInsert = useCallback(() => {
    if (!varPrompt) return;
    const view = viewRef.current;
    if (!view) return;
    let text = varPrompt.template;
    for (const v of varPrompt.variables) {
      text = text.replaceAll(`{{${v.name}}}`, v.value || `{{${v.name}}}`);
    }
    view.dispatch({
      changes: { from: varPrompt.from, to: varPrompt.to, insert: text },
      selection: { anchor: varPrompt.from + text.length },
    });
    setVarPrompt(null);
    view.focus();
  }, [varPrompt]);

  // Markdown autocomplete: triggered by typing common patterns
  const markdownCompletions = useCallback((context) => {
    // Wiki-link autocomplete: detect [[ prefix
    const wikiMatch = context.matchBefore(/\[\[[^\]]*$/);
    if (wikiMatch) {
      const partial = wikiMatch.text.slice(2).toLowerCase(); // text after [[
      const noteList = (props.allNotes || [])
        .filter((n) => (n.title || n.notetitle || "").trim())
        .filter((n) => !partial || (n.title || n.notetitle || "").toLowerCase().includes(partial));
      if (noteList.length === 0) return null;
      return {
        from: wikiMatch.from,
        options: noteList.slice(0, 20).map((n) => {
          const t = n.title || n.notetitle;
          return { label: `[[${t}]]`, detail: "Wiki link", apply: `[[${t}]]` };
        }),
        validFor: /[^\]]*$/,
      };
    }

    // Match word at cursor (min 2 chars) — only at line start for block-level, anywhere for inline
    const word = context.matchBefore(/\w{2,}$/);
    if (!word) return null;
    const token = word.text.toLowerCase();

    const completions = [
      // Block-level
      { label: "```mermaid", detail: "Mermaid diagram", apply: "```mermaid\nflowchart TD\n  A --> B\n```\n" },
      { label: "```javascript", detail: "JS code block", apply: "```javascript\n\n```\n" },
      { label: "```typescript", detail: "TS code block", apply: "```typescript\n\n```\n" },
      { label: "```python", detail: "Python code block", apply: "```python\n\n```\n" },
      { label: "```bash", detail: "Shell code block", apply: "```bash\n\n```\n" },
      { label: "```sql", detail: "SQL code block", apply: "```sql\n\n```\n" },
      { label: "```json", detail: "JSON code block", apply: "```json\n\n```\n" },
      { label: "```yaml", detail: "YAML code block", apply: "```yaml\n\n```\n" },
      // Markdown elements
      { label: "table", detail: "Insert table", apply: "| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n" },
      { label: "tasklist", detail: "Task list", apply: "- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n" },
      { label: "frontmatter", detail: "YAML metadata", apply: "---\ntitle: \ndate: " + new Date().toISOString().slice(0, 10) + "\ntags: []\n---\n" },
      { label: "details", detail: "Collapsible section", apply: "<details>\n<summary>Click to expand</summary>\n\nContent here.\n\n</details>\n" },
      { label: "footnote", detail: "Footnote reference", apply: "[^1]\n\n[^1]: Footnote text here." },
      { label: "alert-note", detail: "Note callout", apply: "> [!NOTE]\n> Information here.\n" },
      { label: "alert-warning", detail: "Warning callout", apply: "> [!WARNING]\n> Warning message here.\n" },
      { label: "alert-tip", detail: "Tip callout", apply: "> [!TIP]\n> Helpful tip here.\n" },
      { label: "alert-important", detail: "Important callout", apply: "> [!IMPORTANT]\n> Important information here.\n" },
      { label: "alert-caution", detail: "Caution callout", apply: "> [!CAUTION]\n> Caution message here.\n" },
      // Diagrams
      { label: "flowchart", detail: "Mermaid flowchart", apply: "```mermaid\nflowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]\n```\n" },
      { label: "sequenceDiagram", detail: "Sequence diagram", apply: "```mermaid\nsequenceDiagram\n  participant A as Client\n  participant B as Server\n  A->>B: Request\n  B-->>A: Response\n```\n" },
      { label: "classDiagram", detail: "Class diagram", apply: "```mermaid\nclassDiagram\n  class MyClass {\n    +String name\n    +method()\n  }\n```\n" },
      { label: "stateDiagram", detail: "State diagram", apply: "```mermaid\nstateDiagram-v2\n  [*] --> Idle\n  Idle --> Active : start\n  Active --> [*] : stop\n```\n" },
      { label: "gantt", detail: "Gantt chart", apply: "```mermaid\ngantt\n  title Timeline\n  dateFormat YYYY-MM-DD\n  section Tasks\n    Task A :a1, 2026-01-01, 30d\n```\n" },
      { label: "erDiagram", detail: "ER diagram", apply: "```mermaid\nerDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains\n```\n" },
      { label: "mindmap", detail: "Mindmap", apply: "```mermaid\nmindmap\n  root((Topic))\n    Branch A\n      Leaf 1\n    Branch B\n      Leaf 2\n```\n" },
      { label: "piechart", detail: "Pie chart", apply: "```mermaid\npie title Distribution\n  \"A\" : 40\n  \"B\" : 30\n  \"C\" : 30\n```\n" },
    ];

    const filtered = completions.filter(c => c.label.toLowerCase().includes(token));
    if (filtered.length === 0) return null;

    return {
      from: word.from,
      options: filtered,
      validFor: /\w*/,
    };
  }, []);

  // Create CodeMirror extensions with GitHub-like keyboard shortcuts
  const createExtensions = useCallback((isDark, useVim) => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setBodyTxt(update.state.doc.toString());

        // Slash command detection
        const { head } = update.state.selection.main;
        const line = update.state.doc.lineAt(head);
        const textBefore = line.text.slice(0, head - line.from);
        const slashMatch = textBefore.match(/^\/?(\w*)$/);
        if (slashMatch && textBefore.startsWith("/")) {
          // Get cursor screen position for menu placement
          const coords = update.view.coordsAtPos(head);
          setSlashMenuRef.current({
            pos: head,
            filter: slashMatch[1] || "",
            cursorTop: coords ? coords.bottom : 0,
            cursorLeft: coords ? coords.left : 0,
          });
        } else {
          setSlashMenuRef.current(null);
        }
      }
    });

    // GitHub-style keyboard shortcuts
    const markdownKeymap = keymap.of([
      { key: "Mod-b", run: () => { insertMarkdownRef.current("bold"); return true; } },
      { key: "Mod-i", run: () => { insertMarkdownRef.current("italic"); return true; } },
      { key: "Mod-k", run: () => { insertMarkdownRef.current("link"); return true; } },
      { key: "Mod-e", run: () => { insertMarkdownRef.current("backticks"); return true; } },
      { key: "Mod-Shift-k", run: () => { insertMarkdownRef.current("codeblock"); return true; } },
      { key: "Mod-Shift-.", run: () => { insertMarkdownRef.current("blockquote"); return true; } },
      { key: "Mod-Shift-7", run: () => { insertMarkdownRef.current("olist"); return true; } },
      { key: "Mod-Shift-8", run: () => { insertMarkdownRef.current("ulist"); return true; } },
      { key: "Mod-s", run: () => { if (saveFnRef.current) saveFnRef.current(); return true; } },
    ]);

    // Helper: store image blob and insert markdown reference
    const insertImage = async (file, view) => {
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await noteDB.saveImage(id, file, file.name);
      const mdImage = `![${file.name || "image"}](noteapp-img:${id})`;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: mdImage },
        selection: { anchor: from + mdImage.length },
      });
    };

    // Paste handler: images, HTML-to-Markdown, or plain text
    const pasteHandler = EditorView.domEventHandlers({
      paste(event, view) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        // Check for pasted images (files or clipboard items)
        const imageFile = Array.from(clipboard.files).find((f) => f.type.startsWith("image/"));
        if (imageFile) {
          event.preventDefault();
          insertImage(imageFile, view);
          return true;
        }
        // Some browsers put images in items, not files
        if (clipboard.items) {
          for (const item of clipboard.items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                insertImage(file, view);
                return true;
              }
            }
          }
        }

        // HTML → Markdown conversion (only for rich HTML, not plain/markdown text)
        const htmlContent = clipboard.getData("text/html");
        if (htmlContent) {
          // Check if the HTML contains actual rich formatting tags (not just a text wrapper)
          const hasRichHtml = /<(?:p|div|span|br|h[1-6]|ul|ol|li|table|tr|td|th|a|img|pre|code|blockquote|strong|em|b|i|hr)\b/i.test(htmlContent);
          if (hasRichHtml) {
            // Clean Zendesk quirks before conversion:
            // Remove empty style attributes, data-* attributes, Zendesk wrapper divs
            let cleanedHtml = htmlContent
              .replace(/\s+style="[^"]*"/gi, "")
              .replace(/\s+data-[a-z-]+="[^"]*"/gi, "")
              .replace(/<\/?font[^>]*>/gi, "");

            html2md.keep(["pre", "code"]);
            let pasteData = html2md.turndown(cleanedHtml);

            // Post-process: fix double-blank-lines in lists and normalize numbering
            pasteData = pasteData
              .replace(/(\n\s*[-*]\s.*)\n{3,}/g, "$1\n")  // collapse extra blanks in bullet lists
              .replace(/(\n\s*\d+\.\s.*)\n{3,}/g, "$1\n"); // collapse extra blanks in ordered lists

            event.preventDefault();
            const { from, to } = view.state.selection.main;
            view.dispatch({
              changes: { from, to, insert: pasteData },
              selection: { anchor: from + pasteData.length },
            });
            return true;
          }
        }
        // Plain text or markdown — let CodeMirror handle it normally
        return false;
      },
      drop(event, view) {
        const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : [];
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (imageFile) {
          event.preventDefault();
          event.stopPropagation();
          insertImage(imageFile, view);
          return true;
        }
        return false;
      },
      dragover(event) {
        // Must prevent default on dragover for drop to fire
        if (event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files")) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    });

    const exts = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      history(),
      closeBrackets(),
      autocompletion({
        override: [markdownCompletions],
        activateOnTyping: true,
        maxRenderedOptions: 12,
      }),
      markdownKeymap,
      pasteHandler,
      keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      updateListener,
      placeholder("Write your note in Markdown..."),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", fontSize: "14px" },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, 'Liberation Mono', monospace",
          lineHeight: "1.6",
        },
        ".cm-content": { padding: "16px 20px", minHeight: "100%" },
        ".cm-gutters": { display: "none" },
        ".cm-activeLine": { backgroundColor: isDark ? "#1e293b" : "#f8fafc" },
        ".cm-selectionBackground": { backgroundColor: isDark ? "#1e40af44" : "#bfdbfe66" },
        "&.cm-focused .cm-selectionBackground": { backgroundColor: isDark ? "#1e40af66" : "#93c5fd66" },
        ".cm-cursor": { borderLeftColor: isDark ? "#4493f8" : "#0969da" },
      }),
    ];
    if (isDark) exts.push(oneDark);
    if (useVim) exts.push(vim());
    return exts;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track latest doc content for dark mode switch
  const docRef = useRef(initialBody);

  // Initialize / recreate editor when darkMode or showPreview changes
  useEffect(() => {
    if (!editorRef.current || showPreview) return;
    // Read current content before destroying
    if (viewRef.current) {
      docRef.current = viewRef.current.state.doc.toString();
      viewRef.current.destroy();
      viewRef.current = null;
    }
    const vimMode = props.vimMode;
    const state = EditorState.create({ doc: docRef.current, extensions: createExtensions(darkMode, vimMode) });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    // Track vim mode changes for status bar
    if (vimMode && viewRef.current.cm) {
      setVimModeLabel("NORMAL");
      viewRef.current.cm.on("vim-mode-change", (e) => {
        const mode = (e.mode || "normal").toUpperCase();
        const sub = e.subMode ? ` ${e.subMode.toUpperCase()}` : "";
        setVimModeLabel(`${mode}${sub}`);
      });
    } else {
      setVimModeLabel("");
    }
    // Auto-focus the editor (especially for new notes)
    setTimeout(() => viewRef.current && viewRef.current.focus(), 50);
    return () => {
      if (viewRef.current) {
        docRef.current = viewRef.current.state.doc.toString();
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [darkMode, showPreview, createExtensions, initialBody, props.vimMode]);

  // Resolve noteapp-img: references, mermaid, and PlantUML in preview panels
  const previewRef = useRef(null);
  const splitPreviewRef = useRef(null);
  const mermaidRef = useRef(null);

  useEffect(() => {
    const postProcess = async (container) => {
      if (!container) return;

      // Resolve noteapp-img: image references
      const images = container.querySelectorAll('img[src^="noteapp-img:"]');
      for (const img of images) {
        const id = img.getAttribute("src").replace("noteapp-img:", "");
        const url = await noteDB.getImageURL(id);
        if (url) img.src = url;
      }

      // Render mermaid diagrams
      const mermaidBlocks = container.querySelectorAll("code.language-mermaid");
      if (mermaidBlocks.length > 0) {
        if (!mermaidRef.current) {
          const m = await import("mermaid");
          mermaidRef.current = m.default;
          mermaidRef.current.initialize({ startOnLoad: false, theme: darkMode ? "dark" : "default" });
        }
        const mermaid = mermaidRef.current;
        for (let i = 0; i < mermaidBlocks.length; i++) {
          const block = mermaidBlocks[i];
          const pre = block.parentNode;
          if (!pre || !pre.parentNode) continue;
          const div = document.createElement("div");
          div.className = "mermaid-diagram";
          try {
            const id = `mermaid-preview-${i}-${Math.random().toString(36).slice(2, 8)}`;
            const { svg } = await mermaid.render(id, block.textContent.trim());
            div.innerHTML = DOMPurify.sanitize(svg, { ADD_TAGS: ["foreignObject"], ADD_ATTR: ["requiredExtensions"] });
            pre.replaceWith(div);
          } catch (err) {
            div.textContent = "Diagram error: " + err.message;
            div.style.color = "#dc2626";
            div.style.fontSize = "12px";
            pre.replaceWith(div);
          }
        }
      }

      // Render PlantUML diagrams
      const plantumlBlocks = container.querySelectorAll("code.language-plantuml");
      plantumlBlocks.forEach((block) => {
        const pre = block.parentNode;
        if (!pre || !pre.parentNode) return;
        const src = block.textContent.trim();
        const encoded = Array.from(new TextEncoder().encode(src))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const div = document.createElement("div");
        div.className = "plantuml-diagram";
        const img = document.createElement("img");
        img.src = `https://www.plantuml.com/plantuml/svg/~h${encoded}`;
        img.alt = "PlantUML diagram";
        img.style.maxWidth = "100%";
        div.appendChild(img);
        pre.replaceWith(div);
      });
    };

    if (showPreview && previewRef.current) postProcess(previewRef.current);
    if (splitscreen && splitPreviewRef.current) postProcess(splitPreviewRef.current);
  }, [bodytxt, showPreview, splitscreen, darkMode]);

  const handleCancelBtn = () => {
    if (isDirty) {
      props.showConfirm(
        "Discard Changes",
        "You have unsaved changes. Are you sure you want to discard them?",
        () => {
          setIsDirty(false);
          if (noteAction === "updatenote" || note.action === "updatenote") {
            props.handleNoteListItemClick(null, { noteid: note.noteid, title: note.notetitle, body: note.notebody });
          } else {
            props.handleClickHomeBtn();
          }
        },
        { confirmText: "Discard", danger: true }
      );
      return;
    }
    if (noteAction === "updatenote" || note.action === "updatenote") {
      props.handleNoteListItemClick(null, { noteid: note.noteid, title: note.notetitle, body: note.notebody });
      return;
    }
    props.handleClickHomeBtn();
  };

  const handleSaveBtn = (e) => {
    if (!title.trim() && !bodytxt.trim()) return;
    note.notetitle = title;
    note.notebody = bodytxt;
    note.tags = tags;
    note.action = noteAction;
    props.handleSaveNote(e, note);
    if (noteAction === "addnote") setNoteAction("updatenote");
    setIsDirty(false);
    setLastSaved(new Date());
  };

  // Keep save ref in sync
  saveFnRef.current = handleSaveBtn;

  // Expose save function for parent (e.g., nav confirm dialog)
  useEffect(() => {
    window.__noteEditorSave = () => {
      if (saveFnRef.current) saveFnRef.current(null);
    };
    return () => { delete window.__noteEditorSave; };
  });

  return (
    <div className="editor-container" role="main">
      <div className={`editor-panel ${splitscreen ? "" : "editor-panel-full"}`} style={splitscreen ? { width: `${splitRatio}%` } : undefined}>
        {/* Toolbar — top bar */}
        <div className={`editor-toolbar ${darkMode ? "editor-toolbar-dark" : ""}`}>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" aria-label="Select image file" onChange={handleImageUpload} />
          {toolbarItems.map((item, idx) =>
            item.divider ? (
              <div key={idx} className={`toolbar-divider ${darkMode ? "toolbar-divider-dark" : ""}`} />
            ) : item.command === "diagramPicker" ? (
              <div key={item.command} style={{ position: "relative", display: "inline-flex" }}>
                <button
                  onClick={() => setShowDiagramPicker(!showDiagramPicker)}
                  className={`toolbar-btn ${darkMode ? "toolbar-btn-dark" : ""} ${showDiagramPicker ? "toolbar-btn-active" : ""}`}
                  title={item.tooltip}
                  aria-label={item.tooltip}
                >
                  <item.icon size={item.size} />
                  <ChevronDown size={10} className="toolbar-chevron" />
                </button>
                {showDiagramPicker && (
                  <div className={`lang-picker ${darkMode ? "lang-picker-dark" : ""}`} ref={diagramPickerRef} style={{ left: "auto", right: 0, marginLeft: 0, maxWidth: 400, minWidth: 340 }}>
                    <div className="lang-picker-list">
                      {SLASH_COMMANDS.filter(c => c.id.startsWith("mermaid")).map((cmd) => (
                        <button
                          key={cmd.id}
                          className={`lang-picker-item ${darkMode ? "lang-picker-item-dark" : ""}`}
                          onClick={() => {
                            const view = viewRef.current;
                            if (view) {
                              const { from, to } = view.state.selection.main;
                              view.dispatch({
                                changes: { from, to, insert: cmd.insert },
                                selection: { anchor: from + cmd.insert.length },
                              });
                              view.focus();
                            }
                            setShowDiagramPicker(false);
                          }}
                        >
                          <cmd.icon size={14} style={{ marginRight: 8, flexShrink: 0 }} />
                          <span className="lang-picker-name">{cmd.label}</span>
                          <span className="lang-picker-hint">{cmd.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item.command}
                onClick={() => {
                  if (item.command === "uploadImage") imageInputRef.current.click();
                  else if (item.command === "editTable") {
                    // If cursor is inside a table, open visual editor for it; otherwise create new
                    const view = viewRef.current;
                    if (view) {
                      const line = view.state.doc.lineAt(view.state.selection.main.head);
                      if (/^\|.*\|$/.test(line.text.trim())) {
                        openTableEditorAtCursor();
                      } else {
                        setTableEdit({ from: null, to: null, markdown: "" }); // New table
                      }
                    } else {
                      setTableEdit({ from: null, to: null, markdown: "" });
                    }
                  }
                  else if (item.command === "codeblockPicker") setShowLangPicker(!showLangPicker);
                  else if (item.command === "indent") indentLines("indent");
                  else if (item.command === "outdent") indentLines("outdent");
                  else insertMarkdown(item.command);
                }}
                className={`toolbar-btn ${darkMode ? "toolbar-btn-dark" : ""} ${item.command === "codeblockPicker" && showLangPicker ? "toolbar-btn-active" : ""}`}
                title={item.tooltip}
                aria-label={item.tooltip}
              >
                <item.icon size={item.size} />
                {item.command === "codeblockPicker" && <ChevronDown size={10} className="toolbar-chevron" />}
              </button>
            )
          )}

          <div className="toolbar-spacer" />

          <div className="toolbar-right">
            <button
              onClick={() => {
                // Save current doc before toggling preview
                if (!showPreview && viewRef.current) {
                  docRef.current = viewRef.current.state.doc.toString();
                }
                setShowPreview(!showPreview);
              }}
              className={`toolbar-btn ${darkMode ? "toolbar-btn-dark" : ""} ${showPreview ? "toolbar-btn-active" : ""}`}
              title={showPreview ? "Write" : "Preview"}
            >
              {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={() => setSplitscreen(!splitscreen)}
              className={`toolbar-btn ${darkMode ? "toolbar-btn-dark" : ""} ${splitscreen ? "toolbar-btn-active" : ""}`}
              title={splitscreen ? "Close Preview" : "Side-by-side"}
            >
              {splitscreen ? <Maximize2 size={15} /> : <Columns2 size={15} />}
            </button>
          </div>
        </div>

        {/* Language picker dropdown */}
        {showLangPicker && (
          <div className={`lang-picker ${darkMode ? "lang-picker-dark" : ""}`} ref={langPickerRef}>
            <input
              type="text"
              className={`lang-picker-input ${darkMode ? "lang-picker-input-dark" : ""}`}
              placeholder="Filter language..."
              value={langFilter}
              autoFocus
              onChange={(e) => setLangFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const filtered = CODE_LANGUAGES.filter((l) =>
                    l.toLowerCase().includes(langFilter.toLowerCase()),
                  );
                  insertCodeBlock(filtered.length > 0 ? filtered[0] : langFilter.trim());
                } else if (e.key === "Escape") {
                  setShowLangPicker(false);
                  setLangFilter("");
                }
              }}
            />
            <div className="lang-picker-list">
              <button
                className={`lang-picker-item ${darkMode ? "lang-picker-item-dark" : ""}`}
                onClick={() => insertCodeBlock("")}
              >
                <span className="lang-picker-name">Plain text</span>
                <span className="lang-picker-hint">no highlighting</span>
              </button>
              {CODE_LANGUAGES.filter((l) =>
                l.toLowerCase().includes(langFilter.toLowerCase()),
              ).map((lang) => (
                <button
                  key={lang}
                  className={`lang-picker-item ${darkMode ? "lang-picker-item-dark" : ""}`}
                  onClick={() => insertCodeBlock(lang)}
                >
                  <span className="lang-picker-name">{lang}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title — hidden in preview mode */}
        {!showPreview && (
          <input
            name="notetitle"
            type="text"
            id="notetitle"
            data-action={note.action}
            value={title}
            placeholder="Untitled"
            autoComplete="off"
            ref={titleRef}
            aria-label="Note title"
            onChange={(e) => setTitle(e.target.value)}
            className={`editor-title ${darkMode ? "editor-title-dark" : ""}`}
          />
        )}

        {/* Editor / Preview */}
        <div className={`editor-codemirror ${darkMode ? "editor-codemirror-dark" : ""}`}>
          {showPreview ? (
            <div className="editor-preview-inline" ref={previewRef}>
              <h1 className="note-view-title" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md2html.render(title || "Untitled")) }}></h1>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md2html.render(bodytxt || "")) }}
              />
            </div>
          ) : (
            <div style={{ position: "relative", height: "100%" }}>
              <div
                ref={editorRef}
                style={{ height: "100%" }}
                onClick={(e) => {
                  // If clicking empty space below content, focus editor at end
                  if (e.target === editorRef.current && viewRef.current) {
                    const len = viewRef.current.state.doc.length;
                    viewRef.current.dispatch({ selection: { anchor: len } });
                    viewRef.current.focus();
                  }
                }}
              />
              {/* Slash command palette */}
              {slashMenu && (() => {
                const snippets = loadSnippets();
                const filter = slashMenu.filter ? slashMenu.filter.toLowerCase() : "";
                const filteredCmds = SLASH_COMMANDS.filter((cmd) => !filter || cmd.label.toLowerCase().includes(filter));
                const filteredSnippets = snippets.filter((s) => !filter || s.name.toLowerCase().includes(filter));
                const hasResults = filteredCmds.length > 0 || filteredSnippets.length > 0;

                return hasResults ? (
                  <div
                    className={`slash-menu ${darkMode ? "slash-menu-dark" : ""}`}
                    ref={slashMenuRef}
                    style={{
                      top: slashMenu.cursorTop ? slashMenu.cursorTop + 4 : undefined,
                      left: slashMenu.cursorLeft ? slashMenu.cursorLeft : undefined,
                    }}
                  >
                    {filteredCmds.map((cmd) => (
                      <button
                        key={cmd.id}
                        className={`slash-menu-item ${darkMode ? "slash-menu-item-dark" : ""}`}
                        onMouseDown={(e) => { e.preventDefault(); handleSlashCommand(cmd); }}
                      >
                        <cmd.icon size={16} className="slash-menu-icon" />
                        <div className="slash-menu-text">
                          <span className="slash-menu-label">{cmd.label}</span>
                          <span className="slash-menu-desc">{cmd.description}</span>
                        </div>
                      </button>
                    ))}
                    {filteredSnippets.length > 0 && filteredCmds.length > 0 && (
                      <div className={`slash-menu-divider ${darkMode ? "slash-menu-divider-dark" : ""}`}>Templates</div>
                    )}
                    {filteredSnippets.map((snippet) => (
                      <button
                        key={snippet.id}
                        className={`slash-menu-item ${darkMode ? "slash-menu-item-dark" : ""}`}
                        onMouseDown={(e) => { e.preventDefault(); handleSlashCommand({ insert: snippet.content }); }}
                      >
                        <FileText size={16} className="slash-menu-icon" />
                        <div className="slash-menu-text">
                          <span className="slash-menu-label">{snippet.name}</span>
                          <span className="slash-menu-desc">{snippet.category}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Tags + Bottom bar */}
        <div className={`editor-tags ${darkMode ? "editor-tags-dark" : ""}`}>
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button onClick={() => { setTags(tags.filter(t => t !== tag)); setIsDirty(true); }} aria-label={`Remove tag ${tag}`}>&times;</button>
            </span>
          ))}
          <input
            type="text"
            className="tag-input"
            placeholder="Add tag..."
            value={tagInput}
            aria-label="Add tag"
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                e.preventDefault();
                const newTag = tagInput.trim().toLowerCase();
                if (!tags.includes(newTag)) {
                  setTags([...tags, newTag]);
                  setIsDirty(true);
                }
                setTagInput("");
              }
              if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                setTags(tags.slice(0, -1));
                setIsDirty(true);
              }
            }}
          />
          {/* Suggest tags — show when new note has title + body but no tags */}
          {props.tagSuggestEnabled !== false && tags.length === 0 && title.trim() && bodytxt.trim() && editorSuggestions.length === 0 && (
            <button
              onClick={() => setEditorSuggestions(suggestTags(title, bodytxt, tags))}
              className="tag-suggest-btn"
              style={{ marginLeft: "4px" }}
              title="Suggest tags"
            >
              <Sparkles size={12} /> Suggest Tags
            </button>
          )}
          {editorSuggestions.length > 0 && editorSuggestions.map((s) => (
            <span
              key={s}
              className="tag tag-suggested"
              onClick={() => {
                setTags([...tags, s]);
                setEditorSuggestions(editorSuggestions.filter(t => t !== s));
                setIsDirty(true);
              }}
            >
              {s} <Check size={10} />
            </span>
          ))}
          {editorSuggestions.length > 0 && (
            <button
              onClick={() => {
                setTags([...new Set([...tags, ...editorSuggestions])]);
                setEditorSuggestions([]);
                setIsDirty(true);
              }}
              className="tag-suggest-accept"
              style={{ marginLeft: "2px" }}
            >
              All
            </button>
          )}
          {editorSuggestions.length > 0 && (
            <button onClick={() => setEditorSuggestions([])} className="tag-suggest-dismiss">
              <X size={12} />
            </button>
          )}
        </div>
        <div className={`editor-bottom ${darkMode ? "editor-bottom-dark" : ""}`}>
          <button onClick={(e) => handleSaveBtn(e)} data-action={note.action} className="btn-save" disabled={!title.trim() && !bodytxt.trim()}>
            <Save size={14} /> {isDirty ? "Save" : "Saved"}
          </button>
          <span className="editor-hint" role="status" aria-live="polite">
            {vimModeLabel && <span className="vim-mode-badge">{`--${vimModeLabel}--`}</span>}
            {wordCount} words · {charCount} chars
            {lastSaved && ` · Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            {isDirty && !autoSave && " · Unsaved"}
          </span>
          <button
            onClick={toggleAutoSave}
            className={`editor-autosave-btn ${autoSave ? "active" : ""}`}
            title={autoSave ? "Autosave ON (click to disable)" : "Autosave OFF (click to enable)"}
            aria-label="Toggle autosave"
          >
            {autoSave ? "Auto ✓" : "Auto"}
          </button>
          <button onClick={() => handleCancelBtn()} className="btn-cancel">
            <X size={14} /> Cancel
          </button>
        </div>
      </div>

      {/* Split resize handle + preview */}
      {splitscreen && (
        <>
          <div
            className="split-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              const container = e.target.closest(".editor-container");
              const startX = e.clientX;
              const startRatio = splitRatio;
              const containerWidth = container.offsetWidth;
              const onMouseMove = (ev) => {
                const delta = ev.clientX - startX;
                const newRatio = Math.max(25, Math.min(75, startRatio + (delta / containerWidth) * 100));
                setSplitRatio(newRatio);
              };
              const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
              };
              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize split preview"
          />
          <div className="split-preview" style={{ width: `${100 - splitRatio}%` }}>
          <div className="split-preview-inner" ref={splitPreviewRef}>
            <h2
              className="split-preview-title"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md2html.render(title || "")) }}
            ></h2>
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md2html.render(bodytxt || "")) }}
            ></div>
          </div>
        </div>
        </>
      )}

      {/* Table Converter Modal */}
      {showTableConverter && (
        <TableConverter
          darkMode={darkMode}
          onClose={() => setShowTableConverter(false)}
          onInsert={(md) => {
            const view = viewRef.current;
            if (view) {
              const { from, to } = view.state.selection.main;
              view.dispatch({
                changes: { from, to, insert: "\n" + md + "\n" },
                selection: { anchor: from + md.length + 2 },
              });
              view.focus();
            }
          }}
        />
      )}

      {/* Visual Table Editor */}
      {tableEdit && (
        <TableEditor
          initialMarkdown={tableEdit.markdown}
          darkMode={darkMode}
          onCancel={() => setTableEdit(null)}
          onSave={(md) => {
            const view = viewRef.current;
            if (view) {
              if (tableEdit.from != null && tableEdit.to != null) {
                // Replace existing table
                view.dispatch({
                  changes: { from: tableEdit.from, to: tableEdit.to, insert: md.trimEnd() },
                });
              } else {
                // Insert new table at cursor
                const { from, to } = view.state.selection.main;
                view.dispatch({
                  changes: { from, to, insert: "\n" + md },
                  selection: { anchor: from + md.length + 1 },
                });
              }
              view.focus();
            }
            setTableEdit(null);
          }}
        />
      )}

      {/* Variable Prompt Dialog */}
      {varPrompt && (
        <div className="modal-overlay" onClick={() => setVarPrompt(null)}>
          <div className={`modal-dialog var-prompt-dialog ${darkMode ? "var-prompt-dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Fill in template variables</h3>
            </div>
            <div className="modal-body">
              {varPrompt.variables.map((v, i) => (
                <div key={v.name} className="var-prompt-field">
                  <label className="var-prompt-label">{v.name.replace(/_/g, " ")}</label>
                  <input
                    type="text"
                    className="var-prompt-input"
                    placeholder={v.name}
                    value={v.value}
                    autoFocus={i === 0}
                    onChange={(e) => {
                      setVarPrompt((prev) => ({
                        ...prev,
                        variables: prev.variables.map((pv, pi) =>
                          pi === i ? { ...pv, value: e.target.value } : pv
                        ),
                      }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        // Move to next field or insert
                        if (i < varPrompt.variables.length - 1) {
                          e.target.parentNode.nextSibling?.querySelector("input")?.focus();
                        } else {
                          handleVarPromptInsert();
                        }
                      }
                      if (e.key === "Escape") setVarPrompt(null);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setVarPrompt(null)}>Cancel</button>
              <button className="btn-save" onClick={handleVarPromptInsert}>Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteEditor;
