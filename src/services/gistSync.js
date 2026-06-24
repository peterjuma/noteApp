// GitHub Gist Sync Service
// Syncs workspace notes to/from a GitHub Gist
// Config stored in IndexedDB settings store per workspace

import * as db from "./notesDB";

const API_BASE = "https://api.github.com";

// Legacy localStorage keys for migration
const LEGACY_KEYS = {
  token: "noteapp_gist_token",
  gistIds: "noteapp_gist_ids",
  lastSync: "noteapp_last_sync",
  syncEnabled: "noteapp_sync_enabled",
  syncInterval: "noteapp_sync_interval",
};

// Migrate legacy localStorage sync config (once per workspace)
async function migrateLegacy(dbName) {
  const migKey = `noteapp_sync_migrated_${dbName}`;
  if (localStorage.getItem(migKey)) return;
  try {
    const token = localStorage.getItem(LEGACY_KEYS.token);
    if (token) await db.setSetting("sync_token", token, dbName);

    const enabled = localStorage.getItem(LEGACY_KEYS.syncEnabled);
    if (enabled) await db.setSetting("sync_enabled", enabled === "true", dbName);

    const interval = localStorage.getItem(LEGACY_KEYS.syncInterval);
    if (interval) await db.setSetting("sync_interval", parseInt(interval) || 0, dbName);

    try {
      const gistIds = JSON.parse(localStorage.getItem(LEGACY_KEYS.gistIds) || "{}");
      if (gistIds[dbName]) await db.setSetting("gist_id", gistIds[dbName], dbName);
    } catch { /* ignore */ }

    try {
      const syncs = JSON.parse(localStorage.getItem(LEGACY_KEYS.lastSync) || "{}");
      if (syncs[dbName]) await db.setSetting("last_sync", syncs[dbName], dbName);
    } catch { /* ignore */ }
  } catch {
    // ignore
  }
  // Clean up legacy keys after successful migration
  for (const key of Object.values(LEGACY_KEYS)) {
    localStorage.removeItem(key);
  }
  localStorage.setItem(migKey, "1");
}

// ─── Token Management ───

export async function getToken(dbName = "notesdb") {
  await migrateLegacy(dbName);
  return (await db.getSetting("sync_token", dbName)) || "";
}

export async function setToken(token, dbName = "notesdb") {
  await db.setSetting("sync_token", token.trim(), dbName);
}

export async function clearToken(dbName = "notesdb") {
  await db.deleteSetting("sync_token", dbName);
}

export async function isSyncEnabled(dbName = "notesdb") {
  await migrateLegacy(dbName);
  const enabled = await db.getSetting("sync_enabled", dbName);
  const token = await db.getSetting("sync_token", dbName);
  return enabled === true && !!token;
}

export async function setSyncEnabled(enabled, dbName = "notesdb") {
  await db.setSetting("sync_enabled", enabled, dbName);
}

export async function getSyncInterval(dbName = "notesdb") {
  await migrateLegacy(dbName);
  return (await db.getSetting("sync_interval", dbName)) || 0;
}

export async function setSyncInterval(ms, dbName = "notesdb") {
  await db.setSetting("sync_interval", ms, dbName);
}

// ─── Gist ID Management ───

export async function getGistId(dbName = "notesdb") {
  await migrateLegacy(dbName);
  return (await db.getSetting("gist_id", dbName)) || null;
}

async function setGistId(dbName, gistId) {
  await db.setSetting("gist_id", gistId, dbName);
}

// ─── Last Sync Tracking ───

export async function getLastSync(dbName = "notesdb") {
  await migrateLegacy(dbName);
  return (await db.getSetting("last_sync", dbName)) || null;
}

async function setLastSync(dbName) {
  await db.setSetting("last_sync", Date.now(), dbName);
}

// ─── API Helpers ───

async function gistFetch(path, options = {}, dbName = "notesdb") {
  const token = await getToken(dbName);
  if (!token) throw new Error("No GitHub token configured");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) throw new Error("Invalid GitHub token — check your Personal Access Token");
  if (res.status === 403) throw new Error("GitHub API rate limit exceeded — try again later");
  if (res.status === 404) throw new Error("Gist not found — it may have been deleted");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  return res.json();
}

// ─── Validate Token ───

export async function validateToken(dbName = "notesdb") {
  const token = await getToken(dbName);
  if (!token) return { valid: false, error: "No token" };
  try {
    const user = await gistFetch("/user", {}, dbName);
    return { valid: true, username: user.login, avatar: user.avatar_url };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ─── Build Gist Payload ───

function buildGistPayload(dbName, workspaceName, notes) {
  const filename = `noteapp_${dbName}.json`;
  const data = {
    version: 1,
    workspace: workspaceName,
    dbName,
    exportedAt: new Date().toISOString(),
    exportedBy: localStorage.getItem("noteapp_profile_name") || "unknown",
    noteCount: notes.length,
    notes: notes.map((n) => ({
      noteid: n.noteid,
      title: n.title,
      body: n.body,
      tags: n.tags || [],
      created_at: n.created_at,
      updated_at: n.updated_at,
    })),
  };

  return {
    description: `NoteApp sync — ${workspaceName}`,
    files: {
      [filename]: {
        content: JSON.stringify(data, null, 2),
      },
    },
  };
}

// ─── Parse Gist Response ───

function parseGistData(gist, dbName) {
  const filename = `noteapp_${dbName}.json`;
  const file = gist.files[filename];
  if (!file) return null;

  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

// ─── Push (Upload Local → Gist) ───

export async function push(dbName, workspaceName, notes) {
  const gistId = await getGistId(dbName);
  const payload = buildGistPayload(dbName, workspaceName, notes);

  let gist;
  if (gistId) {
    // Update existing Gist
    gist = await gistFetch(`/gists/${gistId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, dbName);
  } else {
    // Create new Gist (secret, not public)
    gist = await gistFetch("/gists", {
      method: "POST",
      body: JSON.stringify({ ...payload, public: false }),
    }, dbName);
    await setGistId(dbName, gist.id);
  }

  await setLastSync(dbName);
  return { gistId: gist.id, url: gist.html_url };
}

// ─── Pull (Download Gist → Local) ───

export async function pull(dbName) {
  const gistId = await getGistId(dbName);
  if (!gistId) return null;

  const gist = await gistFetch(`/gists/${gistId}`, {}, dbName);
  const data = parseGistData(gist, dbName);
  if (!data || !data.notes) return null;

  await setLastSync(dbName);
  return data;
}

// ─── Merge (Bidirectional Sync) ───
// Strategy: newest-wins per note based on updated_at

export function mergeNotes(localNotes, remoteNotes) {
  const merged = new Map();
  const conflicts = [];

  // Index local notes
  for (const note of localNotes) {
    merged.set(note.noteid, { ...note, source: "local" });
  }

  // Merge remote notes
  for (const note of remoteNotes) {
    const existing = merged.get(note.noteid);
    if (!existing) {
      // New from remote — add it
      merged.set(note.noteid, { ...note, source: "remote" });
    } else {
      // Exists in both — newest wins
      const localTime = existing.updated_at || 0;
      const remoteTime = note.updated_at || 0;

      if (remoteTime > localTime) {
        merged.set(note.noteid, { ...note, source: "remote" });
      }
      // If local is newer or equal, keep local (already there)

      // Track conflict if both modified since last sync
      if (localTime !== remoteTime && Math.abs(localTime - remoteTime) < 60000) {
        conflicts.push({ noteid: note.noteid, local: existing, remote: note });
      }
    }
  }

  const notes = Array.from(merged.values()).map(({ source, ...note }) => note);
  return { notes, conflicts };
}

// ─── Full Sync (Pull + Merge + Push) ───

export async function sync(dbName, workspaceName, localNotes, saveCallback) {
  // 1. Pull remote
  let remoteData = null;
  try {
    remoteData = await pull(dbName);
  } catch (err) {
    // If gist doesn't exist yet, just push
    if (err.message.includes("not found")) {
      remoteData = null;
    } else {
      throw err;
    }
  }

  // 2. Merge
  let mergedNotes;
  if (remoteData && remoteData.notes) {
    const result = mergeNotes(localNotes, remoteData.notes);
    mergedNotes = result.notes;
  } else {
    mergedNotes = localNotes;
  }

  // 3. Save merged notes locally
  if (saveCallback) {
    await saveCallback(mergedNotes);
  }

  // 4. Push merged result to Gist
  const pushResult = await push(dbName, workspaceName, mergedNotes);

  return {
    noteCount: mergedNotes.length,
    gistId: pushResult.gistId,
    url: pushResult.url,
  };
}

// ─── Link Existing Gist ───

export async function linkGist(dbName, gistId) {
  // Validate the gist exists and has our data
  const gist = await gistFetch(`/gists/${gistId}`, {}, dbName);
  const data = parseGistData(gist, dbName);
  if (!data) {
    throw new Error(`Gist does not contain NoteApp data for workspace "${dbName}"`);
  }
  await setGistId(dbName, gistId);
  return data;
}

// ─── Import Notes from Any Gist ───

/**
 * Fetch markdown files from any Gist (public or private).
 * Accepts a Gist ID or full URL (e.g. https://gist.github.com/user/abc123).
 * Public gists are fetched without authentication.
 * Private gists use the configured token if available.
 * Returns an array of { title, body } objects from .md files found in the gist.
 */
export async function fetchGistNotes(gistInput, dbName = "notesdb") {
  // Extract gist ID from URL or use as-is
  const gistId = extractGistId(gistInput);
  if (!gistId) throw new Error("Invalid Gist URL or ID");

  // Try with token first (for private gists), fall back to public API
  let gist;
  const token = await getToken(dbName).catch(() => "");

  if (token) {
    gist = await gistFetch(`/gists/${gistId}`, {}, dbName);
  } else {
    // Public fetch without authentication
    const res = await fetch(`${API_BASE}/gists/${gistId}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) throw new Error("Gist not found — check the URL or ID, or it may be private");
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    gist = await res.json();
  }

  if (!gist.files || Object.keys(gist.files).length === 0) {
    throw new Error("Gist contains no files");
  }

  const notes = [];
  for (const [filename, file] of Object.entries(gist.files)) {
    // Import markdown files and plain text files
    if (!filename.endsWith(".md") && !filename.endsWith(".txt") && !filename.endsWith(".markdown")) {
      continue;
    }

    // For truncated files, fetch the raw URL
    let content = file.content;
    if (file.truncated && file.raw_url) {
      const rawRes = await fetch(file.raw_url);
      if (rawRes.ok) content = await rawRes.text();
    }

    if (!content || !content.trim()) continue;

    // Use leading H1 as title if present, otherwise use filename
    let title;
    let body = content;
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match && content.trimStart().startsWith(h1Match[0])) {
      title = h1Match[1].trim();
      body = content.trimStart().slice(h1Match[0].length).trimStart();
    } else {
      title = filename.replace(/\.(md|txt|markdown)$/, "");
    }

    notes.push({ title, body });
  }

  if (notes.length === 0) {
    throw new Error("No markdown files found in this Gist");
  }

  return { notes, description: gist.description || "", owner: gist.owner?.login || "anonymous" };
}

function extractGistId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  // Full URL: https://gist.github.com/user/abc123 or https://gist.github.com/abc123
  const urlMatch = trimmed.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i);
  if (urlMatch) return urlMatch[1];

  // Raw gist URL: https://gist.githubusercontent.com/user/abc123/...
  const rawMatch = trimmed.match(/gist\.githubusercontent\.com\/(?:[^/]+\/)([a-f0-9]+)/i);
  if (rawMatch) return rawMatch[1];

  // Bare hex ID
  if (/^[a-f0-9]+$/i.test(trimmed) && trimmed.length >= 20) return trimmed;

  return null;
}
