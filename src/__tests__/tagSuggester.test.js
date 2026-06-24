import { suggestTags } from "../services/tagSuggester";

describe("tagSuggester service", () => {
  test("returns empty array for empty content", () => {
    expect(suggestTags("", "", [])).toEqual([]);
  });

  test("suggests tags based on title keywords", () => {
    const tags = suggestTags("JavaScript Tutorial", "Learn about functions and closures", []);
    expect(tags.length).toBeGreaterThan(0);
  });

  test("does not suggest already-applied tags", () => {
    const tags = suggestTags("JavaScript Tutorial", "Learn about functions", ["javascript"]);
    expect(tags).not.toContain("javascript");
  });

  test("detects code language from fenced blocks", () => {
    const body = "Here is some code:\n```python\nprint('hello')\n```";
    const tags = suggestTags("Code Sample", body, []);
    expect(tags).toContain("python");
  });

  test("returns at most a reasonable number of tags", () => {
    const tags = suggestTags(
      "React GitHub API OAuth Kubernetes Docker CI/CD Pipeline",
      "This covers React hooks, GitHub Actions, OAuth integration, Docker containers, Kubernetes deployments, and CI/CD pipelines with testing and monitoring.",
      []
    );
    expect(tags.length).toBeLessThanOrEqual(10);
  });
});
