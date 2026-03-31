# Plan: NoteCache Landing Page & Complete Rebrand

Wrap the existing note-taking app in a developer-focused marketing landing page and rebrand from "NoteApp" to "NoteCache". Add react-router to separate the landing page (`/`) from the app (`/app`), introduce CSS custom properties for a cohesive dark-mode-first theme, and update all branding assets.

---

## Phase 1: Routing Infrastructure
1. Install `react-router-dom` v6+
2. Modify `src/index.js` — wrap root in `<BrowserRouter>`, define two routes: `/` → LandingPage, `/app` → App
3. Adjust hash navigation in `src/App.js` (`navigateFromHash()`, `slugify()`, lines 32-38, 734-790) to work under `/app`
4. Update `handleClickHomeBtn()` — stays in-app at `/app`; add a separate logo/link that navigates to `/` (landing page)

## Phase 2: Landing Page Component
5. Create `src/LandingPage.js` — styled to look like a rendered markdown document (think GitHub README / man page):
   - **Header**: `# NoteCache` as an H1, followed by a one-line description in plain text, then a `[Launch App →](/app)` styled as a markdown link (not a flashy button)
   - **Features section**: `## Features` heading, then a markdown-style unordered list or definition list — no cards, no gradients, no icons. Plain text descriptions with inline `code` formatting for technical terms
   - **Keyboard shortcuts**: `## Keyboard Shortcuts` heading, rendered as a markdown table (`| Shortcut | Action |`) — authentic, not decorative
   - **Tech stack / How it works**: `## Under the Hood` — bullet list of technical details (IndexedDB, Service Workers, CodeMirror 6, markdown-it)
   - **Footer**: Horizontal rule `---`, then a single line: "MIT License · GitHub · Built with React"
6. Create `src/landing.css` — minimal styling that mirrors `github-markdown-css`:
   - White/dark background matching the app's markdown preview pane
   - `max-width: 768px`, centered with `margin: 0 auto` (like a README)
   - System font stack + monospace for code spans
   - No animations, no gradients, no hero images — just clean typography
   - Respects dark mode via `.dark` class (same as app)
   - Responsive by nature (single-column prose needs no breakpoints)

## Phase 3: Complete Rebrand — "NoteCache"
7. `package.json` — `name: "notecache"`, update `homepage`
8. `public/index.html` — `<title>NoteCache</title>`, meta tags, description
9. `public/manifest.json` — `name`, `short_name`, `description`, shortcut URLs
10. `public/sw.js` — `CACHE_NAME: "notecache-v1"`
11. `src/App.js` — WCO title (line 1717), README fallback text
12. `src/README.md` — new welcome content

## Phase 4: Design System — CSS Custom Properties
13. Add CSS variables to `src/styles.css`:
    - Light: `--nc-primary: #6366f1` (indigo), `--nc-bg`, `--nc-text`, `--nc-border`, `--nc-accent: #10b981` (emerald)
    - Dark `.dark` overrides: `--nc-primary: #818cf8`, `--nc-bg: #0f172a` (slate-900), etc.
14. Replace all hardcoded hex color values with `var(--nc-*)` references
15. Update meta theme-color in index.html to match

## Phase 5: Icon & Asset Refresh
16. Update `public/favicon.svg`, `public/icon-192.svg`, `public/icon-512.svg` — new NoteCache icon (stylized cache/bracket motif), maintain maskable purpose

## Phase 6: localStorage Key Migration
17. Add one-time migration function in App.js constructor — reads `noteapp_*` keys, writes `notecache_*` equivalents, cleans up old keys
18. Update all localStorage key references across: `src/App.js`, `src/SettingsPanel.js`, `src/NoteEditor.js`, `src/services/tagManager.js`, `src/services/gistSync.js`, `src/services/snippets.js`

---

## Verification
1. Navigate `/` → landing page; click CTA → `/app` loads the note app; browser back returns to landing
2. Hash navigation within `/app` — `#note/slug` links still work
3. Lighthouse PWA audit — manifest, icons, theme color all reflect NoteCache
4. Dark mode toggle — all colors driven by CSS variables across both pages
5. localStorage migration — existing `noteapp_*` data auto-migrates on first load
6. Service worker — new `notecache-v1` cache created, old `noteapp-v4` purged
7. `npm test` — all 79 tests pass (update any asserting "NoteApp" strings)
8. `npm run build` — succeeds, bundle size stays reasonable
9. Mobile — landing page renders cleanly at 375px

---

## Decisions
- **react-router over manual routing** — clean separation between marketing and app; ~14KB gzipped
- **Indigo primary** — differentiates from current GitHub blue; popular in dev tools (Linear, Stripe, Vercel)
- **CSS custom properties over Tailwind** — 2000+ lines of existing pure CSS; variables give theming without a rewrite
- **Dark-mode-first landing page** — developer audiences prefer dark; landing defaults dark regardless of OS preference
- **localStorage migration with cleanup** — no data loss for existing users
- **Scope excludes** — no IndexedDB schema changes, no new app features, no test framework changes
