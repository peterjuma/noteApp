import {
  getToken,
  setToken,
  clearToken,
  isSyncEnabled,
  setSyncEnabled,
  getGistId,
  getLastSync,
  mergeNotes,
} from "../services/gistSync";

beforeEach(() => {
  localStorage.clear();
});

describe("gistSync service", () => {
  describe("token management", () => {
    test("getToken returns empty string when not set", () => {
      expect(getToken()).toBe("");
    });

    test("setToken stores and retrieves token", () => {
      setToken("ghp_test123");
      expect(getToken()).toBe("ghp_test123");
    });

    test("setToken trims whitespace", () => {
      setToken("  ghp_test123  ");
      expect(getToken()).toBe("ghp_test123");
    });

    test("clearToken removes the token", () => {
      setToken("ghp_test123");
      clearToken();
      expect(getToken()).toBe("");
    });
  });

  describe("sync enabled", () => {
    test("isSyncEnabled returns false when no token", () => {
      setSyncEnabled(true);
      expect(isSyncEnabled()).toBe(false);
    });

    test("isSyncEnabled returns true when enabled with token", () => {
      setToken("ghp_test123");
      setSyncEnabled(true);
      expect(isSyncEnabled()).toBe(true);
    });

    test("isSyncEnabled returns false when disabled", () => {
      setToken("ghp_test123");
      setSyncEnabled(false);
      expect(isSyncEnabled()).toBe(false);
    });
  });

  describe("gist ID management", () => {
    test("getGistId returns null for unknown workspace", () => {
      expect(getGistId("notesdb")).toBeNull();
    });
  });

  describe("last sync", () => {
    test("getLastSync returns null when never synced", () => {
      expect(getLastSync("notesdb")).toBeNull();
    });
  });

  describe("mergeNotes", () => {
    test("merges local-only notes", () => {
      const local = [{ noteid: "1", title: "A", body: "a", updated_at: 100 }];
      const remote = [];
      const { notes } = mergeNotes(local, remote);
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe("A");
    });

    test("merges remote-only notes", () => {
      const local = [];
      const remote = [{ noteid: "2", title: "B", body: "b", updated_at: 200 }];
      const { notes } = mergeNotes(local, remote);
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe("B");
    });

    test("newest-wins for same note", () => {
      const local = [{ noteid: "1", title: "Old", body: "old", updated_at: 100 }];
      const remote = [{ noteid: "1", title: "New", body: "new", updated_at: 200 }];
      const { notes } = mergeNotes(local, remote);
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe("New");
    });

    test("local wins when newer", () => {
      const local = [{ noteid: "1", title: "Local", body: "l", updated_at: 300 }];
      const remote = [{ noteid: "1", title: "Remote", body: "r", updated_at: 200 }];
      const { notes } = mergeNotes(local, remote);
      expect(notes[0].title).toBe("Local");
    });

    test("merges both local and remote notes", () => {
      const local = [
        { noteid: "1", title: "Local Only", body: "a", updated_at: 100 },
        { noteid: "3", title: "Shared", body: "old", updated_at: 100 },
      ];
      const remote = [
        { noteid: "2", title: "Remote Only", body: "b", updated_at: 200 },
        { noteid: "3", title: "Shared Updated", body: "new", updated_at: 300 },
      ];
      const { notes } = mergeNotes(local, remote);
      expect(notes.length).toBe(3);
      expect(notes.find((n) => n.noteid === "3").title).toBe("Shared Updated");
    });
  });
});
