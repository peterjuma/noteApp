import { openDB } from "idb/with-async-ittr.js";

const DB_VERSION = 6;
const dbConnections = new Map();
const MAX_VERSIONS_PER_NOTE = 50;

// Get or create a DB connection per database name
async function getDB(dbName) {
  const existing = dbConnections.get(dbName);
  if (existing) return existing;

  const db = await openDB(dbName, DB_VERSION, {
    upgrade(db) {
      // Notes store
      if (!db.objectStoreNames.contains("notes")) {
        const store = db.createObjectStore("notes", { keyPath: "noteid" });
        store.createIndex("created_at", "created_at");
      }
      // Pinned notes store
      if (!db.objectStoreNames.contains("pinnedNotes")) {
        db.createObjectStore("pinnedNotes", { keyPath: "noteid" });
      }
      // Images store (blob storage)
      if (!db.objectStoreNames.contains("images")) {
        const imgStore = db.createObjectStore("images", { keyPath: "id" });
        imgStore.createIndex("created_at", "created_at");
      }
      // Version history store
      if (!db.objectStoreNames.contains("versions")) {
        const vStore = db.createObjectStore("versions", { keyPath: "versionId" });
        vStore.createIndex("noteid", "noteid");
        vStore.createIndex("timestamp", "timestamp");
      }
      // Snippets/Templates store (v5)
      if (!db.objectStoreNames.contains("snippets")) {
        const sStore = db.createObjectStore("snippets", { keyPath: "id" });
        sStore.createIndex("category", "category");
      }
      // Predefined tags store (v6)
      if (!db.objectStoreNames.contains("tags")) {
        db.createObjectStore("tags", { keyPath: "name" });
      }
      // Key-value settings store (v6) — for sync config, etc.
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    },
  });
  dbConnections.set(dbName, db);
  return db;
}

// ===== Notes =====
export async function getAllNotes(dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.getAll("notes");
}

export async function getNote(noteid, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.get("notes", noteid);
}

export async function addNote(note, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.add("notes", note);
}

export async function updateNote(note, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("notes", note);
}

export async function deleteNote(noteid, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.delete("notes", noteid);
}

// ===== Pinned Notes =====
export async function getAllPins(dbName = "notesdb") {
  const db = await getDB(dbName);
  const pins = await db.getAll("pinnedNotes");
  return pins.map((pin) => pin.noteid);
}

export async function addPin(noteid, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("pinnedNotes", { noteid });
}

export async function removePin(noteid, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.delete("pinnedNotes", noteid);
}

// ===== Images =====
export async function saveImage(id, blob, name, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("images", {
    id,
    blob,
    name: name || id,
    type: blob.type,
    size: blob.size,
    created_at: Date.now(),
  });
}

export async function getImage(id, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.get("images", id);
}

export async function deleteImage(id, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.delete("images", id);
}

export async function getAllImages(dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.getAll("images");
}

// Create a blob URL from a stored image
export async function getImageURL(id, dbName = "notesdb") {
  const img = await getImage(id, dbName);
  if (!img) return null;
  return URL.createObjectURL(img.blob);
}

// Move a note from one workspace to another
export async function moveNote(noteid, fromDb, toDb) {
  const fromConn = await getDB(fromDb);
  const note = await fromConn.get("notes", noteid);
  if (!note) return null;
  note.updated_at = Date.now();
  const toConn = await getDB(toDb);
  await toConn.put("notes", note);
  await fromConn.delete("notes", noteid);
  return note;
}

// ===== Predefined Tags =====
export async function getAllTags(dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.getAll("tags");
}

export async function putTag(tag, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("tags", tag);
}

export async function deleteTag(name, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.delete("tags", name);
}

export async function clearTags(dbName = "notesdb") {
  const db = await getDB(dbName);
  const tx = db.transaction("tags", "readwrite");
  await tx.store.clear();
  await tx.done;
}

// ===== Key-Value Settings =====
export async function getSetting(key, dbName = "notesdb") {
  const db = await getDB(dbName);
  const row = await db.get("settings", key);
  return row ? row.value : undefined;
}

export async function setSetting(key, value, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("settings", { key, value });
}

export async function deleteSetting(key, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.delete("settings", key);
}

export async function getAllSettings(dbName = "notesdb") {
  const db = await getDB(dbName);
  const rows = await db.getAll("settings");
  const obj = {};
  for (const row of rows) obj[row.key] = row.value;
  return obj;
}

// ===== Workspaces =====
const WORKSPACES_KEY = "noteapp_workspaces";
const ACTIVE_WORKSPACE_KEY = "noteapp_active_workspace";
const DEFAULT_WORKSPACE_KEY = "noteapp_default_workspace";

export function getWorkspaces() {
  const stored = localStorage.getItem(WORKSPACES_KEY);
  return stored ? JSON.parse(stored) : [{ name: "Default", dbName: "notesdb" }];
}

export function addWorkspace(name) {
  const workspaces = getWorkspaces();
  const dbName = "notesdb_" + name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (workspaces.some((w) => w.dbName === dbName)) return null;
  const workspace = { name, dbName };
  workspaces.push(workspace);
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  return workspace;
}

export function removeWorkspace(dbName) {
  if (dbName === "notesdb") return; // Can't delete default
  const workspaces = getWorkspaces().filter((w) => w.dbName !== dbName);
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  // If deleted workspace was the default, reset to "notesdb"
  if (getDefaultWorkspace() === dbName) {
    setDefaultWorkspace("notesdb");
  }
}

export function renameWorkspace(dbName, newName) {
  if (dbName === "notesdb") return; // Can't rename default
  const workspaces = getWorkspaces();
  const ws = workspaces.find((w) => w.dbName === dbName);
  if (ws) {
    ws.name = newName;
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
  }
}

export function getDefaultWorkspace() {
  return localStorage.getItem(DEFAULT_WORKSPACE_KEY) || "notesdb";
}

export function setDefaultWorkspace(dbName) {
  localStorage.setItem(DEFAULT_WORKSPACE_KEY, dbName);
}

export function getActiveWorkspace() {
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || getDefaultWorkspace();
}

export function setActiveWorkspace(dbName) {
  const oldDb = localStorage.getItem(ACTIVE_WORKSPACE_KEY) || getDefaultWorkspace();
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, dbName);
  // Close old connection so next operation opens the new DB
  if (oldDb && dbConnections.has(oldDb)) {
    dbConnections.get(oldDb).close();
    dbConnections.delete(oldDb);
  }
}

// Close DB (for cleanup)
export function closeDB() {
  for (const [name, db] of dbConnections) {
    db.close();
    dbConnections.delete(name);
  }
}

// ===== Archive =====
const ARCHIVE_DB = "notesdb_archive";
let archiveInstance = null;

async function getArchiveDB() {
  if (archiveInstance) return archiveInstance;
  archiveInstance = await openDB(ARCHIVE_DB, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("archived")) {
        const store = db.createObjectStore("archived", { keyPath: "noteid" });
        store.createIndex("archivedAt", "archivedAt");
      }
    },
  });
  return archiveInstance;
}

export async function archiveNote(note, sourceWorkspace) {
  const archiveDb = await getArchiveDB();
  const archivedNote = {
    ...note,
    archivedAt: Date.now(),
    sourceWorkspace: sourceWorkspace || "notesdb",
  };
  await archiveDb.put("archived", archivedNote);
}

export async function getArchivedNotes() {
  const archiveDb = await getArchiveDB();
  const notes = await archiveDb.getAll("archived");
  return notes.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
}

export async function restoreNoteFromArchive(noteid) {
  const archiveDb = await getArchiveDB();
  const note = await archiveDb.get("archived", noteid);
  if (!note) return null;
  const targetDb = note.sourceWorkspace || "notesdb";
  // Remove archive-specific fields
  const { archivedAt, sourceWorkspace, ...restoredNote } = note;
  restoredNote.updated_at = Date.now();
  // Add back to original workspace
  const db = await getDB(targetDb);
  await db.put("notes", restoredNote);
  // Remove from archive
  await archiveDb.delete("archived", noteid);
  return { note: restoredNote, workspace: targetDb };
}

export async function permanentlyDeleteArchived(noteid) {
  const archiveDb = await getArchiveDB();
  await archiveDb.delete("archived", noteid);
}

export async function getArchiveCount() {
  const archiveDb = await getArchiveDB();
  return (await archiveDb.getAll("archived")).length;
}

// Purge all archived notes
export async function purgeArchive() {
  const archiveDb = await getArchiveDB();
  const tx = archiveDb.transaction("archived", "readwrite");
  await tx.store.clear();
  await tx.done;
}

// ===== Snippets/Templates =====
export async function getAllSnippets(dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.getAll("snippets");
}

export async function addSnippet(snippet, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("snippets", snippet);
}

export async function updateSnippet(snippet, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.put("snippets", snippet);
}

export async function deleteSnippet(id, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.delete("snippets", id);
}

// Purge all notes in a specific workspace (keeps the workspace itself)
export async function purgeWorkspace(dbName) {
  const db = await getDB(dbName);
  const tx = db.transaction(["notes", "pinnedNotes", "images", "snippets", "tags", "settings"], "readwrite");
  await tx.objectStore("notes").clear();
  await tx.objectStore("pinnedNotes").clear();
  await tx.objectStore("images").clear();
  await tx.objectStore("snippets").clear();
  await tx.objectStore("tags").clear();
  await tx.objectStore("settings").clear();
  await tx.done;
}

// Delete a workspace entirely (remove DB + workspace entry)
export async function deleteWorkspaceDB(dbName) {
  if (dbName === "notesdb") return; // Can't delete default
  // Close connection if it's the active one
  if (dbInstance && currentDbName === dbName) {
    dbInstance.close();
    dbInstance = null;
    currentDbName = null;
  }
  // Delete the IndexedDB
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = resolve;
    req.onerror = reject;
    req.onblocked = resolve; // Proceed even if blocked
  });
  // Remove from workspace list
  removeWorkspace(dbName);
}

// Purge all workspaces (delete all non-default DBs, clear default)
export async function purgeAllWorkspaces() {
  const workspaces = getWorkspaces();
  // Delete all non-default workspace DBs
  for (const ws of workspaces) {
    if (ws.dbName !== "notesdb") {
      await deleteWorkspaceDB(ws.dbName);
    }
  }
  // Clear the default workspace
  await purgeWorkspace("notesdb");
  // Reset workspace list and default to original
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify([{ name: "Default", dbName: "notesdb" }]));
  setDefaultWorkspace("notesdb");
}

// ===== Version History =====

// Save a snapshot of a note (called on every save)
export async function saveVersion(note, dbName = "notesdb") {
  const db = await getDB(dbName);
  const version = {
    versionId: `${note.noteid}-${Date.now()}`,
    noteid: note.noteid,
    title: note.title,
    body: note.body,
    tags: note.tags || [],
    timestamp: Date.now(),
  };
  await db.put("versions", version);

  // Prune old versions beyond the limit
  const tx = db.transaction("versions", "readwrite");
  const index = tx.store.index("noteid");
  const allVersions = await index.getAll(note.noteid);
  if (allVersions.length > MAX_VERSIONS_PER_NOTE) {
    // Sort oldest first, delete excess
    allVersions.sort((a, b) => a.timestamp - b.timestamp);
    const toDelete = allVersions.slice(0, allVersions.length - MAX_VERSIONS_PER_NOTE);
    for (const v of toDelete) {
      await tx.store.delete(v.versionId);
    }
  }
  await tx.done;
  return version;
}

// Get all versions for a note (newest first)
export async function getVersions(noteid, dbName = "notesdb") {
  const db = await getDB(dbName);
  const index = db.transaction("versions").store.index("noteid");
  const versions = await index.getAll(noteid);
  return versions.sort((a, b) => b.timestamp - a.timestamp);
}

// Get a specific version
export async function getVersion(versionId, dbName = "notesdb") {
  const db = await getDB(dbName);
  return db.get("versions", versionId);
}

// Restore a version (overwrites the current note content)
export async function restoreVersion(versionId, dbName = "notesdb") {
  const db = await getDB(dbName);
  const version = await db.get("versions", versionId);
  if (!version) return null;
  const note = await db.get("notes", version.noteid);
  if (!note) return null;
  // Save current state as a version before restoring
  await saveVersion(note, dbName);
  // Overwrite note with version content
  note.title = version.title;
  note.body = version.body;
  note.tags = version.tags;
  note.updated_at = Date.now();
  await db.put("notes", note);
  return note;
}

// Delete all versions for a note
export async function deleteVersions(noteid, dbName = "notesdb") {
  const db = await getDB(dbName);
  const tx = db.transaction("versions", "readwrite");
  const index = tx.store.index("noteid");
  let cursor = await index.openCursor(noteid);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
