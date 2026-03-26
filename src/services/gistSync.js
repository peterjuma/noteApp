// GitHub Gist Sync Service
// Syncs workspace notes to/from a GitHub Gist

const TOKEN_KEY = "noteapp_gist_token";
const GIST_IDS_KEY = "noteapp_gist_ids"; // { workspaceDbName: gistId }
const LAST_SYNC_KEY = "noteapp_last_sync";
const SYNC_ENABLED_KEY = "noteapp_sync_enabled";
const SYNC_INTERVAL_KEY = "noteapp_sync_interval";

const API_BASE = "https://api.github.com";

// ─── Token Management ───

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isSyncEnabled() {
  return localStorage.getItem(SYNC_ENABLED_KEY) === "true" && !!getToken();
}

export function setSyncEnabled(enabled) {
  localStorage.setItem(SYNC_ENABLED_KEY, enabled ? "true" : "false");
}

export function getSyncInterval() {
  return parseInt(localStorage.getItem(SYNC_INTERVAL_KEY)) || 0; // ms, 0 = off
}

export function setSyncInterval(ms) {
  localStorage.setItem(SYNC_INTERVAL_KEY, String(ms));
}

// ─── Gist ID Management ───

function getGistIds() {
  try {
    return JSON.parse(localStorage.getItem(GIST_IDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function setGistId(dbName, gistId) {
  const ids = getGistIds();
  ids[dbName] = gistId;
  localStorage.setItem(GIST_IDS_KEY, JSON.stringify(ids));
}

export function getGistId(dbName) {
  return getGistIds()[dbName] || null;
}

// ─── Last Sync Tracking ───

export function getLastSync(dbName) {
  try {
    const syncs = JSON.parse(localStorage.getItem(LAST_SYNC_KEY) || "{}");
    return syncs[dbName] || null;
  } catch {
    return null;
  }
}

function setLastSync(dbName) {
  try {
    const syncs = JSON.parse(localStorage.getItem(LAST_SYNC_KEY) || "{}");
    syncs[dbName] = Date.now();
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(syncs));
  } catch {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({ [dbName]: Date.now() }));
  }
}

// ─── API Helpers ───

async function gistFetch(path, options = {}) {
  const token = getToken();
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

export async function validateToken() {
  const token = getToken();
  if (!token) return { valid: false, error: "No token" };
  try {
    const user = await gistFetch("/user");
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
  const gistId = getGistId(dbName);
  const payload = buildGistPayload(dbName, workspaceName, notes);

  let gist;
  if (gistId) {
    // Update existing Gist
    gist = await gistFetch(`/gists/${gistId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } else {
    // Create new Gist (secret, not public)
    gist = await gistFetch("/gists", {
      method: "POST",
      body: JSON.stringify({ ...payload, public: false }),
    });
    setGistId(dbName, gist.id);
  }

  setLastSync(dbName);
  return { gistId: gist.id, url: gist.html_url };
}

// ─── Pull (Download Gist → Local) ───

export async function pull(dbName) {
  const gistId = getGistId(dbName);
  if (!gistId) return null;

  const gist = await gistFetch(`/gists/${gistId}`);
  const data = parseGistData(gist, dbName);
  if (!data || !data.notes) return null;

  setLastSync(dbName);
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
  const gist = await gistFetch(`/gists/${gistId}`);
  const data = parseGistData(gist, dbName);
  if (!data) {
    throw new Error(`Gist does not contain NoteApp data for workspace "${dbName}"`);
  }
  setGistId(dbName, gistId);
  return data;
}
