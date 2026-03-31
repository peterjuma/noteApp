# NoteApp — Known Issues & Limitations

## Security

### PIN Lock relies on browser storage
- **Impact:** Clearing browser data (localStorage + IndexedDB) removes the PIN lock **and** all notes. The data and lock are destroyed together, so there's nothing left to protect.
- **Context:** This is inherent to a client-only app with no backend. There is no server to verify credentials against.
- **Mitigation:** None needed — the threat model is casual access prevention on shared devices, not physical security.

### No brute-force protection on PIN entry
- **Impact:** An attacker with physical access can try unlimited PINs without lockout or delay.
- **Severity:** Medium. The PIN is hashed with SHA-256, so a strong PIN (8+ characters) resists offline brute-force. Short 4-digit PINs are vulnerable.
- **Possible fix:** Track failed attempts in `sessionStorage` and add exponential backoff (e.g., 5s after 3 fails, 30s after 5, 5min after 10). Not yet implemented.

### GitHub token stored in IndexedDB
- The GitHub PAT for Gist sync is stored in the IndexedDB `settings` store. This is marginally more secure than localStorage (not visible in the DevTools Application > Local Storage panel) but still accessible via IndexedDB or XSS.
- **Possible enhancement:** Encrypt the token at rest using a key derived from the PIN (if set) via Web Crypto API.

## Gist Sync

### Sync only includes notes
- **Impact:** Cross-device sync via GitHub Gist currently syncs **notes only**. Predefined tags, tag colors, and templates/snippets are **not** included in the Gist payload.
- **Workaround:** Use ZIP backup/import (Data tab) which fully exports notes, tags, and templates.
- **Possible fix:** Extend `buildGistPayload` in `gistSync.js` to include snippets and tags alongside notes.

### WebAuthn challenge not verified server-side
- The biometric unlock uses WebAuthn with a random challenge, but since there's no server, the challenge is never cryptographically verified. The `navigator.credentials.get()` succeeding is treated as proof of user presence.
- **Context:** This is acceptable for a client-only app. The purpose is device-presence verification (Touch ID / Face ID), not cryptographic authentication against a server.

## Data & Storage

### IndexedDB version upgrades
- The database is at **version 6** with these object stores:
  - `notes` — Note content and metadata
  - `pinnedNotes` — Pinned note IDs
  - `images` — Blob storage for embedded images
  - `versions` — Version history snapshots (50 per note)
  - `snippets` — Templates/response snippets (v5)
  - `tags` — Predefined tag definitions (v6)
  - `settings` — Key-value config for sync, etc. (v6)
- Each workspace has its own IndexedDB database. The default is `notesdb`.

### Legacy localStorage migration
- Snippets, tags, and sync config were migrated from localStorage to IndexedDB.
- Migration runs once per workspace (tracked by `noteapp_*_migrated_{dbName}` flags in localStorage).
- After successful migration, legacy keys are **removed** from localStorage.
- If legacy data is corrupted JSON, migration silently skips it and sets the migrated flag. The corrupted data is lost.

### Backup format
- ZIP backup contains:
  - `*.md` files — One per note (body content only)
  - `_notes.json` — Full metadata (noteid, title, tags, created_at, updated_at) for all notes
  - `_templates.json` — All templates/snippets for the workspace
  - `_tags.json` — All predefined tag definitions
- On import, per-note tags are restored by matching the `.md` filename to the `_notes.json` metadata by title.
- Templates and tags skip duplicates (by ID and name respectively).

## UI / UX

### Settings page workspace scope
- Templates, Tags, Data, and Sync tabs are workspace-scoped. A workspace badge appears on each to indicate which workspace is active.
- Archive tab is global (shared across all workspaces).
- General tab contains device-level settings (dark mode, PIN, etc.) that apply across all workspaces.

### NoteEditor tag autocomplete
- Predefined tags are loaded from IndexedDB when the editor mounts and when the workspace changes.
- The tag input's `onFocus` handler refreshes the cache for fresh suggestions.
- `harvestTags` (auto-adding new tags to the predefined list) runs fire-and-forget and does not block the UI.
