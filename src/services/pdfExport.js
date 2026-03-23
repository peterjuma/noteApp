import DOMPurify from "dompurify";
import { md2html } from "../useMarkDown";

/**
 * Export a note as a styled PDF using jspdf + html2canvas.
 * Renders markdown to HTML in an offscreen container, captures it,
 * then splits across pages automatically.
 */
export async function exportNoteToPdf(note) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Build a self-contained HTML string with inline styles
  const bodyHtml = DOMPurify.sanitize(md2html.render(note.notebody || ""));
  const titleHtml = DOMPurify.sanitize(md2html.render(note.notetitle || "Untitled"));

  // Create an offscreen container so we control styling independent of the app
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "absolute",
    left: "-9999px",
    top: "0",
    width: "750px", // roughly A4 content width at 96 DPI
    padding: "40px",
    background: "#ffffff",
    color: "#1f2937",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "15px",
    lineHeight: "1.7",
  });

  container.innerHTML = `
    <h1 style="font-size:1.75rem;font-weight:600;margin:0 0 8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">${titleHtml}</h1>
    <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">
      ${note.created_at ? `Created ${new Date(note.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : ""}
      ${note.updated_at ? ` · Modified ${new Date(note.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : ""}
    </div>
    <div class="markdown-body">${bodyHtml}</div>
  `;

  document.body.appendChild(container);

  // Copy relevant stylesheets so code blocks, tables, etc. render correctly
  const styleSheets = Array.from(document.styleSheets);
  const styleEl = document.createElement("style");
  let cssText = "";
  for (const sheet of styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (
          rule.cssText.includes("markdown-body") ||
          rule.cssText.includes("hljs") ||
          rule.cssText.includes("katex") ||
          rule.cssText.includes("task-list") ||
          rule.cssText.includes("mermaid")
        ) {
          cssText += rule.cssText + "\n";
        }
      }
    } catch {
      // Cross-origin stylesheets — skip
    }
  }
  // Force light-mode colors for PDF
  cssText += `
    .markdown-body { color: #1f2937 !important; }
    .markdown-body h1, .markdown-body h2 { border-color: #e5e7eb !important; color: #1f2937 !important; }
    .markdown-body pre { background: #f6f8fa !important; color: #1f2937 !important; }
    .markdown-body code { background: #f3f4f6 !important; color: #1f2937 !important; }
    .markdown-body blockquote { border-left: 4px solid #d1d5db !important; color: #4b5563 !important; }
    .markdown-body table th { background: #f9fafb !important; }
    .markdown-body table td, .markdown-body table th { border-color: #d1d5db !important; }
    .markdown-body a { color: #2563eb !important; }
  `;
  styleEl.textContent = cssText;
  container.prepend(styleEl);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const contentWidth = imgWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // How tall the full image is in mm when scaled to fit content width
    const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
    // Height in canvas pixels that fits on one page
    const pageCanvasHeight = Math.floor((contentHeight / imgHeightMm) * canvas.height);

    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);
    const pdf = new jsPDF("p", "mm", "a4");

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Slice the canvas for this page
      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - page * pageCanvasHeight);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, page * pageCanvasHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, sliceHeightMm);
    }

    const filename = `${(note.notetitle || "note").replace(/[^A-Z0-9]+/gi, "_")}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
