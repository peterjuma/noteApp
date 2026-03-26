import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock NoteEditor (uses CodeMirror ESM which Jest can't parse)
jest.mock("../NoteEditor", () => {
  return function MockNoteEditor(props) {
    return (
      <div data-testid="note-editor">
        <input
          name="notetitle"
          id="notetitle"
          placeholder="Untitled"
          data-action={props.editNoteData.action}
          defaultValue={props.editNoteData.notetitle}
        />
        <textarea
          data-testid="note-body"
          defaultValue={props.editNoteData.notebody}
        />
        <button onClick={(e) => {
          const note = { ...props.editNoteData };
          note.notetitle = "Test Title";
          note.notebody = "Test Body";
          props.handleSaveNote(e, note);
        }}>Save</button>
        <button onClick={() => props.handleClickHomeBtn()}>Cancel</button>
      </div>
    );
  };
});

// Mock lazy-loaded components
jest.mock("../SettingsPanel", () => {
  return function MockSettings(props) {
    return (
      <div data-testid="settings-panel">
        <h2>Settings</h2>
        <span>Appearance</span>
        <span>Dark Mode</span>
        <button role="switch" aria-label="dark-mode" onClick={props.onToggleDarkMode}>Toggle Dark</button>
        <button onClick={props.onClose}>Close</button>
      </div>
    );
  };
});

jest.mock("../VersionHistory", () => {
  return function MockVersionHistory(props) {
    return (
      <div data-testid="version-history">
        <button onClick={props.onClose}>Close History</button>
      </div>
    );
  };
});

jest.mock("../TableConverter", () => {
  return function MockTableConverter(props) {
    return (
      <div data-testid="table-converter">
        <h3>Table Converter</h3>
        <button onClick={props.onClose}>Back to Notes</button>
      </div>
    );
  };
});

// Mock notesDB service
const mockNotes = [
  { noteid: "1", title: "First Note", body: "Body of first note", tags: ["test"], created_at: 1000, updated_at: 2000 },
  { noteid: "2", title: "Second Note", body: "Body of second note with **markdown**", tags: ["demo"], created_at: 1500, updated_at: 2500 },
];

jest.mock("../services/notesDB", () => {
  const defaultWorkspaces = [{ name: "Default", dbName: "notesdb" }];
  return {
    getAllNotes: jest.fn(() => Promise.resolve([...mockNotes])),
    getAllPins: jest.fn(() => Promise.resolve([])),
    getNote: jest.fn((id) => Promise.resolve(mockNotes.find((n) => n.noteid === id))),
    addNote: jest.fn(() => Promise.resolve()),
    updateNote: jest.fn(() => Promise.resolve()),
    deleteNote: jest.fn(() => Promise.resolve()),
    saveVersion: jest.fn(() => Promise.resolve()),
    getVersions: jest.fn(() => Promise.resolve([])),
    getWorkspaces: jest.fn(() => [...defaultWorkspaces]),
    getActiveWorkspace: jest.fn(() => "notesdb"),
    setActiveWorkspace: jest.fn(),
    addWorkspace: jest.fn((name) => ({ name, dbName: "notesdb_" + name.toLowerCase() })),
    removeWorkspace: jest.fn(),
    renameWorkspace: jest.fn(),
    getArchivedNotes: jest.fn(() => Promise.resolve([])),
    archiveNote: jest.fn(() => Promise.resolve()),
    permanentlyDeleteArchived: jest.fn(() => Promise.resolve()),
    restoreNoteFromArchive: jest.fn(() => Promise.resolve()),
    saveImage: jest.fn(() => Promise.resolve()),
    getImageURL: jest.fn(() => Promise.resolve(null)),
    moveNote: jest.fn(() => Promise.resolve()),
    purgeArchive: jest.fn(() => Promise.resolve()),
    purgeWorkspace: jest.fn(() => Promise.resolve()),
    purgeAllWorkspaces: jest.fn(() => Promise.resolve()),
    deleteWorkspaceDB: jest.fn(() => Promise.resolve()),
    addPin: jest.fn(() => Promise.resolve()),
    removePin: jest.fn(() => Promise.resolve()),
  };
});

// Mock gistSync
jest.mock("../services/gistSync", () => ({
  isSyncEnabled: jest.fn(() => false),
  push: jest.fn(() => Promise.resolve()),
  getToken: jest.fn(() => ""),
  getLastSync: jest.fn(() => null),
  getGistId: jest.fn(() => null),
  getSyncInterval: jest.fn(() => 0),
  setSyncInterval: jest.fn(),
}));

// Mock README.md import (CRA treats it as a file URL)
jest.mock("../README.md", () => "mock-readme-path");

// Mock file-saver
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));

// Mock fetch
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve("# Welcome\\nThis is the home page."),
    })
  );
});

// Suppress mermaid and clipboard errors in test
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    write: jest.fn(() => Promise.resolve()),
  },
  writable: true,
});

import App from "../App";

// Patch: render App without React.StrictMode to avoid double-mount issues with class component
// (Class components with setState in componentDidMount callbacks don't work well with strict mode double-invoke)
function AppWithoutStrictMode() {
  return <App />;
}

// Helper to render App and wait for initial load
async function renderApp() {
  let result;
  await act(async () => {
    result = render(<AppWithoutStrictMode />);
  });
  // Let componentDidMount async operations settle
  await act(async () => {
    await new Promise((r) => setTimeout(r, 200));
  });
  return result;
}

describe("App integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  // ===== Initial Load =====

  test("renders app with sidebar", async () => {
    await renderApp();
    expect(screen.getByLabelText("Go to home page")).toBeInTheDocument();
  });

  test("renders sort dropdown", async () => {
    await renderApp();
    expect(screen.getByLabelText("Sort notes by")).toBeInTheDocument();
  });

  // ===== Sidebar Navigation =====

  test("home button is clickable", async () => {
    await renderApp();
    const homeBtn = screen.getByLabelText("Go to home page");
    await act(async () => {
      fireEvent.click(homeBtn);
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  test("settings button triggers state change", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });
    // Settings lazy loads - wait for the panel to appear
    await waitFor(() => {
      expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test("settings shows General content", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });
    await waitFor(() => {
      expect(screen.getByText("Appearance")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  // ===== Editor =====

  test("new note button creates editor", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Create new note"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Untitled")).toBeInTheDocument();
    });
  });

  // ===== Search =====

  test("search toggle shows search input", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Toggle search"));
    });
    expect(screen.getByLabelText("Search notes")).toBeInTheDocument();
  });

  // ===== Sidebar Collapse =====

  test("sidebar collapse persists to localStorage", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Collapse sidebar"));
    });
    expect(localStorage.getItem("noteapp_sidebar_collapsed")).toBe("true");
  });

  test("collapsed sidebar shows expand button", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Collapse sidebar"));
    });
    expect(screen.getByLabelText("Expand sidebar")).toBeInTheDocument();
  });

  // ===== Navigation Guard =====

  test("switching from editor to settings triggers nav confirm", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Create new note"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Untitled")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });
    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    });
  });

  test("Keep Editing dismisses nav dialog", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Create new note"));
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Untitled")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });
    await waitFor(() => {
      expect(screen.getByText("Keep Editing")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Keep Editing"));
    });
    expect(screen.getByPlaceholderText("Untitled")).toBeInTheDocument();
  });

  // ===== Settings Toggles =====

  test("dark mode toggle persists to localStorage", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });
    await waitFor(() => {
      expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    }, { timeout: 2000 });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("dark-mode"));
    });
    expect(localStorage.getItem("noteapp_dark_mode")).toBe("true");
  });

  // ===== Table Converter =====

  test("table converter button loads TC page", async () => {
    await renderApp();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Table Converter"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("table-converter")).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
