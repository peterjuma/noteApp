# NoteApp — Project Analysis & Baseline

**Date:** 20 March 2026  
**Deployed at:** https://apps.peterjuma.com/noteApp  
**Stack:** React 17.0.1 (class component + hooks), IndexedDB (via `idb`), GitHub Pages  

---

## 1. Project Overview

NoteApp is a serverless, client-side Markdown note-taking app. Notes are stored in the browser's IndexedDB. Key features include:

- Create / Edit / Delete notes with Markdown support
- Split-screen live preview while editing
- Syntax highlighting for code blocks (highlight.js)
- Note pinning (up to 10 pinned notes)
- Sort by title, created date, or modified date
- Search notes (by title or body)
- Download individual notes as `.md` files
- Bulk backup/download as ZIP
- Upload `.md` files as new notes
- Copy code block buttons, auto-close brackets/quotes
- Dark/light editor theme toggle
- GFM task lists, tables, emoji support

---

## 2. Architecture & Code Structure

| File | Role | Pattern |
|------|------|---------|
| `App.js` (~720 lines) | Root component, all state & business logic | Class component |
| `NoteEditor.js` (~530 lines) | Markdown editor with toolbar, preview, undo/redo | Functional component + hooks |
| `NoteMain.js` | Read-only note viewer | Functional component |
| `NoteList.js` | Single note list item with pin toggle | Functional component |
| `NavbarMain.js` | Top toolbar for view mode (edit, copy, delete, download) | Functional component |
| `NavbarSidebar.js` | Left sidebar header (home, add note, search) | Functional component |
| `NoteSort.js` | Sort dropdown + upload/backup buttons | Functional component |
| `useMarkDown.js` | markdown-it + turndown configuration | Utility module |
| `KeyCodes.js` | Markdown shortcut key definitions | Config object |
| `styles.css` (~810 lines) | All styling in a single CSS file | Global CSS |

### Observations

- **App.js is a monolith** — it holds all state, all business logic, all IndexedDB operations, all event handlers, and the entire render tree. This is the single biggest maintenance concern.
- The app mixes **class component** (`App`) with **functional components** (everything else). The class component pattern is outdated for React.
- No state management library; all state lives in `App` and is passed down via props (deep prop drilling).
- Direct DOM manipulation throughout (`document.querySelectorAll`, `element.classList.add/remove`, `document.getElementById(...).click()`), bypassing React's declarative model.

---

## 3. Dependencies Assessment

### Core Dependencies

| Package | Version | Status | Concern |
|---------|---------|--------|---------|
| `react` | 17.0.1 | **Outdated** | React 18+ (now 19) has been released with significant improvements. React 17 is no longer maintained. |
| `react-dom` | 17.0.1 | **Outdated** | Same as above. Uses legacy `ReactDOM.render()` API. |
| `react-scripts` | ^5.0.1 | **Outdated** | CRA is deprecated; no longer maintained by Facebook. |
| `highlight.js` | ^11.0.0 | OK | Could update to latest 11.x |
| `markdown-it` | ^14.1.0 | OK | Current |
| `marked` | ^12.0.2 | **Dual usage** | Both `markdown-it` and `marked` are used — redundant |
| `idb` | ^6.0.0 | OK | Slightly outdated (v8 available), but functional |

### Potentially Unused / Redundant Dependencies

| Package | Concern |
|---------|---------|
| `jquery` (^3.5.1) | **Listed but not imported anywhere in source code** — dead dependency |
| `github-markdown` (^2.0.2) | Appears unused; `github-markdown-css` is used instead |
| `react-markdown` (^6.0.1) | **Not imported anywhere** — dead dependency |
| `remark-gfm` (^1.0.0) | **Not imported anywhere** — dead dependency |
| `react-syntax-highlighter` (^15.4.3) | **Not imported anywhere** — dead dependency |
| `rsuite` (^4.9.4) | **Not imported anywhere** — dead dependency |
| `marked` + `markdown-it` | Both perform Markdown→HTML conversion; only one is needed |

### CDN Dependencies in `index.html`

The HTML file loads several CDN resources that overlap with npm packages:

- Bootstrap 3.3.7 CSS (CDN) — old version, likely only partially used
- Font Awesome 5 (loaded **twice** from different CDNs)
- highlight.js GitHub theme (CDN) — also installed via npm
- github-markdown-css (CDN) — also installed via npm
- Primer CSS (CDN) — unclear usage
- Google Material Icons — unclear usage

This creates version conflicts and unnecessary network requests.

---

## 4. Identified Gaps & Issues

### 4.1 Security

| Issue | Severity | Location |
|-------|----------|----------|
| **`dangerouslySetInnerHTML` with user content** | **High** | `NoteMain.js` renders user-provided markdown as raw HTML via `md2html.render()`. No DOMPurify or sanitization. XSS risk if notes contain malicious scripts. |
| **`dangerouslySetInnerHTML` in editor preview** | **High** | `NoteEditor.js` uses `marked()` output in `dangerouslySetInnerHTML` for split-screen preview. Same XSS risk. |
| **`document.execCommand("insertText")`** | Low | Deprecated API used in paste handler. |
| **CDN resources without SRI** | Medium | Several CDN links in `index.html` lack `integrity` attributes (Primer, Bootstrap, Google Fonts), enabling supply-chain attacks. |
| **`<base target="_blank">`** | Low | All links open in new tabs by default — consider adding `rel="noopener noreferrer"`. |

### 4.2 Code Quality

| Issue | Impact |
|-------|--------|
| **No tests** — zero test files exist | Cannot verify behavior or safely refactor |
| **No linting configuration** — no `.eslintrc`, no Prettier | Inconsistent code style throughout |
| **No TypeScript** | No type safety; easier to introduce bugs during edits |
| **`==` used instead of `===`** in multiple places | Potential type coercion bugs (e.g., `App.js` lines in `handleDeleteNote`, `handleSaveNote`) |
| **Unused variables/bindings** in constructor | `this.updateCodeSyntaxHighlighting` and `this.addCopyButtons` referenced without `.bind()` or assignment |
| **Inconsistent indentation** | Mix of 2-space, 4-space, and tab indentation |
| **Console.log statements** left in production code | `componentDidMount`, various handlers |
| **`filter` callback returns item instead of boolean** | `handleDeleteNote` filter callback returns the item rather than `true/false` |

### 4.3 Architecture

| Issue | Impact |
|-------|--------|
| **God component** — `App.js` (~720 lines) handles everything | Extremely hard to maintain, test, or extend |
| **No separation of concerns** — DB logic, state management, UI rendering, event handling all in one file | Violates single responsibility principle |
| **Direct DOM manipulation** throughout | Fights React's declarative model, causes potential state/UI desync |
| **Prop drilling** — 6+ props passed through multiple component levels | Makes refactoring fragile |
| **No routing** — single-page with internal state machine (`activepage`) | Hard to deep-link or support browser back/forward |
| **`handleSaveNote` mutates state directly** | `noteitem.title = notetitle` inside `map()` mutates existing state objects |
| **`allnotes.push()` in handleSaveNote** | Direct mutation of state array |
| **Mixed async patterns** | Some operations use async/await, others use `.then()` chains |

### 4.4 UX & Accessibility

| Issue | Impact |
|-------|--------|
| **No mobile responsiveness** | Fixed percentage-based layout (25%/75% split) unusable on phones |
| **No keyboard navigation** for note list | Can't tab through notes or use arrow keys |
| **No ARIA labels** on icon-only buttons | Screen readers can't identify button functions |
| **No confirmation dialog for delete** | Notes are permanently deleted with one click |
| **`overflow: hidden` on body** | May cause issues on some devices/browsers |
| **No empty state design** for search with no results | User sees blank space |
| **Custom tooltip implementation** | No accessibility support; `title` attribute would be more accessible |
| **No loading states** | IndexedDB operations complete fast but no feedback during backup/upload |

### 4.5 Performance

| Issue | Impact |
|-------|--------|
| **Syntax highlighting runs on every `componentDidUpdate`** | `querySelectorAll("pre code")` + `hljs.highlightElement` runs on every state change, even when no code blocks changed |
| **Copy buttons re-added on every update** | `handleCopyCodeButtonClick` runs on every render cycle, adding duplicate buttons |
| **No memoization** | Child components re-render on every parent state change |
| **Full note list re-sorts on many operations** | No virtualization for large note collections |
| **Multiple CDN requests** | 7+ external CSS/JS files loaded on page load |

### 4.6 Build & Deployment

| Issue | Impact |
|-------|--------|
| **Create React App is deprecated** | No future updates, security patches, or improvements |
| **No CI/CD pipeline** | Manual `npm run deploy` |
| **No environment configuration** | `.env` files not used |
| **Renovate configured** but automated PRs may break things without tests | Risk of introducing breaking changes |
| **`lockfileVersion: 2`** | Works but lockfileVersion 3 is current |

### 4.7 Data & Storage

| Issue | Impact |
|-------|--------|
| **No data export/import format** beyond raw `.md` | Can't migrate to another app easily |
| **No data backup reminder** | Users may lose data if browser storage is cleared |
| **IndexedDB version upgrade** is fragile | Single upgrade function; any schema change requires careful migration |
| **No note created_at preserved on update** | `handleSaveNote` for updates doesn't include `created_at`, so IndexedDB `put` may overwrite it |
| **Note IDs generated differently** | `Math.random().toString(16).slice(2)` vs `new Date().getTime().toString()` — inconsistent ID generation |

---

## 5. Duplicate / Redundant Code

1. **Two Markdown renderers**: `markdown-it` (via `useMarkDown.js`) and `marked` (imported directly in `App.js` and `NoteEditor.js`). Pick one.
2. **Font Awesome loaded twice** in `index.html` (two different CDN links).
3. **Duplicate `<!DOCTYPE html>` and `<html>` tags** in `public/index.html` — malformed HTML.
4. **github-markdown-css** loaded both via CDN and npm.
5. **highlight.js theme** loaded both via CDN and npm.

---

## 6. HTML Issues in `public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
	<!DOCTYPE html>        <!-- DUPLICATE DOCTYPE -->
	<html lang="en">       <!-- DUPLICATE HTML TAG (never closed) -->
```

The file has nested/duplicate `<!DOCTYPE>` and `<html>` tags, making it invalid HTML.

---

## 7. Implementation Plan

> **Guiding principle:** Each task should leave the app in a working, deployable state. No task depends on a later one within the same phase. Phases are sequential — complete Phase 1 before starting Phase 2.

---

### Phase 1 — Stabilize

**Goal:** Fix bugs, eliminate security risks, remove dead code, and establish code quality tooling — all without changing app behavior.

#### 1.1 Fix malformed HTML in `public/index.html`
- [ ] Remove the duplicate `<!DOCTYPE html>` and nested `<html lang="en">` tags
- [ ] Remove the duplicate Font Awesome CDN link (keep one, preferably the one with SRI `integrity` attribute)
- [ ] Add `integrity` + `crossorigin` attributes to all remaining CDN `<link>` tags that lack them (Bootstrap, Primer, Google Fonts)
- [ ] Remove the `<base target="_blank">` tag (handle link targets in React instead)
- **Files:** `public/index.html`

#### 1.2 Fix XSS — sanitize all `dangerouslySetInnerHTML` output
- [ ] Install `dompurify` (`npm install dompurify`)
- [ ] In `NoteMain.js` — wrap both `md2html.render()` calls with `DOMPurify.sanitize()`
- [ ] In `NoteEditor.js` — wrap both `marked()` calls (split-screen preview title + body) with `DOMPurify.sanitize()`
- **Files:** `NoteMain.js`, `NoteEditor.js`

#### 1.3 Remove unused npm dependencies
- [ ] Uninstall: `jquery`, `react-markdown`, `remark-gfm`, `rsuite`, `react-syntax-highlighter`, `github-markdown`
- [ ] Verify no import references remain (grep for each package name)
- [ ] Run `npm install` to clean lockfile
- **Command:** `npm uninstall jquery react-markdown remark-gfm rsuite react-syntax-highlighter github-markdown`

#### 1.4 Consolidate Markdown renderers — remove `marked`
- [ ] In `App.js` — replace `import { marked } from 'marked'` → use `md2html.render()` from `useMarkDown.js`
- [ ] In `App.js` `handleSaveNote` — replace `marked(note.notebody)` → `md2html.render(note.notebody)`
- [ ] In `NoteEditor.js` — replace `import { marked } from 'marked'` → use `md2html.render()` from `useMarkDown.js`
- [ ] In `NoteEditor.js` split-screen preview — replace `marked(title)` and `marked(bodytxt)` → `md2html.render()`
- [ ] Uninstall: `npm uninstall marked`
- **Files:** `App.js`, `NoteEditor.js`, `package.json`

#### 1.5 Reconcile CDN vs npm loaded assets
- [ ] Remove `github-markdown-css` CDN link from `index.html` — import the npm package in `styles.css` or `index.js` instead
- [ ] Remove `highlight.js` CDN theme link from `index.html` — import the theme CSS from the npm package in `index.js`
- [ ] Evaluate whether Bootstrap 3.3.7 CSS is actually used; if only grid/utilities, replace with minimal custom CSS or remove
- [ ] Evaluate whether Primer CSS is used; if not, remove
- [ ] Evaluate whether Google Material Icons font is used; if not, remove
- **Files:** `public/index.html`, `src/index.js` or `src/styles.css`

#### 1.6 Fix JavaScript bugs and bad practices
- [ ] `App.js` `handleDeleteNote` — change `==` to `===` (two occurrences)
- [ ] `App.js` `handleSaveNote` — change `==` to `===`
- [ ] `App.js` `handleSaveNote` — fix state mutation: replace `allnotes.push(...)` with immutable pattern
- [ ] `App.js` `handleSaveNote` — fix state mutation inside `map()`: clone `noteitem` before modifying
- [ ] `App.js` `handleSaveNote` (update path) — include `created_at` in the object passed to `handleIndexedDB("update", ...)` to avoid losing it
- [ ] `App.js` `handleDeleteNote` — fix filter callback to return boolean (`noteitem.noteid !== note.noteid`) instead of returning the item
- [ ] `App.js` constructor — remove the dangling `this.updateCodeSyntaxHighlighting;` and `this.addCopyButtons;` lines (no-op statements)
- [ ] `NoteEditor.js` — replace deprecated `document.execCommand("insertText")` with direct textarea value manipulation
- [ ] Remove stray `console.log` statements from production code
- **Files:** `App.js`, `NoteEditor.js`

#### 1.7 Standardize note ID generation
- [ ] Pick one strategy (timestamp-based: `Date.now().toString()`) and use it in both `NavbarSidebar.js` (new note creation) and `App.js` `handleNotesUpload`
- **Files:** `NavbarSidebar.js`, `App.js`

#### 1.8 Add ESLint + Prettier
- [ ] Install: `npm install -D eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks`
- [ ] Create `.eslintrc.json` with React rules, `eqeqeq: error`, `no-console: warn`
- [ ] Create `.prettierrc` with consistent style (2-space indent, single quotes, trailing commas)
- [ ] Add npm scripts: `"lint": "eslint src/"`, `"format": "prettier --write src/"`
- [ ] Run `npm run format` to normalize all files
- [ ] Fix any lint errors surfaced
- **Files:** new `.eslintrc.json`, new `.prettierrc`, `package.json`

#### 1.9 Add delete confirmation
- [ ] In `App.js` `handleDeleteNote` — add `window.confirm("Delete this note?")` guard before proceeding
- **Files:** `App.js`

#### 1.10 Fix performance — guard repeated DOM operations
- [ ] In `App.js` `componentDidUpdate` — only run `updateCodeSyntaxHighlighting()` and `handleCopyCodeButtonClick()` when `notebody` or `activepage` state actually changed (compare with `prevState`/`prevProps` via `componentDidUpdate(prevProps, prevState)`)
- [ ] In `addCopyButtons` — check if button already exists before inserting (the current `prevElem.type === "button"` check is unreliable)
- **Files:** `App.js`

**Phase 1 exit criteria:** App works identically to today. No unused deps. No XSS. Valid HTML. Linter passes. All `===`. No state mutations.

---

### Phase 2 — Modernize

**Goal:** Update the tech stack and restructure code for maintainability. App behavior stays the same.

#### 2.1 Migrate from Create React App to Vite
- [ ] Install Vite + React plugin: `npm install -D vite @vitejs/plugin-react`
- [ ] Create `vite.config.js` with `base: '/noteApp/'` (for GitHub Pages)
- [ ] Move `public/index.html` → `index.html` (Vite root)
- [ ] Update `index.html` to add `<script type="module" src="/src/index.js"></script>`
- [ ] Update `package.json` scripts: `start` → `vite`, `build` → `vite build`, `preview` → `vite preview`
- [ ] Update `deploy` script to use Vite build output (`dist/` instead of `build/`)
- [ ] Remove `react-scripts` from dependencies
- [ ] Verify build + deploy still works
- **Files:** new `vite.config.js`, `index.html`, `package.json`

#### 2.2 Upgrade React 17 → React 18
- [ ] Update: `npm install react@18 react-dom@18`
- [ ] Update `src/index.js` — replace `ReactDOM.render()` with `createRoot()` API
- [ ] Test all features still work (editor, preview, search, sort, pin, backup)
- **Files:** `package.json`, `src/index.js`

#### 2.3 Extract IndexedDB logic into a service module
- [ ] Create `src/services/notesDB.js` exporting async functions: `initDB()`, `getAllNotes()`, `getNote(id)`, `addNote(note)`, `updateNote(note)`, `deleteNote(id)`, `getAllPins()`, `addPin(id)`, `removePin(id)`
- [ ] Each function opens/closes its own DB connection (or shares a singleton)
- [ ] Replace all `this.handleIndexedDB(cmd, note)` calls in `App.js` with specific function calls
- [ ] Delete `handleIndexedDB` method from `App.js`
- **Files:** new `src/services/notesDB.js`, `App.js`

#### 2.4 Convert `App.js` from class component to functional component
- [ ] Convert `constructor` → `useState` hooks (one per logical group: `noteState`, `viewState`, `allnotes`, `pinnedNotes`, `filteredNotes`, `sortby`)
- [ ] Convert `componentDidMount` → `useEffect(..., [])` 
- [ ] Convert `componentDidUpdate` → `useEffect` with proper deps
- [ ] Convert all method bindings → plain functions / `useCallback`
- [ ] Keep the same props interface to child components
- [ ] Verify app still works identically
- **Files:** `App.js`

#### 2.5 Replace direct DOM manipulation with React patterns
- [ ] Replace `document.querySelectorAll(".note-list-item-clicked")` class toggling → track `selectedNoteId` in state and apply class via `className` prop in `NoteList.js`
- [ ] Replace `document.getElementById(noteid).click()` → call `handleNoteListItemClick` directly
- [ ] Replace `document.querySelector("textarea")` in `NoteEditor.js` → use `textAreaRef.current`
- [ ] Replace hover class toggling in `handleNoteListItemMouseOver/Out` → track `hoveredNoteId` in state
- **Files:** `App.js`, `NoteList.js`, `NoteEditor.js`

#### 2.6 Extract state into React Context
- [ ] Create `src/context/NotesContext.js` with a provider holding: `allnotes`, `pinnedNotes`, `filteredNotes`, `sortby`, and all CRUD operations
- [ ] Create `src/context/EditorContext.js` with: `noteid`, `notetitle`, `notebody`, `activepage`, `action`
- [ ] Wrap `<App />` in providers in `index.js`
- [ ] Refactor child components to `useContext()` instead of receiving deeply-drilled props
- **Files:** new `src/context/NotesContext.js`, new `src/context/EditorContext.js`, `src/index.js`, all components

#### 2.7 Add TypeScript (gradual migration)
- [ ] Install: `npm install -D typescript @types/react @types/react-dom`
- [ ] Create `tsconfig.json` with `allowJs: true` for incremental adoption
- [ ] Rename one simple file to `.tsx` as proof of concept (e.g., `NoteSort.js` → `NoteSort.tsx`)
- [ ] Add interfaces for `Note`, `PinnedNote`, component props
- [ ] Migrate remaining files one at a time (smallest → largest)
- **Files:** new `tsconfig.json`, all `.js` → `.tsx` files incrementally

**Phase 2 exit criteria:** Vite builds. React 18 running. `App.js` is a functional component under 300 lines. DB logic isolated. No direct DOM manipulation. Context replaces prop drilling. At least one `.tsx` file compiles.

---

### Phase 3 — Quality & Testing

**Goal:** Establish automated quality gates so future changes can be made with confidence.

#### 3.1 Set up testing infrastructure
- [ ] Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
- [ ] Configure Vitest in `vite.config.js` (`test: { environment: 'jsdom', globals: true }`)
- [ ] Add npm script: `"test": "vitest"`, `"test:ci": "vitest run --coverage"`
- [ ] Create `src/test/setup.ts` with `@testing-library/jest-dom` import
- **Files:** `vite.config.js`, `package.json`, new `src/test/setup.ts`

#### 3.2 Unit tests for service layer
- [ ] Test `notesDB.js` — CRUD operations against a fake/in-memory IndexedDB (use `fake-indexeddb`)
- [ ] Test sort logic (all 6 sort modes, pinned-first ordering)
- [ ] Test search logic (title search, body search, multi-word matching, empty query reset)
- [ ] Test ID generation consistency
- [ ] Target: 90%+ coverage on service/utility files
- **Files:** new `src/services/__tests__/notesDB.test.ts`, new `src/utils/__tests__/sort.test.ts`

#### 3.3 Component tests
- [ ] `NoteList` — renders title, pin/unpin click toggles, click selects
- [ ] `NoteSort` — sort change fires callback, upload triggers file input
- [ ] `NavbarMain` — buttons render, clicks fire correct handlers
- [ ] `NavbarSidebar` — search input fires handler, add note click works
- [ ] `NoteMain` — renders sanitized markdown content
- [ ] `NoteEditor` — toolbar buttons insert correct markdown, save/cancel work, theme toggle
- [ ] Target: every component has at least one render + interaction test
- **Files:** new `src/components/__tests__/*.test.tsx`

#### 3.4 Integration / smoke tests
- [ ] Full flow: create note → appears in list → edit → save → verify content → delete → gone
- [ ] Backup + upload round-trip
- [ ] Pin/unpin + sort interaction
- **Files:** new `src/__tests__/App.test.tsx`

#### 3.5 Set up CI/CD with GitHub Actions
- [ ] Create `.github/workflows/ci.yml`:
  - Trigger on push to `main` and PRs
  - Steps: checkout → Node setup → `npm ci` → `npm run lint` → `npm run test:ci` → `npm run build`
- [ ] Create `.github/workflows/deploy.yml`:
  - Trigger on push to `main` (after CI passes)
  - Steps: build → deploy to `gh-pages` branch
- [ ] Remove manual `npm run deploy` workflow (or keep as fallback)
- **Files:** new `.github/workflows/ci.yml`, new `.github/workflows/deploy.yml`

#### 3.6 Accessibility audit and fixes
- [ ] Add `aria-label` to all icon-only buttons (`<i>` elements used as buttons throughout)
- [ ] Add `role="button"` where `<i>` or `<span>` elements act as buttons
- [ ] Ensure all interactive elements are keyboard-focusable (`tabIndex`)
- [ ] Add `aria-live="polite"` region for note count / search results announcements
- [ ] Replace custom `[tooltip]` CSS with accessible tooltip pattern (or use `aria-label`)
- [ ] Test with a screen reader (VoiceOver on macOS)
- **Files:** all component files, `styles.css`

**Phase 3 exit criteria:** `npm test` passes. CI pipeline blocks broken PRs. Linting enforced. Every component has tests. Accessibility basics covered.

---

### Phase 4 — Features & UX

**Goal:** Enhance the user experience with new capabilities. Each feature is independent.

#### 4.1 Mobile-responsive layout
- [ ] Add CSS media queries for breakpoints: `<768px` (mobile), `768–1024px` (tablet)
- [ ] Mobile: full-width note list as default view; note view replaces list (with back button)
- [ ] Tablet: adjustable sidebar width
- [ ] Add hamburger menu for sidebar toggle on mobile
- [ ] Test on iOS Safari and Android Chrome
- **Files:** `styles.css`, component files for layout changes

#### 4.2 Note categories / tags
- [ ] Add `tags: string[]` field to note schema (IndexedDB migration: bump version)
- [ ] Add tag input UI in editor (comma-separated or pill-style)
- [ ] Display tags on note list items
- [ ] Add tag filter in sidebar (click tag → filter notes)
- [ ] Update search to include tag matching
- **Files:** `notesDB.js`, `NoteEditor`, `NoteList`, `NavbarSidebar`, `App` / context

#### 4.3 Note metadata display
- [ ] Show word count + character count in editor bottom bar
- [ ] Show "Created: \<date\>" and "Modified: \<date\>" in note view header
- [ ] Show estimated reading time
- **Files:** `NoteEditor`, `NoteMain`

#### 4.4 Enhanced search
- [ ] Highlight matching text in note list items
- [ ] Highlight matching text in note body view
- [ ] Add "No results found" empty state with clear-search button
- [ ] Add debounce to search input (currently implemented but verify wiring)
- **Files:** `NoteList`, `NoteMain`, `NavbarSidebar`, `styles.css`

#### 4.5 Loading and empty states
- [ ] Add loading spinner/skeleton while IndexedDB initializes on first load
- [ ] Add empty state illustration + "Create your first note" CTA when no notes exist
- [ ] Add progress feedback for backup download (especially large collections)
- [ ] Add success toast for: save, delete, upload, backup
- **Files:** `App` / context, new `src/components/EmptyState.js`, `styles.css`

#### 4.6 Full data export / import
- [ ] Add JSON export: `{ version: 1, notes: [...], pinnedNotes: [...] }` with all metadata
- [ ] Add JSON import: validate schema, merge or replace notes, handle ID conflicts
- [ ] Keep existing ZIP backup as a separate "Download all as Markdown" option
- **Files:** `notesDB.js`, `NoteSort` or new export/import UI

**Phase 4 exit criteria:** App is usable on mobile. Tags work. Search shows results feedback. Data is fully portable.

---

### Task Dependency Graph

```
Phase 1 (all tasks can be done in parallel, except 1.8 should come after 1.3-1.6)
  │
  ▼
Phase 2 (sequential recommended order)
  2.1 Migrate to Vite
  2.2 Upgrade React 18  ──────────────────┐
  2.3 Extract DB service                  │ (can be parallel)
  2.4 Convert App.js to functional ───────┘
  2.5 Replace DOM manipulation (after 2.4)
  2.6 Extract Context (after 2.4 + 2.5)
  2.7 Add TypeScript (after 2.1, can be progressive)
  │
  ▼
Phase 3 (sequential recommended order)
  3.1 Testing infrastructure (first)
  3.2 Unit tests ─────────┐
  3.3 Component tests ────┤ (can be parallel)
  3.4 Integration tests ──┘
  3.5 CI/CD (after 3.1-3.4)
  3.6 Accessibility (independent, anytime)
  │
  ▼
Phase 4 (all features are independent, any order)
```

---

## 8. Baseline Metrics

| Metric | Current Value |
|--------|---------------|
| React Version | 17.0.1 |
| Build Tool | Create React App 5.0.1 (deprecated) |
| Total Source Files | 10 (9 JS + 1 CSS) |
| Total Lines of Code (src/) | ~2,300 |
| Largest File | `App.js` (~720 lines) |
| Test Coverage | 0% (no tests) |
| npm Dependencies | 22 |
| Likely Unused Dependencies | 6 |
| CDN Dependencies | 7 |
| Known Security Issues | `dangerouslySetInnerHTML` without sanitization (2 components) |
| TypeScript | None |
| Linting | None configured |
| CI/CD | None |
| Accessibility | Minimal |
| Mobile Support | None |

---

*This document serves as the baseline for all future work on NoteApp.*
