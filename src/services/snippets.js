// Snippet/Template storage — persisted in IndexedDB per workspace
// Migrates from legacy localStorage on first load

import * as db from "./notesDB";

const LEGACY_KEY = "noteapp_snippets";

// Migrate legacy localStorage snippets to IndexedDB (once per workspace)
async function migrateLegacy(dbName) {
  const migKey = `noteapp_snippets_migrated_${dbName}`;
  if (localStorage.getItem(migKey)) return;
  try {
    const stored = localStorage.getItem(LEGACY_KEY);
    if (stored) {
      const snippets = JSON.parse(stored);
      for (const s of snippets) {
        await db.addSnippet(s, dbName);
      }
    }
  } catch {
    // ignore parse errors
  }
  localStorage.removeItem(LEGACY_KEY);
  localStorage.setItem(migKey, "1");
}

export async function getSnippets(dbName = "notesdb") {
  await migrateLegacy(dbName);
  return db.getAllSnippets(dbName);
}

export async function addSnippet(name, content, category, dbName = "notesdb") {
  const snippet = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    content,
    category: category || "general",
    created_at: Date.now(),
  };
  await db.addSnippet(snippet, dbName);
  return snippet;
}

export async function updateSnippet(id, updates, dbName = "notesdb") {
  const snippets = await db.getAllSnippets(dbName);
  const existing = snippets.find((s) => s.id === id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await db.updateSnippet(updated, dbName);
  return updated;
}

export async function deleteSnippet(id, dbName = "notesdb") {
  await db.deleteSnippet(id, dbName);
}

export async function getSnippetsByCategory(category, dbName = "notesdb") {
  const all = await db.getAllSnippets(dbName);
  return all.filter((s) => s.category === category);
}

// Default templates — inserted on first use if no snippets exist
export function getDefaultSnippets() {
  return [
    {
      id: "default-greeting",
      name: "Greeting",
      content: "Hi {{customer_name}},\n\nThank you for reaching out to us.\n\n",
      category: "zendesk",
      created_at: Date.now(),
    },
    {
      id: "default-escalation",
      name: "Escalation",
      content: "I've escalated this to our engineering team for further investigation. Ticket reference: {{ticket_id}}.\n\nYou can expect an update within 24-48 hours.\n\n",
      category: "zendesk",
      created_at: Date.now(),
    },
    {
      id: "default-closure",
      name: "Closure",
      content: "I'm glad we could resolve this for you. If you have any further questions, don't hesitate to reach out.\n\nBest regards",
      category: "zendesk",
      created_at: Date.now(),
    },
    {
      id: "default-followup",
      name: "Follow Up",
      content: "Hi {{customer_name}},\n\nJust following up on our previous conversation regarding {{ticket_id}}.\n\nHave you had a chance to try the solution we suggested? Please let us know if you need any further assistance.\n\n",
      category: "zendesk",
      created_at: Date.now(),
    },
  ];
}

// Seed defaults if storage is empty
export async function ensureDefaults(dbName = "notesdb") {
  const snippets = await getSnippets(dbName);
  if (snippets.length === 0) {
    const defaults = getDefaultSnippets();
    for (const s of defaults) {
      await db.addSnippet(s, dbName);
    }
    return defaults;
  }
  return snippets;
}

// Bulk import snippets (used by zip import)
export async function importSnippets(snippets, dbName = "notesdb") {
  const existing = await db.getAllSnippets(dbName);
  const existingIds = new Set(existing.map((s) => s.id));
  let imported = 0;
  for (const s of snippets) {
    if (!existingIds.has(s.id)) {
      await db.addSnippet(s, dbName);
      imported++;
    }
  }
  return imported;
}
