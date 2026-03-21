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
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import * as noteDB from "./services/notesDB";
import { suggestTags } from "./services/tagSuggester";
import TableConverter from "./TableConverter";
import {
  Bold, Italic, Heading2, Link, ListOrdered, List, Quote, Paperclip, Image,
  Code, Braces, CheckSquare, Table, Strikethrough, Save, X,
  Columns2, Maximize2, Eye, EyeOff, Minus, Sparkles, Check,
} from "lucide-react";

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
  const [autoSave, setAutoSave] = useState(localStorage.getItem("noteapp_autosave") === "true");
  const [editorSuggestions, setEditorSuggestions] = useState([]);
  const [showTableConverter, setShowTableConverter] = useState(false);
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
    const next = !autoSave;
    setAutoSave(next);
    localStorage.setItem("noteapp_autosave", next);
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

  const toolbarItems = [
    { icon: Heading2, command: "heading", tooltip: "Heading", size: 15 },
    { icon: Bold, command: "bold", tooltip: "Bold (Ctrl+B)", size: 15 },
    { icon: Italic, command: "italic", tooltip: "Italic (Ctrl+I)", size: 15 },
    { divider: true },
    { icon: Quote, command: "blockquote", tooltip: "Quote", size: 15 },
    { icon: Code, command: "backticks", tooltip: "Code (Ctrl+E)", size: 15 },
    { icon: Braces, command: "codeblock", tooltip: "Code Block", size: 15 },
    { icon: Link, command: "link", tooltip: "Link (Ctrl+K)", size: 15 },
    { icon: Image, command: "image", tooltip: "Image Link", size: 15 },
    { icon: Paperclip, command: "uploadImage", tooltip: "Attach Image", size: 15 },
    { divider: true },
    { icon: List, command: "ulist", tooltip: "Bullet List", size: 15 },
    { icon: ListOrdered, command: "olist", tooltip: "Numbered List", size: 15 },
    { icon: CheckSquare, command: "tasklist", tooltip: "Task List", size: 15 },
    { divider: true },
    { icon: Table, command: "openTableConverter", tooltip: "Table Converter", size: 15 },
    { icon: Minus, command: "hr", tooltip: "Horizontal Rule", size: 15 },
    { icon: Strikethrough, command: "strike", tooltip: "Strikethrough", size: 15 },
  ];

  // Markdown insertion logic
  const insertMarkdown = useCallback((command) => {
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
      case "codeblock":
        insert = "\n```\n" + (selected || "") + "\n```\n";
        selectFrom = from + 5; selectTo = from + 5 + (selected ? selected.length : 0);
        break;
      case "table":
        insert = "\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n";
        selectFrom = from + insert.length; selectTo = selectFrom;
        break;
      case "hr":
        insert = "\n---\n";
        selectFrom = from + insert.length; selectTo = selectFrom;
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

  // Keep ref in sync for keymap closures
  insertMarkdownRef.current = insertMarkdown;
  const saveFnRef = useRef(null);

  // Create CodeMirror extensions with GitHub-like keyboard shortcuts
  const createExtensions = useCallback((isDark) => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setBodyTxt(update.state.doc.toString());
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
            html2md.keep(["pre", "code"]);
            const pasteData = html2md.turndown(htmlContent);
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
        ".cm-content": { padding: "16px 20px", minHeight: "200px" },
        ".cm-gutters": { display: "none" },
        ".cm-activeLine": { backgroundColor: isDark ? "#1e293b" : "#f8fafc" },
        ".cm-selectionBackground": { backgroundColor: isDark ? "#1e40af44" : "#bfdbfe66" },
        "&.cm-focused .cm-selectionBackground": { backgroundColor: isDark ? "#1e40af66" : "#93c5fd66" },
        ".cm-cursor": { borderLeftColor: isDark ? "#60a5fa" : "#2563eb" },
      }),
    ];
    if (isDark) exts.push(oneDark);
    return exts;
  }, []);

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
    const state = EditorState.create({ doc: docRef.current, extensions: createExtensions(darkMode) });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    // Auto-focus the editor (especially for new notes)
    setTimeout(() => viewRef.current && viewRef.current.focus(), 50);
    return () => {
      if (viewRef.current) {
        docRef.current = viewRef.current.state.doc.toString();
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [darkMode, showPreview, createExtensions, initialBody]);

  // Resolve noteapp-img: references in preview panels
  const previewRef = useRef(null);
  const splitPreviewRef = useRef(null);
  useEffect(() => {
    const resolve = async (container) => {
      if (!container) return;
      const images = container.querySelectorAll('img[src^="noteapp-img:"]');
      for (const img of images) {
        const id = img.getAttribute("src").replace("noteapp-img:", "");
        const url = await noteDB.getImageURL(id);
        if (url) img.src = url;
      }
    };
    if (showPreview && previewRef.current) resolve(previewRef.current);
    if (splitscreen && splitPreviewRef.current) resolve(splitPreviewRef.current);
  }, [bodytxt, showPreview, splitscreen]);

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
            ) : (
              <button
                key={item.command}
                onClick={() => {
                  if (item.command === "uploadImage") imageInputRef.current.click();
                  else if (item.command === "openTableConverter") setShowTableConverter(true);
                  else insertMarkdown(item.command);
                }}
                className={`toolbar-btn ${darkMode ? "toolbar-btn-dark" : ""}`}
                title={item.tooltip}
                aria-label={item.tooltip}
              >
                <item.icon size={item.size} />
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
          {tags.length === 0 && title.trim() && bodytxt.trim() && editorSuggestions.length === 0 && (
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
          <button onClick={(e) => handleSaveBtn(e)} data-action={note.action} className="btn-save">
            <Save size={14} /> {isDirty ? "Save" : "Saved"}
          </button>
          <span className="editor-hint" role="status" aria-live="polite">
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
    </div>
  );
}

export default NoteEditor;
