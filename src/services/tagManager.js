// Tag Manager — localStorage-based global tag registry
// Tags stored as: [{ name: "api", color: "#..." }, ...]

const STORAGE_KEY = "noteapp_predefined_tags";
const AUTO_HARVEST_KEY = "noteapp_tag_auto_harvest";

export function getPredefinedTags() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function savePredefinedTags(tags) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
}

export function addPredefinedTag(name, color = null) {
  const tags = getPredefinedTags();
  const normalized = name.trim().toLowerCase();
  if (!normalized || tags.some((t) => t.name === normalized)) return tags;
  const updated = [...tags, { name: normalized, color }];
  savePredefinedTags(updated);
  return updated;
}

export function removePredefinedTag(name) {
  const tags = getPredefinedTags().filter((t) => t.name !== name);
  savePredefinedTags(tags);
  return tags;
}

export function renamePredefinedTag(oldName, newName) {
  const normalized = newName.trim().toLowerCase();
  if (!normalized) return getPredefinedTags();
  const tags = getPredefinedTags().map((t) =>
    t.name === oldName ? { ...t, name: normalized } : t
  );
  savePredefinedTags(tags);
  return tags;
}

export function updateTagColor(name, color) {
  const tags = getPredefinedTags().map((t) =>
    t.name === name ? { ...t, color } : t
  );
  savePredefinedTags(tags);
  return tags;
}

export function isAutoHarvestEnabled() {
  return localStorage.getItem(AUTO_HARVEST_KEY) !== "false";
}

export function setAutoHarvest(enabled) {
  localStorage.setItem(AUTO_HARVEST_KEY, String(enabled));
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
export function harvestTags(tags) {
  if (!isAutoHarvestEnabled()) return;
  const predefined = getPredefinedTags();
  const names = new Set(predefined.map((t) => t.name));
  let changed = false;
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !names.has(normalized)) {
      predefined.push({ name: normalized, color: null });
      names.add(normalized);
      changed = true;
    }
  }
  if (changed) savePredefinedTags(predefined);
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
