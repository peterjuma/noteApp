import { openDB } from "idb/with-async-ittr.js";

const DB_VERSION = 4;
let dbInstance = null;
let currentDbName = null;
const MAX_VERSIONS_PER_NOTE = 50;

// Get or create a singleton DB connection
async function getDB(dbName) {
  if (dbInstance && currentDbName === dbName) return dbInstance;
  if (dbInstance) dbInstance.close();

  dbInstance = await openDB(dbName, DB_VERSION, {
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
    },
  });
  currentDbName = dbName;
  return dbInstance;
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
  // Read note from source DB
  const fromConn = await getDB(fromDb);
  const note = await fromConn.get("notes", noteid);
  if (!note) return null;
  note.updated_at = Date.now();
  // Write note to target DB (this closes the source connection via singleton)
  const toConn = await getDB(toDb);
  await toConn.put("notes", note);
  // Re-open source DB to delete the original (closes the target connection)
  const reopenedFrom = await getDB(fromDb);
  await reopenedFrom.delete("notes", noteid);
  return note;
}

// ===== Workspaces =====
const WORKSPACES_KEY = "noteapp_workspaces";
const ACTIVE_WORKSPACE_KEY = "noteapp_active_workspace";

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

export function getActiveWorkspace() {
  return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || "notesdb";
}

export function setActiveWorkspace(dbName) {
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, dbName);
  // Close current connection so next operation opens the new DB
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    currentDbName = null;
  }
}

// Close DB (for cleanup)
export function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    currentDbName = null;
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

// Purge all notes in a specific workspace (keeps the workspace itself)
export async function purgeWorkspace(dbName) {
  const db = await getDB(dbName);
  const tx = db.transaction(["notes", "pinnedNotes", "images"], "readwrite");
  await tx.objectStore("notes").clear();
  await tx.objectStore("pinnedNotes").clear();
  await tx.objectStore("images").clear();
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
  // Reset workspace list to just default
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify([{ name: "Default", dbName: "notesdb" }]));
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
