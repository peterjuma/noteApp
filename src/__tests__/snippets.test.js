import {
  getSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  ensureDefaults,
  getDefaultSnippets,
  importSnippets,
} from "../services/snippets";

// Variables prefixed with `mock` can be referenced inside jest.mock factories
const mockStore = { data: [] };

jest.mock("../services/notesDB", () => ({
  getAllSnippets: () => Promise.resolve([...mockStore.data]),
  addSnippet: (s) => { mockStore.data.push(s); return Promise.resolve(); },
  updateSnippet: (s) => {
    const idx = mockStore.data.findIndex((x) => x.id === s.id);
    if (idx >= 0) mockStore.data[idx] = s;
    return Promise.resolve();
  },
  deleteSnippet: (id) => {
    mockStore.data = mockStore.data.filter((s) => s.id !== id);
    return Promise.resolve();
  },
  getActiveWorkspace: () => "notesdb",
}));

beforeEach(() => {
  mockStore.data = [];
  localStorage.clear();
  localStorage.setItem("noteapp_snippets_migrated_notesdb", "1");
});

describe("snippets service (IndexedDB)", () => {
  test("getSnippets returns empty array when no data", async () => {
    expect(await getSnippets("notesdb")).toEqual([]);
  });

  test("ensureDefaults seeds default snippets on first call", async () => {
    const snippets = await ensureDefaults("notesdb");
    expect(snippets.length).toBe(getDefaultSnippets().length);
    expect(snippets[0].name).toBe("Greeting");
  });

  test("ensureDefaults returns existing snippets on subsequent calls", async () => {
    await addSnippet("Custom", "content", "general", "notesdb");
    const snippets = await ensureDefaults("notesdb");
    expect(snippets.length).toBe(1);
    expect(snippets[0].name).toBe("Custom");
  });

  test("addSnippet creates a snippet with correct fields", async () => {
    const snippet = await addSnippet("Test Template", "Hello {{name}}", "zendesk", "notesdb");
    expect(snippet.id).toBeDefined();
    expect(snippet.name).toBe("Test Template");
    expect(snippet.content).toBe("Hello {{name}}");
    expect(snippet.category).toBe("zendesk");
    expect(snippet.created_at).toBeDefined();

    const all = await getSnippets("notesdb");
    expect(all.length).toBe(1);
  });

  test("updateSnippet modifies existing snippet", async () => {
    const snippet = await addSnippet("Original", "body", "general", "notesdb");
    await updateSnippet(snippet.id, { name: "Updated", content: "new body" }, "notesdb");
    const all = await getSnippets("notesdb");
    expect(all[0].name).toBe("Updated");
    expect(all[0].content).toBe("new body");
    expect(all[0].category).toBe("general"); // unchanged
  });

  test("updateSnippet returns null for nonexistent id", async () => {
    const result = await updateSnippet("nonexistent", { name: "X" }, "notesdb");
    expect(result).toBeNull();
  });

  test("deleteSnippet removes a snippet", async () => {
    const s1 = await addSnippet("One", "a", "general", "notesdb");
    await addSnippet("Two", "b", "general", "notesdb");
    expect((await getSnippets("notesdb")).length).toBe(2);
    await deleteSnippet(s1.id, "notesdb");
    const all = await getSnippets("notesdb");
    expect(all.length).toBe(1);
    expect(all[0].name).toBe("Two");
  });

  test("importSnippets skips duplicates by id", async () => {
    const s = await addSnippet("Existing", "body", "general", "notesdb");
    const count = await importSnippets([
      { id: s.id, name: "Dup", content: "x", category: "general" },
      { id: "new-one", name: "New", content: "y", category: "general" },
    ], "notesdb");
    expect(count).toBe(1);
    expect((await getSnippets("notesdb")).length).toBe(2);
  });
});
