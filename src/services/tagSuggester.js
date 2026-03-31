import { getPredefinedTags } from "./tagManager";

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

// Known tech/topic patterns — optimized for GitHub support & dev engineering
const TECH_PATTERNS = {
  // Languages & Runtimes
  javascript: ["javascript", "js", "node", "nodejs", "npm", "yarn", "pnpm", "react", "vue", "angular", "express", "webpack", "babel", "eslint", "prettier", "vite", "nextjs", "nuxt", "svelte", "deno", "bun"],
  typescript: ["typescript", "ts", "tsx", "tsc", "tsconfig"],
  python: ["python", "py", "pip", "pipenv", "poetry", "django", "flask", "fastapi", "pandas", "numpy", "pytest", "virtualenv", "conda"],
  ruby: ["ruby", "rails", "gem", "bundler", "rake", "rspec"],
  java: ["java", "jvm", "maven", "gradle", "spring", "springboot", "tomcat", "jar"],
  csharp: ["csharp", "dotnet", "nuget", "aspnet", "blazor", "entity"],
  golang: ["golang", "goroutine", "gomod"],
  rust: ["rust", "cargo", "rustc", "tokio"],
  php: ["php", "composer", "laravel", "symfony", "wordpress"],
  swift: ["swift", "xcode", "ios", "cocoapods", "swiftui"],

  // GitHub & Version Control
  git: ["git", "github", "gitlab", "bitbucket", "commit", "branch", "merge", "rebase", "clone", "push", "pull", "stash", "cherry", "bisect", "reflog", "submodule", "gitignore", "gitconfig"],
  "github-actions": ["actions", "workflow", "yaml", "yml", "runner", "artifact", "matrix", "cron"],
  "github-pages": ["pages", "jekyll", "static", "deploy"],
  "github-api": ["octokit", "graphql", "webhook", "oauth", "app", "installation", "token"],
  "pull-request": ["review", "approve", "merge", "conflict", "revert", "squash", "draft"],
  issues: ["issue", "bug", "feature", "label", "milestone", "assignee", "template", "triage"],
  repository: ["repo", "repository", "fork", "archive", "transfer", "visibility", "collaborator", "codeowner"],
  "code-scanning": ["codeql", "dependabot", "advisory", "vulnerability", "sarif", "sast"],

  // Infrastructure & DevOps
  docker: ["docker", "dockerfile", "container", "compose", "image", "registry", "kubernetes", "k8s", "helm", "pod", "ingress"],
  devops: ["ci", "cd", "pipeline", "deploy", "deployment", "release", "rollback", "canary", "bluegreen"],
  aws: ["aws", "ec2", "s3", "lambda", "rds", "ecs", "fargate", "cloudfront", "iam", "sqs", "sns", "dynamodb", "lightsail", "route53"],
  azure: ["azure", "devops", "blob", "cosmos", "webapp"],
  gcp: ["gcp", "firebase", "cloudrun", "bigquery", "pubsub"],
  terraform: ["terraform", "hcl", "tfstate", "provider", "module"],
  nginx: ["nginx", "proxy", "upstream", "loadbalancer", "reverseproxy"],

  // Databases
  database: ["sql", "mysql", "postgresql", "postgres", "pgbouncer", "mongodb", "redis", "sqlite", "nosql", "orm", "prisma", "kysely", "knex", "sequelize", "migration", "schema", "index", "query"],

  // APIs & Networking
  api: ["api", "rest", "graphql", "grpc", "endpoint", "request", "response", "http", "https", "curl", "fetch", "axios", "webhook", "websocket", "cors", "rate", "throttle", "pagination"],

  // Security & Auth
  security: ["security", "auth", "authentication", "authorization", "ssl", "tls", "certificate", "token", "jwt", "oauth", "saml", "ldap", "mfa", "rbac", "encryption", "hash", "owasp", "xss", "csrf", "injection", "pentest"],

  // Frontend & UI
  css: ["css", "scss", "sass", "less", "tailwind", "bootstrap", "flexbox", "grid", "responsive", "animation", "media"],
  html: ["html", "dom", "element", "semantic", "accessibility", "aria", "wcag"],
  ui: ["component", "modal", "tooltip", "dropdown", "sidebar", "navbar", "layout", "theme", "darkmode"],

  // Systems & CLI
  linux: ["linux", "ubuntu", "centos", "debian", "rhel", "bash", "shell", "zsh", "terminal", "command", "chmod", "sudo", "cron", "systemd", "ssh", "scp", "rsync"],
  macos: ["macos", "brew", "homebrew", "xcode", "keychain"],
  windows: ["windows", "powershell", "wsl", "cmd", "registry"],

  // Testing & Quality
  testing: ["test", "testing", "jest", "vitest", "mocha", "chai", "cypress", "playwright", "selenium", "unit", "integration", "e2e", "coverage", "mock", "stub", "fixture", "snapshot"],
  debugging: ["debug", "debugger", "breakpoint", "stacktrace", "error", "exception", "log", "trace", "profiler", "devtools"],

  // Support & Troubleshooting
  troubleshooting: ["troubleshoot", "fix", "resolve", "workaround", "issue", "problem", "solution", "error", "failure", "timeout", "crash", "hang", "freeze", "corrupt"],
  support: ["ticket", "escalation", "customer", "response", "template", "macro", "sla", "priority", "severity", "zendesk", "jira", "servicedesk"],
  documentation: ["docs", "documentation", "readme", "wiki", "guide", "tutorial", "howto", "faq", "runbook", "playbook", "sop"],

  // Architecture & Patterns
  architecture: ["architecture", "microservice", "monolith", "modular", "serverless", "event", "queue", "cache", "cdn", "proxy", "gateway"],
  performance: ["performance", "optimization", "benchmark", "latency", "throughput", "memory", "cpu", "profiling", "caching", "lazy"],

  // Data & Config
  config: ["config", "configuration", "env", "environment", "variable", "secret", "dotenv", "yaml", "json", "toml", "ini"],
  monitoring: ["monitoring", "logging", "metrics", "alerting", "sentry", "datadog", "grafana", "prometheus", "newrelic", "splunk"],
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

  // 0. Predefined tags — match against note content for priority suggestions
  const predefined = getPredefinedTags();
  const allText = `${(title || "")} ${(body || "").slice(0, 3000)}`.toLowerCase();
  for (const pt of predefined) {
    if (!existing.has(pt.name) && allText.includes(pt.name)) {
      suggestions.add(pt.name);
    }
  }

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
