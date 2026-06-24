/**
 * Table Converter — Pure conversion functions between table formats.
 * Formats: CSV, TSV, Markdown, HTML, SQL, JSON
 * All conversions go through a 2D array intermediate: string[][]
 */

// ===== Parsers (format → array) =====

export function csvToArray(csv, delimiter = null) {
  if (!csv.trim()) return [];
  // Auto-detect delimiter: tab or comma
  if (!delimiter) {
    const firstLine = csv.split("\n")[0];
    delimiter = firstLine.includes("\t") ? "\t" : ",";
  }
  const rows = [];
  let row = 0, col = 0, quote = false, buffer = "";
  const arr = [[]];

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quote && csv[i + 1] === '"') { buffer += '"'; i++; }
      else { quote = !quote; }
    } else if (ch === delimiter && !quote) {
      arr[row][col] = buffer.trim(); buffer = ""; col++;
    } else if (ch === "\n" && !quote) {
      arr[row][col] = buffer.trim(); buffer = ""; row++; col = 0; arr[row] = [];
    } else if (ch === "\r") {
      // skip
    } else {
      buffer += ch;
    }
  }
  arr[row][col] = buffer.trim();
  // Remove empty trailing rows
  return arr.filter(r => r.some(c => c !== ""));
}

export function markdownToArray(md) {
  if (!md.trim()) return [];
  const lines = md.trim().split("\n").filter(l => l.trim());
  const array = [];
  const alignment = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Remove leading/trailing pipes
    const stripped = line.replace(/^\|/, "").replace(/\|$/, "");
    const cells = stripped.split("|").map(c => c.trim());

    // Check if this is the separator line (----, :---:, etc.)
    if (i === 1 && cells.every(c => /^:?-+:?$/.test(c))) {
      cells.forEach((c, idx) => {
        const left = c.startsWith(":");
        const right = c.endsWith(":");
        alignment[idx] = left && right ? "c" : right ? "r" : "l";
      });
      continue; // Skip separator
    }
    array.push(cells);
  }
  return array;
}

export function htmlToArray(html) {
  if (!html.trim()) return [];
  const array = [];
  // Use regex to extract rows and cells (no DOM dependency)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim());
    }
    if (cells.length > 0) array.push(cells);
  }
  return normalizeArray(array);
}

export function sqlToArray(sql) {
  if (!sql.trim()) return [];
  const array = [];
  const lines = sql.split("\n");
  let started = false, step = "pre";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("+") && !started) { started = true; step = "header"; continue; }
    if (!started) continue;
    if (trimmed.startsWith("+")) {
      if (step === "header") { step = "data"; continue; }
      if (step === "data") break;
    }
    if (trimmed.startsWith("|")) {
      const cells = trimmed.split("|").slice(1, -1).map(c => c.trim());
      if (cells.length > 0) array.push(cells);
    }
  }
  return normalizeArray(array);
}

export function jsonToArray(json) {
  if (!json.trim()) return [];
  try {
    let data = JSON.parse(json);
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0])) {
      const keys = [...new Set(data.flatMap(Object.keys))];
      const header = keys;
      const rows = data.map(obj => keys.map(k => String(obj[k] ?? "")));
      return [header, ...rows];
    }
    // Handle array of arrays
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      return data.map(row => row.map(c => String(c ?? "")));
    }
    // Handle single object
    if (typeof data === "object" && !Array.isArray(data)) {
      const keys = Object.keys(data);
      return [["Key", "Value"], ...keys.map(k => [k, String(data[k] ?? "")])];
    }
    return [];
  } catch {
    return [];
  }
}

// ===== Generators (array → format) =====

export function arrayToMarkdown(array) {
  if (array.length === 0) return "";
  const colWidths = getColWidths(array);
  let md = "";
  for (let r = 0; r < array.length; r++) {
    const row = array[r];
    md += "| " + row.map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |\n";
    if (r === 0) {
      md += "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |\n";
    }
  }
  return md;
}

export function arrayToCsv(array) {
  return array.map(row =>
    row.map(cell => {
      if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(", ")
  ).join("\n");
}

export function arrayToTsv(array) {
  return array.map(row => row.join("\t")).join("\n");
}

export function arrayToHtml(array) {
  if (array.length === 0) return "";
  let html = "<table>\n";
  if (array.length > 1) {
    html += "  <thead>\n    <tr>\n";
    html += array[0].map(c => `      <th>${escapeHtml(c)}</th>`).join("\n") + "\n";
    html += "    </tr>\n  </thead>\n  <tbody>\n";
    for (let r = 1; r < array.length; r++) {
      html += "    <tr>\n";
      html += array[r].map(c => `      <td>${escapeHtml(c)}</td>`).join("\n") + "\n";
      html += "    </tr>\n";
    }
    html += "  </tbody>\n";
  } else {
    html += "  <tr>\n" + array[0].map(c => `    <td>${escapeHtml(c)}</td>`).join("\n") + "\n  </tr>\n";
  }
  html += "</table>";
  return html;
}

export function arrayToSql(array) {
  if (array.length === 0) return "";
  const colWidths = getColWidths(array);
  const divider = "+" + colWidths.map(w => "-".repeat(w + 2)).join("+") + "+";
  let sql = divider + "\n";
  for (let r = 0; r < array.length; r++) {
    sql += "| " + array[r].map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |\n";
    if (r === 0) sql += divider + "\n";
  }
  sql += divider;
  return sql;
}

export function arrayToJson(array) {
  if (array.length < 2) return JSON.stringify(array, null, 2);
  const headers = array[0];
  const objects = array.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ""; });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

// ===== Auto-detect format =====

export function detectFormat(input) {
  const trimmed = input.trim();
  if (!trimmed) return "csv";
  // JSON
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try { JSON.parse(trimmed); return "json"; } catch { /* not json */ }
  }
  // HTML
  if (/<table/i.test(trimmed) || /<tr/i.test(trimmed)) return "html";
  // SQL
  if (/^\+[-+]+\+$/m.test(trimmed)) return "sql";
  // Markdown
  if (/^\|.*\|$/m.test(trimmed) && /^\|[\s:]*-+[\s:]*\|/m.test(trimmed)) return "markdown";
  // TSV
  if (trimmed.includes("\t")) return "tsv";
  // Default to CSV
  return "csv";
}

// ===== Convert =====

export function convert(input, fromFormat, toFormat) {
  // Parse
  let array;
  switch (fromFormat) {
    case "csv": array = csvToArray(input, ","); break;
    case "tsv": array = csvToArray(input, "\t"); break;
    case "markdown": array = markdownToArray(input); break;
    case "html": array = htmlToArray(input); break;
    case "sql": array = sqlToArray(input); break;
    case "json": array = jsonToArray(input); break;
    default: array = csvToArray(input); break;
  }
  if (array.length === 0) return "";
  // Generate
  switch (toFormat) {
    case "csv": return arrayToCsv(array);
    case "tsv": return arrayToTsv(array);
    case "markdown": return arrayToMarkdown(array);
    case "html": return arrayToHtml(array);
    case "sql": return arrayToSql(array);
    case "json": return arrayToJson(array);
    default: return arrayToMarkdown(array);
  }
}

// ===== Helpers =====

function normalizeArray(array) {
  if (array.length === 0) return array;
  const maxCols = Math.max(...array.map(r => r.length));
  return array.map(r => {
    while (r.length < maxCols) r.push("");
    return r;
  });
}

function getColWidths(array) {
  const widths = [];
  for (const row of array) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] || 3, cell.length);
    });
  }
  return widths;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
