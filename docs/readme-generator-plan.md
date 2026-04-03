# README Generator — Implementation Plan

> NoteCache feature proposal — drafted 3 April 2026

---

## 1. Overview

A built-in README generator that lets users compose professional README.md files by selecting, ordering, and filling in predefined sections — then outputs clean Markdown ready to copy or save as a note. Follows the same full-page pattern as the Table Converter and the proposed Mermaid Editor.

### Design Principles

- **Section-based authoring**: Users pick sections from a menu, reorder them via drag-and-drop, and fill in each section's content — not freeform typing
- **Markdown-native**: Every section produces standard Markdown. The final output is a complete `.md` file that renders anywhere
- **Follows existing patterns**: Same full-page/modal toggle as Table Converter (`showReadmeGenerator` state in App.js, sidebar hamburger entry)
- **No new dependencies**: Uses the markdown rendering stack already in the app (markdown-it for preview, CodeMirror for raw editing)
- **Saves as notes**: Generated READMEs are saved as regular notes in the current workspace — first-class citizens

---

## 2. Reference Analysis

### readme.so (Primary Reference)

The gold standard for section-based README generation:

| Feature | readme.so | Our Implementation |
|---------|-----------|-------------------|
| Section picker sidebar | ✅ Clickable list, add to README | ✅ Left panel — available sections |
| Section reorder (drag) | ✅ Drag handle on active sections | ✅ Same drag-and-drop (reuse note list DnD) |
| Per-section editor | ✅ Markdown textarea per section | ✅ CodeMirror per-section or inline textarea |
| Live preview | ✅ Right panel rendered Markdown | ✅ Right panel using existing md2html renderer |
| Reset all | ✅ Reset button | ✅ Reset to defaults |
| Section templates | ✅ Pre-filled boilerplate text | ✅ Contextual defaults per section type |
| Custom sections | ✅ "Custom Section" button | ✅ Free-text heading + body |
| GitHub Profile sections | ✅ About Me, Skills, Links, etc. | ✅ Same set + NoteCache-specific additions |
| Copy/download output | ✅ Copy raw markdown | ✅ Copy + save as note + download .md |
| Dark mode | ❌ Light only | ✅ Full dark mode (inherits app theme) |

### makeareadme.com (Content Reference)

Best practices and standard sections:

- Name, Description, Badges, Visuals, Installation, Usage, Support, Roadmap, Contributing, Authors, License, Project Status
- Emphasis on "every project is different — pick what applies"
- Helpful suggestions per section (what to write, why it matters)

### profile-readme-generator.com (Profile README Reference)

GitHub Profile README specifics:

- Introduction/greeting, About Me, Skills (with badge icons), Links (social), Stats widgets, Top Languages widget
- These are special because they use shields.io badges and GitHub stats APIs

---

## 3. Architecture & Integration

### 3.1 Component Structure

```
src/
  ReadmeGenerator.js         — Main generator component (new file)
```

No new services needed — the output is a Markdown string saved as a regular note via existing `db.addNote()`.

### 3.2 Integration with App.js (Table Converter Pattern)

```javascript
// App.js state
showReadmeGenerator: false,

// Toggle handler (with nav guard for unsaved edits)
handleToggleReadmeGenerator() {
  if (this.state.activepage === "editnote") {
    this.setState({ showNavConfirm: true, pendingPage: "readmeGenerator" });
    return;
  }
  this.setState((s) => ({
    showReadmeGenerator: !s.showReadmeGenerator,
    showSettings: false,
    showTableConverter: false,
    showMermaidEditor: false,
  }));
}

// Render
{this.state.showReadmeGenerator ? (
  <ReadmeGenerator
    fullPage
    darkMode={this.state.darkMode}
    activeDb={this.state.activeDb}
    onClose={() => this.setState({ showReadmeGenerator: false })}
    onSaveAsNote={(title, body) => { /* create note from README */ }}
  />
) : ...}
```

### 3.3 Sidebar Entry

```javascript
// NavbarSidebar.js — hamburger menu
<button onClick={() => { closeHamburger(); props.onOpenReadmeGenerator(); }}>
  <FileText size={15} />
  <span>{props.showReadmeGenerator ? "Back to Notes" : "README Generator"}</span>
</button>
```

### 3.4 NoteEditor Integration

Optionally accessible from the editor as a slash command:
```javascript
{ id: "readme", label: "README Template", icon: FileText, description: "Generate a README" }
```

---

## 4. UI Layout

### 4.1 Three-Panel Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Toolbar: [Reset] [Copy Markdown] [Download .md] [Save as Note]   │
├───────────────┬──────────────────────┬───────────────────────────┤
│               │                      │                           │
│  SECTIONS     │  EDITOR              │  PREVIEW                  │
│  (Sidebar)    │  (Per-section edit)  │  (Rendered Markdown)      │
│               │                      │                           │
│  ┌──────────┐ │  # Project Title     │  ┌─────────────────────┐  │
│  │ ✓ Title  │ │  ────────────────    │  │ # My Project        │  │
│  │ ✓ Desc   │ │  A brief desc...    │  │                     │  │
│  │ ✓ Badges │ │                      │  │ A brief desc of     │  │
│  │   Install │ │  ## Installation    │  │ what this does...   │  │
│  │   Usage   │ │  ────────────────    │  │                     │  │
│  │   API     │ │  ```bash            │  │ ## Installation     │  │
│  │   Contrib │ │  npm install foo    │  │                     │  │
│  │   License │ │  ```                │  │ ```bash             │  │
│  │   ...     │ │                      │  │ npm install foo     │  │
│  └──────────┘ │                      │  │ ```                 │  │
│               │                      │  └─────────────────────┘  │
│  + Custom     │                      │                           │
│    Section    │                      │                           │
├───────────────┴──────────────────────┴───────────────────────────┤
│ Status: 8 sections · 1,245 chars · Project README                │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 On Smaller Screens

The three-panel collapses to two panels (sections + editor) with a preview toggle button, matching the editor's existing split/preview pattern.

### 4.3 Section Sidebar Behavior

**Active sections** (top): Checked, draggable, reorderable. These compose the final README.
**Available sections** (bottom): Unchecked. Click to add to active list with default content.

Each active section has:
- Drag handle (reorder)
- Section name
- Remove button (moves back to available)

---

## 5. Section Catalog

### 5.1 Project README Sections

| Section | Default Heading | Default Content | Category |
|---------|----------------|-----------------|----------|
| Title & Description | `# Project Title` | "A brief description of what this project does and who it's for" | Core |
| Badges | *(no heading)* | `![MIT License](https://img.shields.io/badge/License-MIT-green.svg)` | Core |
| Logo | *(no heading)* | `<div align="center"><img src="logo.png" alt="Logo" width="80"></div>` | Core |
| Screenshots | `## Screenshots` | `![App Screenshot](https://via.placeholder.com/468x300)` | Visual |
| Demo | `## Demo` | "Insert gif or link to demo" | Visual |
| Features | `## Features` | "- Light/dark mode toggle\n- Live previews\n- Cross platform" | Core |
| Tech Stack | `## Tech Stack` | "**Client:** React, TailwindCSS\n**Server:** Node, Express" | Technical |
| Installation | `## Installation` | "Install my-project with npm\n```bash\nnpm install my-project\ncd my-project\n```" | Setup |
| Run Locally | `## Run Locally` | Step-by-step clone + install + start commands | Setup |
| Environment Variables | `## Environment Variables` | "To run this project, add the following to your `.env` file\n`API_KEY`\n`DB_HOST`" | Setup |
| Usage/Examples | `## Usage/Examples` | Code block with import and usage example | Documentation |
| API Reference | `## API Reference` | Table with endpoint, method, params, description | Documentation |
| Deployment | `## Deployment` | "To deploy this project run\n```bash\nnpm run deploy\n```" | Operations |
| Running Tests | `## Running Tests` | "To run tests, run the following command\n```bash\nnpm run test\n```" | Operations |
| Contributing | `## Contributing` | "Contributions are always welcome!\nSee `contributing.md` for ways to get started." | Community |
| FAQ | `## FAQ` | "#### Question 1\nAnswer 1\n\n#### Question 2\nAnswer 2" | Community |
| Roadmap | `## Roadmap` | "- [x] Phase 1\n- [ ] Phase 2\n- [ ] Phase 3" | Community |
| Support | `## Support` | "For support, email fake@fake.com or join our Slack channel." | Community |
| Feedback | `## Feedback` | "If you have any feedback, please reach out to us at fake@fake.com" | Community |
| Authors | `## Authors` | "- [@username](https://www.github.com/username)" | Community |
| Acknowledgements | `## Acknowledgements` | "- [Awesome README](https://github.com/matiassingers/awesome-readme)" | Community |
| License | `## License` | "[MIT](https://choosealicense.com/licenses/mit/)" | Legal |
| Appendix | `## Appendix` | "Any additional information goes here" | Other |
| Related Projects | `## Related` | "- [Related Project 1](https://link)\n- [Related Project 2](https://link)" | Other |
| Lessons Learned | `## Lessons Learned` | "What did you learn while building this project?" | Other |
| Optimizations | `## Optimizations` | "What optimizations did you make in your code?" | Other |
| Color Reference | `## Color Reference` | Table with color name, hex, preview | Other |
| Custom Section | `## Custom` | *(empty — user fills in)* | Custom |

### 5.2 GitHub Profile README Sections

A separate mode/preset for GitHub profile READMEs:

| Section | Default Content |
|---------|----------------|
| Introduction | "👋 Hi, I'm @username — a developer passionate about..." |
| About Me | "🔭 I'm currently working on...\n🌱 I'm currently learning..." |
| Skills | Shields.io badge grid: JavaScript, Python, React, etc. |
| Links | Social icons: GitHub, LinkedIn, Twitter, Portfolio |
| GitHub Stats | `![Stats](https://github-readme-stats.vercel.app/api?username=...)` |
| Top Languages | `![Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=...)` |
| Streak Stats | `![Streak](https://github-readme-streak-stats.herokuapp.com/?user=...)` |

### 5.3 Badges Library

A built-in badge browser for common shields.io badges:

```javascript
const BADGE_CATEGORIES = {
  license: [
    { label: "MIT", url: "https://img.shields.io/badge/License-MIT-green.svg" },
    { label: "Apache 2.0", url: "https://img.shields.io/badge/License-Apache_2.0-blue.svg" },
    { label: "GPL v3", url: "https://img.shields.io/badge/License-GPLv3-blue.svg" },
  ],
  tech: [
    { label: "React", url: "https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react" },
    { label: "Node.js", url: "https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js" },
    // ... 50+ common tech badges
  ],
  status: [
    { label: "Build Passing", url: "https://img.shields.io/badge/build-passing-brightgreen" },
    { label: "Tests", url: "https://img.shields.io/badge/tests-42%20passed-success" },
  ],
};
```

---

## 6. Data Flow

### 6.1 No Separate Storage

READMEs are NOT stored in a separate DB or store. They are composed in the generator and then:

1. **Saved as a regular note** — title "README" (or user-specified), body is the generated Markdown
2. **Copied to clipboard** — user pastes into their repository
3. **Downloaded as `.md` file** — direct file save

This keeps the architecture minimal. The generator is a **composition tool**, not a persistence layer.

### 6.2 Pre-fill from Existing Note

If the user has a note titled "README" in the current workspace, the generator can offer to load its sections for editing:

```javascript
// On open, check for existing README note
const existing = allNotes.find(n =>
  n.title.toLowerCase() === "readme" ||
  n.title.toLowerCase() === "readme.md"
);
if (existing) {
  // Parse sections from existing markdown
  // Offer: "Edit existing README?" or "Start fresh?"
}
```

### 6.3 Section Parsing (Import Existing README)

Parse an existing Markdown file into sections by splitting on `## ` headings:

```javascript
function parseReadmeSections(markdown) {
  const sections = [];
  const lines = markdown.split("\n");
  let current = null;

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);

    if (h1Match && !current) {
      current = { heading: h1Match[1], level: 1, body: "" };
    } else if (h2Match) {
      if (current) sections.push(current);
      current = { heading: h2Match[1], level: 2, body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}
```

---

## 7. Features by Phase

### Phase 1: Core Generator (MVP)

- [ ] `ReadmeGenerator.js` component with three-panel layout
- [ ] Section catalog (25+ project sections)
- [ ] Click to add/remove sections
- [ ] Drag-and-drop section reordering
- [ ] Per-section textarea editor with default content
- [ ] Live Markdown preview (right panel, using existing md2html)
- [ ] "Copy Markdown" button — full README to clipboard
- [ ] "Download .md" button — save as file
- [ ] "Save as Note" button — creates a note in current workspace
- [ ] "Reset" button — clear all sections to defaults
- [ ] Custom section support (user-defined heading + body)
- [ ] Sidebar integration — hamburger menu toggle
- [ ] Dark mode support (inherits app theme)
- [ ] Status bar: section count, character count
- [ ] Responsive: collapse to two-panel on narrow screens

### Phase 2: Enhanced Editor

- [ ] GitHub Profile README mode (separate section set)
- [ ] Badge browser/picker (shields.io integration)
- [ ] Per-section CodeMirror editor (instead of plain textarea)
- [ ] Section categories with collapsible groups in picker
- [ ] Import existing README — parse into editable sections
- [ ] Pre-fill from existing "README" note in workspace
- [ ] Section help tooltips (what to write, why it matters)
- [ ] Preset configurations: "Minimal", "Full", "Library", "CLI Tool", "API"
- [ ] Slash command integration: `/readme` opens the generator
- [ ] Table of Contents section — auto-generated from active section headings

### Phase 3: Advanced Features

- [ ] GitHub Stats integration — fetch live stats for profile READMEs
- [ ] Badge autocomplete — type technology name, get shield URL
- [ ] README templates saved as snippets (category: "readme")
- [ ] Share preset — export/import section configurations
- [ ] AI-powered section suggestions based on project description
- [ ] Multi-file generation — README + CONTRIBUTING + CHANGELOG

---

## 8. Technical Considerations

### 8.1 Markdown Assembly

```javascript
function assembleReadme(sections) {
  return sections
    .filter(s => s.active)
    .map(s => {
      if (s.level === 1) return `# ${s.heading}\n\n${s.body.trim()}`;
      return `## ${s.heading}\n\n${s.body.trim()}`;
    })
    .join("\n\n");
}
```

### 8.2 Section State Structure

```javascript
const [sections, setSections] = useState([
  {
    id: "title",
    heading: "Project Title",
    level: 1,
    body: "A brief description...",
    active: true,          // In the active list
    order: 0,              // Sort position
    category: "core",
    removable: true,       // Can be removed from active
    custom: false,         // Not a user-created section
  },
  // ...
]);
```

### 8.3 Drag-and-Drop Reorder

Reuse the same HTML5 drag-and-drop approach used in the note list (NoteList.js):

```javascript
// Same pattern as note list DnD
onDragStart={(e) => { e.dataTransfer.setData("text/plain", section.id); }}
onDragOver={(e) => e.preventDefault()}
onDrop={(e) => { reorderSection(draggedId, dropTargetId); }}
```

### 8.4 Preview Rendering

```javascript
// Reuse existing markdown renderer
import { md2html } from "./useMarkDown";

const previewHtml = useMemo(() => {
  const markdown = assembleReadme(sections);
  return DOMPurify.sanitize(md2html.render(markdown));
}, [sections]);
```

### 8.5 Save as Note

```javascript
const handleSaveAsNote = async () => {
  const markdown = assembleReadme(sections);
  const title = sections.find(s => s.level === 1)?.heading || "README";
  const newNote = {
    noteid: Date.now().toString(),
    title,
    body: markdown,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  await db.addNote(newNote, activeDb);
  // Notify parent to refresh note list
  onSaveAsNote(title, markdown);
};
```

### 8.6 Performance

- Component lazy-loaded via `React.lazy()` — zero cost until opened
- Preview rendering debounced (same 300ms pattern as Mermaid Editor)
- No additional library dependencies

### 8.7 Impact on Bundle Size

- No new dependencies
- Single new component file (~300-400 lines for Phase 1)
- Section catalog is static data (~2-3 KB)
- Lazy-loaded — no bundle impact until first use
- Estimated: ~3-5 KB gzipped

---

## 9. Open Questions for Review

1. **Three-panel vs two-panel**: readme.so uses two panels (editor + preview). Three panels (sections + editor + preview) gives a clearer UX but may feel crowded on smaller screens. Should the section picker be a collapsible sidebar or a modal?

2. **Section editor type**: Plain textarea (simple, fast) vs CodeMirror (consistent with rest of app, syntax highlighting). Phase 1 could use textarea and upgrade to CodeMirror in Phase 2.

3. **Profile README mode**: Should the GitHub Profile mode be a separate tool/view or a toggle within the same generator? Profile READMEs have very different sections than project READMEs.

4. **Badge picker complexity**: A full shields.io badge browser is a significant sub-feature. Should it be Phase 1 (with a curated list of 50-100 common badges) or Phase 2 (with search/category filtering)?

5. **Presets vs blank slate**: Should the generator open empty (user picks sections) or pre-filled with a common set (Title, Description, Installation, Usage, License)? readme.so starts with just Title + Description.

6. **Relationship to existing README note**: If a "README" note exists, should the generator offer to edit it? Or always create a new composition? Editing raises concerns about section parsing accuracy.

---

## 10. Comparison with Existing Tools

| Feature | readme.so | makeareadme.com | profile-readme-gen | Our Implementation |
|---------|-----------|----------------|-------------------|-------------------|
| Section-based editor | ✅ | ❌ (single editor) | ✅ | ✅ |
| Drag-and-drop reorder | ✅ | ❌ | ✅ | ✅ |
| Live preview | ❌ (copy to see) | ✅ (side-by-side) | ✅ | ✅ |
| Dark mode | ❌ | ❌ | ❌ | ✅ |
| Offline capable | ❌ | ❌ | ❌ | ✅ (PWA) |
| Save locally | ❌ | ❌ | ❌ | ✅ (as notes) |
| Badge picker | ❌ | ❌ | ✅ (tech skills) | ✅ (Phase 2) |
| Profile README mode | ❌ | ❌ | ✅ | ✅ (Phase 2) |
| Custom sections | ✅ | ❌ | ❌ | ✅ |
| Import existing | ❌ | ❌ | ❌ | ✅ (Phase 2) |
| Workspace integration | ❌ | ❌ | ❌ | ✅ (saves as note) |

---

## 11. Estimated Scope

| Phase | Files Changed/Added | Estimated Items |
|-------|-------------------|-----------------|
| Phase 1 (MVP) | `ReadmeGenerator.js` (new, ~400 lines), `App.js` (state + toggle), `NavbarSidebar.js` (menu entry), `styles.css` (generator CSS) | 15 items |
| Phase 2 | `ReadmeGenerator.js` (enhancements), `NoteEditor.js` (slash command) | 10 items |
| Phase 3 | `ReadmeGenerator.js` (AI, multi-file) | 6 items |

---

## 12. References

- **readme.so**: https://readme.so/ — Section-based README editor (primary UX reference)
- **makeareadme.com**: https://www.makeareadme.com/ — Best practices and section suggestions
- **profile-readme-generator.com**: https://profile-readme-generator.com/ — GitHub Profile README generator
- **shields.io**: https://shields.io/ — Badge generation service
- **github-readme-stats**: https://github.com/anuraghazra/github-readme-stats — GitHub stats widgets
- **Awesome README**: https://github.com/matiassingers/awesome-readme — Curated list of great READMEs
- **choosealicense.com**: https://choosealicense.com/ — License picker
- **Existing pattern**: `TableConverter.js` — full-page/modal, sidebar toggle, same integration approach
