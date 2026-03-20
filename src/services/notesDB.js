import { openDB } from "idb/with-async-ittr.js";

const DB_VERSION = 3;
let dbInstance = null;
let currentDbName = null;

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
