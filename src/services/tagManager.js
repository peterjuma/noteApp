// Tag Manager — IndexedDB-based per-workspace tag registry
// Tags stored as: [{ name: "api", color: "#..." }, ...]

import * as db from "./notesDB";

const LEGACY_KEY = "noteapp_predefined_tags";
const LEGACY_HARVEST_KEY = "noteapp_tag_auto_harvest";

// Migrate legacy localStorage tags to IndexedDB (once per workspace)
async function migrateLegacy(dbName) {
  const migKey = `noteapp_tags_migrated_${dbName}`;
  if (localStorage.getItem(migKey)) return;
  try {
    const stored = localStorage.getItem(LEGACY_KEY);
    if (stored) {
      const tags = JSON.parse(stored);
      for (const t of tags) {
        await db.putTag(t, dbName);
      }
    }
    // Migrate auto-harvest setting
    const harvest = localStorage.getItem(LEGACY_HARVEST_KEY);
    if (harvest !== null) {
      await db.setSetting("tag_auto_harvest", harvest !== "false", dbName);
    }
  } catch {
    // ignore
  }
  localStorage.setItem(migKey, "1");
}

export async function getPredefinedTags(dbName = "notesdb") {
  await migrateLegacy(dbName);
  return db.getAllTags(dbName);
}

export async function savePredefinedTags(tags, dbName = "notesdb") {
  await db.clearTags(dbName);
  for (const t of tags) {
    await db.putTag(t, dbName);
  }
}

export async function addPredefinedTag(name, color = null, dbName = "notesdb") {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return getPredefinedTags(dbName);
  const tags = await getPredefinedTags(dbName);
  if (tags.some((t) => t.name === normalized)) return tags;
  await db.putTag({ name: normalized, color }, dbName);
  return [...tags, { name: normalized, color }];
}

export async function removePredefinedTag(name, dbName = "notesdb") {
  await db.deleteTag(name, dbName);
  return getPredefinedTags(dbName);
}

export async function renamePredefinedTag(oldName, newName, dbName = "notesdb") {
  const normalized = newName.trim().toLowerCase();
  if (!normalized) return getPredefinedTags(dbName);
  const tags = await getPredefinedTags(dbName);
  await db.deleteTag(oldName, dbName);
  const oldTag = tags.find((t) => t.name === oldName);
  await db.putTag({ name: normalized, color: oldTag?.color || null }, dbName);
  return tags.map((t) => t.name === oldName ? { ...t, name: normalized } : t);
}

export async function updateTagColor(name, color, dbName = "notesdb") {
  const tags = await getPredefinedTags(dbName);
  const tag = tags.find((t) => t.name === name);
  if (tag) {
    await db.putTag({ ...tag, color }, dbName);
  }
  return tags.map((t) => t.name === name ? { ...t, color } : t);
}

export async function isAutoHarvestEnabled(dbName = "notesdb") {
  await migrateLegacy(dbName);
  const val = await db.getSetting("tag_auto_harvest", dbName);
  return val !== false; // default true
}

export async function setAutoHarvest(enabled, dbName = "notesdb") {
  await db.setSetting("tag_auto_harvest", enabled, dbName);
}

// Collect all unique tags used across notes (for usage counts)
export function getTagUsageCounts(allNotes) {
  const counts = {};
  for (const note of allNotes) {
    for (const tag of note.tags || []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return counts;
}

// Auto-harvest: add any new tags from a note to the global list
export async function harvestTags(tags, dbName = "notesdb") {
  const enabled = await isAutoHarvestEnabled(dbName);
  if (!enabled) return;
  const predefined = await getPredefinedTags(dbName);
  const names = new Set(predefined.map((t) => t.name));
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !names.has(normalized)) {
      await db.putTag({ name: normalized, color: null }, dbName);
      names.add(normalized);
    }
  }
}

// Preset color palette for tags
export const TAG_COLORS = [
  null,       // default (no color)
  "#ef4444",  // red
  "#f97316",  // orange
  "#eab308",  // yellow
  "#22c55e",  // green
  "#0ea5e9",  // blue
  "#8b5cf6",  // purple
  "#ec4899",  // pink
];
