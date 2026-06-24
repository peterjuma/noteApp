/**
 * Compute a content hash for duplicate detection during note import.
 * Uses SHA-256 via SubtleCrypto, with normalized (trimmed, lowercased,
 * LF-only line endings) title + body as input.
 */
export async function computeContentHash(title, body) {
  const normalized = `${(title || "").trim().toLowerCase()}\n${(body || "").trim().toLowerCase()}`
    .replace(/\r\n/g, "\n");
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build a Set of content hashes from an array of notes.
 * If notes already have a `contentHash` field, reuse it; otherwise compute on the fly.
 */
export async function buildHashSet(notes) {
  const hashes = new Set();
  for (const note of notes) {
    const hash = note.contentHash || (await computeContentHash(note.title, note.body));
    hashes.add(hash);
  }
  return hashes;
}
