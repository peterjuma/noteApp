import {
  getSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  ensureDefaults,
  getDefaultSnippets,
} from "../services/snippets";

const STORAGE_KEY = "noteapp_snippets";

beforeEach(() => {
  localStorage.clear();
});

describe("snippets service", () => {
  test("getSnippets returns empty array when no data", () => {
    expect(getSnippets()).toEqual([]);
  });

  test("ensureDefaults seeds default snippets on first call", () => {
    const snippets = ensureDefaults();
    expect(snippets.length).toBe(getDefaultSnippets().length);
    expect(snippets[0].name).toBe("Greeting");
  });

  test("ensureDefaults returns existing snippets on subsequent calls", () => {
    addSnippet("Custom", "content", "general");
    const snippets = ensureDefaults();
    expect(snippets.length).toBe(1);
    expect(snippets[0].name).toBe("Custom");
  });

  test("addSnippet creates a snippet with correct fields", () => {
    const snippet = addSnippet("Test Template", "Hello {{name}}", "zendesk");
    expect(snippet.id).toBeDefined();
    expect(snippet.name).toBe("Test Template");
    expect(snippet.content).toBe("Hello {{name}}");
    expect(snippet.category).toBe("zendesk");
    expect(snippet.created_at).toBeDefined();

    const all = getSnippets();
    expect(all.length).toBe(1);
  });

  test("updateSnippet modifies existing snippet", () => {
    const snippet = addSnippet("Original", "body", "general");
    updateSnippet(snippet.id, { name: "Updated", content: "new body" });
    const all = getSnippets();
    expect(all[0].name).toBe("Updated");
    expect(all[0].content).toBe("new body");
    expect(all[0].category).toBe("general"); // unchanged
  });

  test("updateSnippet returns null for nonexistent id", () => {
    const result = updateSnippet("nonexistent", { name: "X" });
    expect(result).toBeNull();
  });

  test("deleteSnippet removes a snippet", () => {
    const s1 = addSnippet("One", "a", "general");
    addSnippet("Two", "b", "general");
    expect(getSnippets().length).toBe(2);
    deleteSnippet(s1.id);
    const all = getSnippets();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe("Two");
  });

  test("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json");
    expect(getSnippets()).toEqual([]);
  });
});
