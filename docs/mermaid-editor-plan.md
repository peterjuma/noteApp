# Mermaid Editor — Implementation Plan

> NoteCache feature proposal — drafted 3 April 2026

---

## 1. Overview

A dedicated Mermaid diagram editor that mirrors how the Table Converter works — a full-page tool accessible from the sidebar with live code editing and real-time SVG preview. Users can create, edit, save, and reuse diagrams. Saved diagrams can be inserted into any note as standard mermaid code blocks.

### Design Principles

- **Follow existing patterns**: Same full-page/modal toggle as Table Converter (`showMermaidEditor` state, sidebar hamburger toggle, `fullPage` prop)
- **No new dependencies**: Mermaid 11.13.0 is already installed and lazy-loaded in NoteMain.js
- **Storage in existing DB**: Diagrams stored in a new `diagrams` object store within each workspace's IndexedDB (not a separate database)
- **First-class CodeMirror integration**: The code editor panel reuses the same CodeMirror 6 stack already in NoteEditor.js
- **Markdown interoperability**: Diagrams are always standard ` ```mermaid ` code blocks — portable and renderable everywhere

---

## 2. Reference: Mermaid Live Editor (mermaid.live)

The official Mermaid Live Editor provides the benchmark UX:

| Feature | mermaid.live | Our Implementation |
|---------|-------------|-------------------|
| Split-pane code + preview | ✅ Monaco editor + SVG | ✅ CodeMirror 6 + SVG (same stack) |
| Real-time rendering | ✅ On every keystroke | ✅ Debounced (300ms) for performance |
| Syntax error display | ✅ Red error banner | ✅ Error message below preview |
| Theme selector | ✅ default/dark/forest/neutral | ✅ Dropdown in toolbar |
| Export SVG/PNG | ✅ Download buttons | ✅ SVG download + copy to clipboard |
| Shareable links | ✅ Base64 URL encoding | ❌ Not needed (local-first app) |
| Config panel (YAML) | ✅ JSON editor | ⚠️ Phase 2 — frontmatter config only initially |
| Pan/zoom on preview | ✅ | ⚠️ Phase 2 — CSS overflow-auto initially |
| Diagram auto-detection | ✅ `mermaid.detectType()` | ✅ Use same API for type badge |

---

## 3. Architecture & Integration Points

### 3.1 How It Fits In (Following Table Converter Pattern)

```
App.js state:
  showMermaidEditor: false     // Toggle (same pattern as showTableConverter)

Sidebar hamburger menu:
  [Mermaid Editor] button      // New entry (same as Table Converter entry)
  → toggles showMermaidEditor

Main content area:
  showMermaidEditor ?
    <MermaidEditor fullPage darkMode onClose />
  : showTableConverter ?
    <TableConverter ... />
  : showSettings ?
    <SettingsPanel ... />
  : <NoteMain ... /> or <NoteEditor ... />

NavbarSidebar:
  sidebarTitle = showMermaidEditor ? "Diagrams" : ...
  isPageActive includes showMermaidEditor
```

### 3.2 Component Structure

```
src/
  MermaidEditor.js          — Main editor component (new file)
  services/
    notesDB.js              — Add diagrams store (upgrade DB_VERSION to 7)
```

### 3.3 State in App.js

```javascript
// New state
showMermaidEditor: false,

// New handlers
handleToggleMermaidEditor()     // Toggle with nav guard (same as table converter)

// Props to NavbarSidebar
showMermaidEditor={this.state.showMermaidEditor}
onOpenMermaidEditor={this.handleToggleMermaidEditor}

// Props to MermaidEditor
<MermaidEditor
  fullPage
  darkMode={this.state.darkMode}
  activeDb={this.state.activeDb}
  onClose={() => this.setState({ showMermaidEditor: false })}
  onInsertIntoNote={(mermaidCode) => { /* insert into current note */ }}
/>
```

---

## 4. Storage Design

### 4.1 Decision: Same Workspace DB, New Store

**Why not a separate DB?**
- Diagrams are workspace-scoped (a "Work" diagram belongs to the "Work" workspace)
- Existing export/import/purge functions operate on workspace DBs — adding a store means diagrams are automatically included in backups
- Existing patterns: notes, snippets, tags, versions all live in the same DB

**Why not store in notes?**
- Diagrams are a different entity with different metadata (diagram type, rendered SVG cache)
- Keeping them separate allows a dedicated list/gallery view
- Notes reference diagrams by inserting the mermaid code block — the code block is self-contained

### 4.2 IndexedDB Schema Addition

```javascript
// DB_VERSION 7 upgrade in notesDB.js
if (!db.objectStoreNames.contains("diagrams")) {
  const store = db.createObjectStore("diagrams", { keyPath: "id" });
  store.createIndex("type", "type");
  store.createIndex("updated_at", "updated_at");
}
```

### 4.3 Diagram Object Structure

```javascript
{
  id: "diag_1712166000000_a1b2c3",   // Unique ID
  title: "User Login Flow",           // User-given name
  type: "flowchart",                  // Auto-detected via mermaid.detectType()
  code: "flowchart TD\n  A[Start] --> B{Login?}\n  ...",  // Raw mermaid source
  svgCache: "<svg>...</svg>",         // Last rendered SVG (for gallery thumbnails)
  created_at: 1712166000000,
  updated_at: 1712166000000,
}
```

### 4.4 DB Functions (notesDB.js)

```javascript
// CRUD operations
export async function getAllDiagrams(dbName)
export async function getDiagram(id, dbName)
export async function saveDiagram(diagram, dbName)    // put (upsert)
export async function deleteDiagram(id, dbName)

// Already handled by existing export/import if store is in the workspace DB
// exportWorkspaceData() and importWorkspaceData() will need updating to include diagrams
```

---

## 5. UI Layout

### 5.1 Full-Page Mode (Primary)

```
┌─────────────────────────────────────────────────────┐
│ Toolbar: [New] [Theme ▾] [Export SVG] [Copy] [Insert into Note] │
├────────────────────────┬────────────────────────────┤
│                        │                            │
│   Code Editor          │   Live Preview             │
│   (CodeMirror 6)       │   (Rendered SVG)           │
│                        │                            │
│   mermaid syntax       │   ┌──────────────┐         │
│   with highlighting    │   │  Diagram     │         │
│                        │   │  renders     │         │
│                        │   │  here        │         │
│                        │   └──────────────┘         │
│                        │                            │
│                        │   Error: (if syntax bad)   │
├────────────────────────┴────────────────────────────┤
│ Status: Flowchart · 245 chars · Last saved 2m ago    │
└─────────────────────────────────────────────────────┘
```

### 5.2 Sidebar Becomes Diagram List (When Editor Active)

When `showMermaidEditor` is true, the sidebar shows saved diagrams instead of notes:

```
┌──────────────────┐
│ ☰  Diagrams   +  │   ← Sidebar header (same pattern as "Notes"/"Settings")
├──────────────────┤
│ 🔍 Search...     │   ← Filter saved diagrams
├──────────────────┤
│ ┌──────────────┐ │
│ │ User Login   │ │   ← Saved diagram item (title + type badge + thumbnail)
│ │ flowchart    │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │ DB Schema    │ │
│ │ erDiagram    │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │ Sprint Plan  │ │
│ │ gantt        │ │
│ └──────────────┘ │
└──────────────────┘
```

Clicking a saved diagram loads it into the editor. This mirrors how clicking a note in the sidebar loads it into the note viewer.

### 5.3 Modal Mode (From Editor)

When inserting a diagram while editing a note, a modal overlay opens (same as Table Converter modal in NoteEditor):

```javascript
// NoteEditor.js — triggered from toolbar diagram picker or slash command
{showMermaidModal && (
  <MermaidEditor
    darkMode={darkMode}
    activeDb={props.activeDb}
    initialCode={existingMermaidBlock || ""}
    onClose={() => setShowMermaidModal(false)}
    onInsert={(code) => {
      insertMarkdown("codeblock", "mermaid\n" + code);
      setShowMermaidModal(false);
    }}
  />
)}
```

---

## 6. Diagram Templates

### 6.1 Built-in Starter Templates

Provide templates for common diagram types. These are NOT stored in the DB — they're hardcoded constants similar to `SLASH_COMMANDS` in NoteEditor.js.

| Template | Type | Use Case |
|----------|------|----------|
| Basic Flowchart | flowchart | Decision flows, process maps |
| Sequence Diagram | sequenceDiagram | API calls, user interactions |
| Class Diagram | classDiagram | OOP architecture, data models |
| State Machine | stateDiagram-v2 | UI states, workflow states |
| ER Diagram | erDiagram | Database schemas, data relationships |
| Gantt Chart | gantt | Project timelines, sprint planning |
| Pie Chart | pie | Data distribution, metrics |
| Mindmap | mindmap | Brainstorming, topic exploration |
| Git Graph | gitGraph | Branch strategies, release flows |
| User Journey | journey | UX flows, customer experience |
| Architecture | architecture | System architecture, infrastructure |
| Kanban Board | kanban | Task tracking, workflow boards |
| Timeline | timeline | Historical events, roadmaps |
| Quadrant Chart | quadrantChart | Priority matrices, skill mapping |
| Sankey Diagram | sankey | Flow quantities, budget allocation |
| XY Chart | xychart-beta | Data visualization, trends |

### 6.2 User-Created Templates

Users can save any diagram as a template:
- "Save as Template" button in toolbar
- Templates appear in the "New Diagram" dropdown
- Stored in existing `snippets` store with `category: "diagram"`
- Appear in slash commands as `/flowchart-template`, `/sequence-template`, etc.

---

## 7. Features by Phase

### Phase 1: Core Editor (MVP)

- [ ] `MermaidEditor.js` component with split-pane layout
- [ ] CodeMirror 6 editor panel with mermaid syntax
- [ ] Real-time SVG preview (debounced 300ms)
- [ ] Error display when syntax is invalid (`mermaid.parse()` for validation)
- [ ] Theme selector dropdown (default, dark, forest, neutral)
- [ ] New `diagrams` store in workspace DB (version 7)
- [ ] CRUD: save/load/delete diagrams
- [ ] Sidebar integration — toggle from hamburger menu
- [ ] Sidebar shows diagram list when editor is active
- [ ] "Insert into Note" — copies ` ```mermaid...``` ` block to clipboard or inserts at cursor
- [ ] Export SVG download button
- [ ] Export PNG button (via canvas conversion)
- [ ] Built-in starter templates (16 diagram types)
- [ ] Auto-detect diagram type badge (`mermaid.detectType()`)
- [ ] Dark mode support (including mermaid theme auto-switch)
- [ ] Update `exportWorkspaceData` / `importWorkspaceData` to include diagrams
- [ ] Status bar: diagram type, character count, last saved timestamp

### Phase 2: Enhanced Editor

- [ ] Syntax highlighting for mermaid in CodeMirror (custom language mode or grammar)
- [ ] Copy diagram as PNG to clipboard (for pasting into Slack, email, etc.)
- [ ] Pan and zoom on SVG preview
- [ ] Resizable split pane (drag divider, persist ratio)
- [ ] Config panel — edit mermaid config via YAML/JSON (theme, layout, look)
- [ ] Hand-drawn look toggle (` config: { look: handDrawn } `)
- [ ] ELK layout support (requires extra import)
- [ ] Diagram search/filter in sidebar by title or type
- [ ] "Save as Template" for custom reusable diagram templates
- [ ] Diagram templates in slash commands (`/flowchart`, `/sequence`, etc.)
- [ ] Keyboard shortcuts (Cmd+S save, Cmd+Enter render, Cmd+Shift+C copy SVG)
- [ ] Fullscreen preview mode (hide editor, show diagram only)

### Phase 3: Advanced Features

- [ ] Diagram version history (reuse existing versions store)
- [ ] Diagram linking — `[[diagram:User Login Flow]]` syntax in notes
- [ ] Inline diagram editing — click rendered diagram in note view to open in editor
- [ ] Diff view — compare two saved versions side by side
- [ ] Collaboration — sync diagrams via Gist (extend gistSync payload)
- [ ] Gallery view — grid of rendered SVG thumbnails

---

## 8. Technical Considerations

### 8.1 Mermaid API Usage

```javascript
// Already lazy-loaded in NoteMain.js — reuse same pattern
let mermaidModule = null;
async function getMermaid() {
  if (!mermaidModule) {
    const m = await import("mermaid");
    mermaidModule = m.default;
    mermaidModule.initialize({ startOnLoad: false, theme: "default" });
  }
  return mermaidModule;
}

// Render with error handling
async function renderDiagram(code, id) {
  const mermaid = await getMermaid();
  try {
    await mermaid.parse(code);                    // Validate first
    const { svg } = await mermaid.render(id, code);
    return { svg, error: null };
  } catch (err) {
    return { svg: null, error: err.message || "Invalid syntax" };
  }
}

// Detect diagram type
async function detectType(code) {
  const mermaid = await getMermaid();
  try {
    return mermaid.detectType(code);  // Returns "flowchart", "sequence", etc.
  } catch {
    return "unknown";
  }
}
```

### 8.2 CodeMirror Setup for Mermaid Code

```javascript
// Reuse existing CodeMirror stack from NoteEditor
// No mermaid-specific language mode exists for CM6 — use plain text initially
// Phase 2 could add a custom StreamLanguage for basic keyword highlighting
const extensions = [
  EditorView.lineWrapping,
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  placeholder("Start typing a mermaid diagram..."),
  EditorView.updateListener.of((update) => {
    if (update.docChanged) onCodeChange(update.state.doc.toString());
  }),
];
```

### 8.3 SVG Export

```javascript
// SVG download
function downloadSVG(svg, filename) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  saveAs(blob, filename);
}

// PNG conversion via canvas
async function svgToPNG(svgString) {
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svgBlob);
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * 2;   // 2x for retina
      canvas.height = img.naturalHeight * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, "image/png");
    };
    img.onerror = reject;
    img.src = url;
  });
}
```

### 8.4 Performance

- Lazy-load `MermaidEditor.js` via `React.lazy()` + `Suspense` (same as SettingsPanel, VersionHistory)
- Debounce rendering: only re-render SVG after 300ms of no typing
- Cache the last rendered SVG in state to avoid re-rendering on tab switches
- Store `svgCache` in the diagram record so the sidebar gallery can show thumbnails without re-rendering
- Mermaid module is already lazy-loaded (only imported on first use)

### 8.5 Security

- All rendered SVG is sanitized via `DOMPurify.sanitize(svg, { ADD_TAGS: ["foreignObject"], ADD_ATTR: ["requiredExtensions"] })` — same as current NoteMain.js implementation
- User-provided diagram code is never executed — mermaid renders to SVG only
- `securityLevel: "strict"` (default) — HTML tags encoded, click functionality disabled

### 8.6 Impact on Bundle Size

- No new dependencies — mermaid is already installed and lazy-loaded
- CodeMirror is already in the bundle for NoteEditor
- MermaidEditor.js will be code-split via `React.lazy()` — zero cost until first use
- Estimated added bundle: ~5-8 KB gzipped (the component + diagram templates)

---

## 9. How Diagrams Flow Through the System

```
User creates diagram in Mermaid Editor
  → Saved to IndexedDB `diagrams` store in current workspace
  → SVG cache stored for quick thumbnail/gallery display

User clicks "Insert into Note"
  → Copies ```mermaid\n{code}\n``` to clipboard or inserts at cursor in active note
  → The note now contains standard mermaid code block
  → NoteMain.js renders it on view (existing functionality)

User opens backup/export
  → exportWorkspaceData() includes `diagrams` store
  → importWorkspaceData() restores them

User opens a note containing ```mermaid``` block and clicks diagram
  → Phase 3: Opens MermaidEditor with that code pre-loaded for editing
```

---

## 10. Open Questions for Review

1. **Sidebar behavior**: Should the sidebar list diagrams only when the editor is active? Or add a persistent "Diagrams" section/tab? The Table Converter doesn't use the sidebar for its content, but diagrams have a natural list/gallery UX.

2. **Naming**: "Mermaid Editor" vs "Diagram Editor" vs "Diagram Studio"? Since we also support PlantUML in notes, "Diagram Editor" might be more future-proof if we ever add PlantUML editing.

3. **Template storage**: Diagram templates as snippets (`category: "diagram"`) makes them appear in slash commands automatically. But should they be a separate concept? Snippets are text templates; diagram templates are visual. Could feel confused if mixed in the Templates settings tab.

4. **Gallery view priority**: The sidebar list is Phase 1. A grid gallery with SVG thumbnails is Phase 3. Is the gallery important enough to be Phase 1?

5. **Inline editing**: When viewing a rendered diagram in a note, should clicking it open the Mermaid Editor automatically? Or require an explicit "Edit Diagram" button? The former is more seamless but requires tracking which fenced block was clicked.

6. **PlantUML support**: Should the editor also support PlantUML (which currently renders via an external server)? Adding a second rendering backend increases complexity but makes the editor a true "Diagram Editor."

---

## 11. Estimated Scope

| Phase | Files Changed/Added | Estimated Items |
|-------|-------------------|-----------------|
| Phase 1 (MVP) | `MermaidEditor.js` (new, ~400-500 lines), `notesDB.js` (schema + CRUD), `App.js` (state + toggle), `NavbarSidebar.js` (menu entry + diagram list), `styles.css` (editor CSS), `NoteEditor.js` (modal + toolbar) | 16 items |
| Phase 2 | `MermaidEditor.js` (enhancements), `NoteEditor.js` (slash commands), `SettingsPanel.js` (template management) | 12 items |
| Phase 3 | `NoteMain.js` (inline click-to-edit), `gistSync.js` (diagram sync), `MermaidEditor.js` (diff view) | 6 items |

---

## 12. References

- **Mermaid.js docs**: https://mermaid.js.org/
- **Mermaid Live Editor**: https://mermaid.live/edit
- **Mermaid API (render, parse, detectType)**: https://mermaid.js.org/config/usage.html
- **Mermaid theming**: https://mermaid.js.org/config/theming.html
- **Mermaid diagram types**: 25+ types including flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline, gitgraph, sankey, architecture, kanban, radar, treemap, venn, and more
- **Our mermaid version**: 11.13.0 (already installed)
- **Existing pattern**: `TableConverter.js` — full-page/modal, `showTableConverter` toggle, sidebar integration
