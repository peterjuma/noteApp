# NoteCache — Feature Ideas

> Brainstorm log — 3 April 2026. Ideas for future exploration, grouped by feasibility.

---

## High Fit (reuse existing patterns, minimal new deps)

### 1. Markdown Slide Deck / Presentation Mode

Turn any note into a presentation by splitting on `---` or `## ` headings. Full-screen view with arrow key navigation, speaker notes via `<!-- notes: -->` comments. No new deps — just CSS + keyboard handling. Think Marp / Slidev but built into the editor. The note stays standard Markdown.

- **Integration**: Toolbar button "Present" on note view, or `/slides` slash command
- **Storage**: No extra storage — uses the note's existing content
- **Ref**: https://marp.app/, https://sli.dev/

### 2. Daily Journal / Standup Notes

Auto-created daily note with today's date as title. Configurable template per workspace (e.g., "Yesterday / Today / Blockers" for standups, or freeform journal). Calendar sidebar view showing which days have entries. Notes are regular notes — the journal is just a view filter + auto-creation.

- **Integration**: Sidebar calendar widget, or hamburger menu "Today's Note"
- **Storage**: Regular notes with date-based titles; template stored in workspace settings
- **Ref**: Obsidian Daily Notes, Logseq daily journals

### 3. Code Snippet Vault

A dedicated view (like Table Converter) for storing/searching tagged code snippets. Each snippet has: language, title, code, tags, description. Searchable by language and tag. Copy-to-clipboard. Insert into notes. Stored in the `snippets` store (already exists — extend it). Essentially a developer's personal Gist library that lives inside the app.

- **Integration**: Full-page view from sidebar, slash commands to insert snippets
- **Storage**: Extend existing `snippets` IndexedDB store with language + description fields

### 4. Changelog Generator

Same section-based approach as the README Generator. Sections by version (`## [1.2.0] - 2026-04-03`) with categories (Added, Changed, Fixed, Removed). Follows Keep a Changelog format. Could auto-detect git-style commit messages if pasted in.

- **Integration**: Full-page tool like Table Converter / README Generator
- **Storage**: Saves as a regular note
- **Ref**: https://keepachangelog.com/

### 5. Web Clipper (Bookmarklet)

A small JavaScript bookmarklet that grabs the current page's content, converts to Markdown (we already have Turndown), and sends it to NoteCache. Uses `postMessage` or a shared `localStorage` key. The PWA picks it up on next focus. Zero infrastructure — pure client-side.

- **Integration**: Generate bookmarklet from Settings; import queue on app focus
- **Storage**: Clipped content saved as regular notes
- **Ref**: Notion Web Clipper, Obsidian Web Clipper

---

## Medium Fit (some new patterns, but feasible)

### 6. Kanban Board View

Visualize notes with task lists (`- [ ]` / `- [x]`) as a kanban board. Columns = tags or custom status labels. Drag cards between columns to update the note's tags. Pure UI layer — the underlying notes don't change format. Similar to how Obsidian's Kanban plugin works.

- **Integration**: Toggle from sidebar or command palette; workspace-level view
- **Storage**: No extra storage — reads/writes note tags and task list items
- **Ref**: Obsidian Kanban plugin, Trello

### 7. Note Publishing / Static Site

Export a note (or workspace) as a styled HTML page. Generate a self-contained `.html` file with embedded CSS (GitHub-style). Useful for sharing docs, internal wikis, or personal sites. We already render HTML — just wrap it in a template with `<head>` and styling.

- **Integration**: "Publish" button in note toolbar or Data tab export section
- **Storage**: No extra storage — generates downloadable HTML files
- **Ref**: Bear App publish, Notion public pages

### 8. Flashcard / Spaced Repetition

Parse notes for Q&A patterns (e.g., `Q: What is...` / `A: It is...`, or `## Question` / content). Present as flashcards with flip animation. Track review dates for spaced repetition. Good for learning/study notes. Store review metadata on note objects.

- **Integration**: "Study" button on notes with detected Q&A patterns; full-page flashcard view
- **Storage**: Review metadata (next review date, ease factor) stored on note objects or separate store
- **Ref**: Anki, Obsidian Spaced Repetition plugin

### 9. Writing Analytics Dashboard

Stats view: total notes, total words, notes per workspace, writing streak (days with edits), tag cloud visualization, most-edited notes, storage usage (IndexedDB size). No new storage — computed from existing note data.

- **Integration**: Settings tab or dedicated full-page view from sidebar
- **Storage**: Computed on the fly from notes + versions data
- **Ref**: iA Writer stats, Ulysses writing goals

### 10. Excalidraw-Style Whiteboard

Embed a freehand drawing canvas inside a note. Store drawings as SVG or JSON blobs in the `images` store. Insert via toolbar button. Would require Excalidraw as a dependency (~500KB lazy-loaded), but it's the gold standard for hand-drawn diagrams and pairs beautifully with Mermaid's hand-drawn mode.

- **Integration**: Toolbar button in editor; renders inline in note view
- **Storage**: Drawing data in `images` store (same as uploaded images)
- **Dep**: `@excalidraw/excalidraw` (~500KB, lazy-loaded)
- **Ref**: https://excalidraw.com/, Obsidian Excalidraw plugin

---

## Ambitious (significant new territory)

### 11. AI Assistant Panel

Sidebar panel with LLM integration (OpenAI / Ollama / local). Summarize notes, generate content from prompts, translate, explain code blocks, suggest titles/tags. Uses the user's own API key (like we do with GitHub token). The note content stays local — only the selected text is sent to the API.

- **Integration**: Sidebar panel toggle; context menu "Ask AI" on selected text
- **Storage**: API key in workspace settings (excluded from exports like other credentials)
- **Ref**: Notion AI, Obsidian Copilot

### 12. Live Collaboration (WebRTC)

Real-time co-editing via WebRTC peer connections. No server needed — peers connect directly. Share a session link, collaborator opens it, CRDTs handle conflict resolution. Extremely cool but complex. Could start with read-only sharing (generate a temporary shareable view) as a stepping stone.

- **Integration**: "Share" button → generate session link; collaborator panel
- **Dep**: CRDT library (Yjs or Automerge), WebRTC signaling (could use a free TURN server)
- **Ref**: HackMD, Convergence

### 13. Terminal / Code Runner

Execute fenced code blocks inline using WebAssembly runtimes (Pyodide for Python, QuickJS for JavaScript). Show output below the code block. Turns notes into executable notebooks. Heavy but transformative for developer notes.

- **Integration**: "Run" button on fenced code blocks in note view
- **Dep**: Pyodide (~15MB, lazy), QuickJS (~500KB, lazy)
- **Ref**: Observable, Jupyter notebooks, RunKit

---

## Priority Suggestions

| Quickest wins | Most impactful | Most requested (typical) |
|---------------|---------------|------------------------|
| Slide Deck | Kanban Board | AI Assistant |
| Daily Journal | Writing Dashboard | Web Clipper |
| Web Clipper | Excalidraw | Slide Deck |
| Changelog Gen | AI Assistant | Live Collaboration |
