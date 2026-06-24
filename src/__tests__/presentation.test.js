import { splitSlides, extractNotes, parseDeck } from "../services/slides";
describe("splitSlides", () => {
  test("returns a single slide when there are no separators", () => {
    expect(splitSlides("# Hello\n\nSome content")).toEqual(["# Hello\n\nSome content"]);
  });

  test("splits on horizontal-rule separators", () => {
    const md = "# One\n\n---\n\n# Two\n\n---\n\n# Three";
    expect(splitSlides(md)).toEqual(["# One", "# Two", "# Three"]);
  });

  test("ignores empty slides created by leading/trailing separators", () => {
    const md = "---\n# Only\n---";
    expect(splitSlides(md)).toEqual(["# Only"]);
  });

  test("supports *** and ___ separators", () => {
    expect(splitSlides("a\n***\nb\n___\nc")).toEqual(["a", "b", "c"]);
  });

  test("does not split inside fenced code blocks", () => {
    const md = "# Code\n\n```\n---\nnot a slide break\n```\n\n---\n\n# Next";
    expect(splitSlides(md)).toEqual([
      "# Code\n\n```\n---\nnot a slide break\n```",
      "# Next",
    ]);
  });

  test("does not treat setext heading underlines as separators by themselves", () => {
    // A single dash line under text would not be a thematic break (needs 3+)
    const md = "Title\n-\nbody";
    expect(splitSlides(md)).toEqual(["Title\n-\nbody"]);
  });

  test("returns one empty slide for empty input", () => {
    expect(splitSlides("")).toEqual([""]);
    expect(splitSlides("   ")).toEqual([""]);
  });

  test("handles CRLF line endings", () => {
    expect(splitSlides("a\r\n---\r\nb")).toEqual(["a", "b"]);
  });

  test("falls back to splitting on ## headings when there are no separators", () => {
    const md = "# Deck\n\n## One\n\ntext one\n\n## Two\n\ntext two";
    expect(splitSlides(md)).toEqual([
      "# Deck",
      "## One\n\ntext one",
      "## Two\n\ntext two",
    ]);
  });

  test("does not heading-split a note with a single ## heading", () => {
    const md = "# Deck\n\n## Only\n\nbody";
    expect(splitSlides(md)).toEqual(["# Deck\n\n## Only\n\nbody"]);
  });

  test("prefers explicit --- separators over heading fallback", () => {
    const md = "## One\n## Two\n\n---\n\n## Three";
    expect(splitSlides(md)).toEqual(["## One\n## Two", "## Three"]);
  });

  test("strips leading Marp/YAML frontmatter before splitting", () => {
    const md = "---\nmarp: true\ntitle: My Deck\npaginate: true\n---\n\n# One\n\n---\n\n# Two";
    expect(splitSlides(md)).toEqual(["# One", "# Two"]);
  });

  test("does not treat horizontal rules around plain markdown as frontmatter", () => {
    expect(splitSlides("---\n# Only\n---")).toEqual(["# Only"]);
  });

  test("strips frontmatter with CRLF line endings", () => {
    const md = "---\r\ntitle: Deck\r\n---\r\n\r\n# Slide";
    expect(splitSlides(md)).toEqual(["# Slide"]);
  });
});

describe("extractNotes", () => {
  test("returns content unchanged when there are no notes", () => {
    expect(extractNotes("# Slide\n\nBody")).toEqual({ content: "# Slide\n\nBody", notes: "" });
  });

  test("extracts remark-style notes after a lone ??? line", () => {
    const slide = "# Slide\n\nVisible body\n\n???\n\nSpeak about the body here.";
    expect(extractNotes(slide)).toEqual({
      content: "# Slide\n\nVisible body",
      notes: "Speak about the body here.",
    });
  });

  test("extracts HTML comment notes and strips the note label", () => {
    const slide = "# Slide\n\nBody\n\n<!-- note: remember the punchline -->";
    expect(extractNotes(slide)).toEqual({
      content: "# Slide\n\nBody",
      notes: "remember the punchline",
    });
  });

  test("merges multiple comment notes", () => {
    const slide = "<!-- first -->\n# Slide\n<!-- second -->";
    const result = extractNotes(slide);
    expect(result.content).toBe("# Slide");
    expect(result.notes).toBe("first\n\nsecond");
  });

  test("combines ??? notes and comment notes", () => {
    const slide = "# Slide\n<!-- a -->\n???\nb";
    const result = extractNotes(slide);
    expect(result.content).toBe("# Slide");
    expect(result.notes).toContain("a");
    expect(result.notes).toContain("b");
  });
});

describe("parseDeck", () => {
  test("returns one entry per slide with parsed notes", () => {
    const md = "# One\n\n???\n\nnote one\n\n---\n\n# Two";
    expect(parseDeck(md)).toEqual([
      { content: "# One", notes: "note one" },
      { content: "# Two", notes: "" },
    ]);
  });
});

