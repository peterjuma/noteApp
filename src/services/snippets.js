// Snippet/Template storage — persisted in localStorage
// Snippets are global (not workspace-specific)

const STORAGE_KEY = "noteapp_snippets";

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function save(snippets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
}

export function getSnippets() {
  return load();
}

export function addSnippet(name, content, category) {
  const snippets = load();
  const snippet = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    content,
    category: category || "general",
    created_at: Date.now(),
  };
  snippets.push(snippet);
  save(snippets);
  return snippet;
}

export function updateSnippet(id, updates) {
  const snippets = load();
  const idx = snippets.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  snippets[idx] = { ...snippets[idx], ...updates };
  save(snippets);
  return snippets[idx];
}

export function deleteSnippet(id) {
  const snippets = load().filter((s) => s.id !== id);
  save(snippets);
}

export function getSnippetsByCategory(category) {
  return load().filter((s) => s.category === category);
}

// Default templates — inserted on first use if no snippets exist
export function getDefaultSnippets() {
  return [
    {
      id: "default-greeting",
      name: "Greeting",
      content: "Hi {{customer_name}},\n\nThank you for reaching out to us.\n\n",
      category: "zendesk",
    },
    {
      id: "default-escalation",
      name: "Escalation",
      content: "I've escalated this to our engineering team for further investigation. Ticket reference: {{ticket_id}}.\n\nYou can expect an update within 24-48 hours.\n\n",
      category: "zendesk",
    },
    {
      id: "default-closure",
      name: "Closure",
      content: "I'm glad we could resolve this for you. If you have any further questions, don't hesitate to reach out.\n\nBest regards",
      category: "zendesk",
    },
    {
      id: "default-followup",
      name: "Follow Up",
      content: "Hi {{customer_name}},\n\nJust following up on our previous conversation regarding {{ticket_id}}.\n\nHave you had a chance to try the solution we suggested? Please let us know if you need any further assistance.\n\n",
      category: "zendesk",
    },
  ];
}

// Seed defaults if storage is empty
export function ensureDefaults() {
  const snippets = load();
  if (snippets.length === 0) {
    const defaults = getDefaultSnippets();
    save(defaults);
    return defaults;
  }
  return snippets;
}
