// Intelligent tag suggestion engine — pure client-side keyword extraction

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "be", "been", "being", "have", "has",
  "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can",
  "this", "that", "these", "those", "it", "its", "i", "you", "he", "she", "we", "they",
  "me", "him", "her", "us", "them", "my", "your", "his", "our", "their", "mine", "yours",
  "what", "which", "who", "whom", "how", "when", "where", "why", "if", "then", "else",
  "not", "no", "nor", "so", "too", "very", "just", "also", "more", "most", "some", "any",
  "all", "each", "every", "both", "few", "many", "much", "other", "another", "such",
  "only", "own", "same", "than", "about", "above", "after", "again", "against", "before",
  "below", "between", "down", "during", "into", "out", "over", "through", "under", "up",
  "here", "there", "once", "because", "while", "until", "although", "since", "unless",
  "however", "therefore", "thus", "hence", "file", "use", "using", "used", "make",
  "like", "get", "set", "new", "see", "want", "need", "try", "run", "way", "well",
  "back", "even", "give", "still", "take", "find", "know", "come", "go", "tell",
  "say", "work", "call", "first", "last", "next", "look", "help", "add", "change",
  "note", "notes", "example", "following", "below", "above", "copy", "click",
  "true", "false", "null", "undefined", "return", "function", "const", "let", "var",
]);

// Known tech/topic patterns
const TECH_PATTERNS = {
  javascript: ["javascript", "js", "node", "nodejs", "npm", "react", "vue", "angular", "express", "webpack", "babel"],
  typescript: ["typescript", "ts", "tsx"],
  python: ["python", "py", "pip", "django", "flask", "pandas", "numpy"],
  git: ["git", "github", "gitlab", "bitbucket", "commit", "branch", "merge", "rebase", "clone", "push", "pull"],
  docker: ["docker", "dockerfile", "container", "compose", "kubernetes", "k8s"],
  database: ["sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "database", "query", "schema", "migration"],
  devops: ["ci", "cd", "pipeline", "deploy", "deployment", "aws", "azure", "gcp", "terraform", "ansible"],
  api: ["api", "rest", "graphql", "endpoint", "request", "response", "http", "https", "curl", "fetch"],
  security: ["security", "auth", "authentication", "authorization", "ssl", "tls", "certificate", "token", "jwt", "oauth"],
  css: ["css", "scss", "sass", "tailwind", "bootstrap", "flexbox", "grid", "responsive"],
  html: ["html", "dom", "element", "tag", "attribute"],
  linux: ["linux", "ubuntu", "centos", "bash", "shell", "terminal", "command", "chmod", "sudo"],
  testing: ["test", "testing", "jest", "mocha", "cypress", "playwright", "unit", "integration", "e2e"],
};

// Extract code block languages
function extractCodeLanguages(text) {
  const langs = new Set();
  const matches = text.matchAll(/```(\w+)/g);
  for (const m of matches) {
    const lang = m[1].toLowerCase();
    if (lang !== "mermaid" && lang.length > 1) {
      langs.add(lang);
    }
  }
  return [...langs];
}

// Extract headings
function extractHeadingWords(text) {
  const words = [];
  const headings = text.matchAll(/^#{1,4}\s+(.+)$/gm);
  for (const m of headings) {
    const hw = tokenize(m[1]);
    words.push(...hw);
  }
  return words;
}

// Tokenize text into clean words
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[`#*_\[\](){}|\\<>~!@$%^&+=;:'",.?/\d]/g, " ")
    .split(/[\s\-_]+/)
    .filter(w => w.length > 2 && w.length < 30 && !STOP_WORDS.has(w));
}

// Split camelCase/PascalCase/snake_case title into words
function splitTitle(title) {
  return title
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.:]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// Match against known tech patterns
function matchTechTopics(words) {
  const wordSet = new Set(words);
  const matched = [];
  for (const [topic, keywords] of Object.entries(TECH_PATTERNS)) {
    const hits = keywords.filter(k => wordSet.has(k));
    if (hits.length >= 1) {
      matched.push(topic);
    }
  }
  return matched;
}

// Get word frequency, return top N
function getFrequentWords(words, minCount = 2, topN = 5) {
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * Suggest tags for a note based on title and body content.
 * Returns an array of 3-7 suggested tag strings.
 */
export function suggestTags(title, body, existingTags = []) {
  const existing = new Set((existingTags || []).map(t => t.toLowerCase()));
  const suggestions = new Set();

  // 1. Title words (highest signal)
  const titleWords = splitTitle(title || "");
  titleWords.forEach(w => suggestions.add(w));

  // 2. Code block languages
  const codeLangs = extractCodeLanguages(body || "");
  codeLangs.forEach(l => suggestions.add(l));

  // 3. Heading words
  const headingWords = extractHeadingWords(body || "");

  // 4. All body words
  const bodyWords = tokenize((body || "").slice(0, 3000)); // Limit for performance

  // 5. Tech topic matching
  const allWords = [...titleWords, ...headingWords, ...bodyWords];
  const techTopics = matchTechTopics(allWords);
  techTopics.forEach(t => suggestions.add(t));

  // 6. Frequent meaningful words from body
  const frequent = getFrequentWords(bodyWords, 3, 5);
  frequent.forEach(w => suggestions.add(w));

  // 7. Frequent heading words
  const freqHeadings = getFrequentWords(headingWords, 2, 3);
  freqHeadings.forEach(w => suggestions.add(w));

  // Filter out existing tags and very short results
  const result = [...suggestions]
    .filter(t => t.length > 2 && !existing.has(t))
    .slice(0, 7);

  return result;
}
