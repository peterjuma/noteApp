import { md2html, html2md } from "../useMarkDown";

describe("useMarkDown", () => {
  describe("md2html rendering", () => {
    test("renders basic markdown", () => {
      const result = md2html.render("**bold**");
      expect(result).toContain("<strong>bold</strong>");
    });

    test("renders code blocks with language class", () => {
      const result = md2html.render("```javascript\nconst x = 1;\n```");
      expect(result).toContain("language-javascript");
    });

    test("renders task lists", () => {
      const result = md2html.render("- [x] Done\n- [ ] Todo");
      expect(result).toContain('type="checkbox"');
    });

    test("renders emoji shortcodes", () => {
      const result = md2html.render(":heart:");
      expect(result).toContain("❤️");
    });

    test("renders footnotes", () => {
      const result = md2html.render("Text[^1]\n\n[^1]: Footnote content");
      expect(result).toContain("footnote");
    });

    test("renders wiki links", () => {
      const result = md2html.render("See [[My Note]] for details");
      expect(result).toContain("wiki-link");
      expect(result).toContain("My Note");
    });

    test("renders mermaid blocks without highlighting", () => {
      const result = md2html.render("```mermaid\ngraph TD\n  A-->B\n```");
      expect(result).toContain("language-mermaid");
      expect(result).not.toContain("hljs-keyword");
    });

    test("renders tables", () => {
      const result = md2html.render("| A | B |\n|---|---|\n| 1 | 2 |");
      expect(result).toContain("<table>");
      expect(result).toContain("<th>");
    });

    test("linkifies URLs", () => {
      const result = md2html.render("Visit https://example.com");
      expect(result).toContain('href="https://example.com"');
    });
  });

  describe("html2md (Turndown)", () => {
    test("converts HTML to markdown", () => {
      const result = html2md.turndown("<strong>bold</strong>");
      expect(result).toBe("**bold**");
    });

    test("converts HTML list to markdown", () => {
      const result = html2md.turndown("<ul><li>Item 1</li><li>Item 2</li></ul>");
      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
      expect(result).toContain("-");
    });

    test("handles Zendesk div wrappers in list items", () => {
      const result = html2md.turndown("<ul><li><div>Content</div></li></ul>");
      expect(result).toContain("Content");
      expect(result).not.toContain("<div>");
    });
  });
});
