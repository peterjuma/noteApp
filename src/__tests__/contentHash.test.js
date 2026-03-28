import { computeContentHash, buildHashSet } from "../services/contentHash";

// Polyfill crypto.subtle and TextEncoder for Jest (jsdom)
beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    const { webcrypto } = require("crypto");
    globalThis.crypto = webcrypto;
  }
  if (typeof globalThis.TextEncoder === "undefined") {
    const { TextEncoder } = require("util");
    globalThis.TextEncoder = TextEncoder;
  }
});

describe("contentHash service", () => {
  describe("computeContentHash", () => {
    test("returns a 64-char hex string (SHA-256)", async () => {
      const hash = await computeContentHash("Hello", "World");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    test("same input produces the same hash", async () => {
      const a = await computeContentHash("Title", "Body text");
      const b = await computeContentHash("Title", "Body text");
      expect(a).toBe(b);
    });

    test("different content produces different hashes", async () => {
      const a = await computeContentHash("Title", "Body A");
      const b = await computeContentHash("Title", "Body B");
      expect(a).not.toBe(b);
    });

    test("normalizes case (case-insensitive match)", async () => {
      const a = await computeContentHash("TITLE", "BODY");
      const b = await computeContentHash("title", "body");
      expect(a).toBe(b);
    });

    test("normalizes whitespace (leading/trailing trimmed)", async () => {
      const a = await computeContentHash("  Title  ", "  Body  ");
      const b = await computeContentHash("Title", "Body");
      expect(a).toBe(b);
    });

    test("normalizes CRLF to LF", async () => {
      const a = await computeContentHash("Title", "line1\r\nline2");
      const b = await computeContentHash("Title", "line1\nline2");
      expect(a).toBe(b);
    });

    test("handles empty title and body", async () => {
      const hash = await computeContentHash("", "");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    test("handles null/undefined gracefully", async () => {
      const hash = await computeContentHash(null, undefined);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("buildHashSet", () => {
    test("returns a Set of hashes from notes", async () => {
      const notes = [
        { title: "Note 1", body: "Content 1" },
        { title: "Note 2", body: "Content 2" },
      ];
      const hashSet = await buildHashSet(notes);
      expect(hashSet).toBeInstanceOf(Set);
      expect(hashSet.size).toBe(2);
    });

    test("reuses existing contentHash field when present", async () => {
      const precomputed = await computeContentHash("A", "B");
      const notes = [{ title: "A", body: "B", contentHash: precomputed }];
      const hashSet = await buildHashSet(notes);
      expect(hashSet.has(precomputed)).toBe(true);
    });

    test("detects duplicate content across notes", async () => {
      const notes = [
        { title: "Same", body: "Content" },
        { title: "Same", body: "Content" },
      ];
      const hashSet = await buildHashSet(notes);
      // Duplicate content → same hash → set has only 1 entry
      expect(hashSet.size).toBe(1);
    });

    test("empty array returns empty set", async () => {
      const hashSet = await buildHashSet([]);
      expect(hashSet.size).toBe(0);
    });
  });
});
