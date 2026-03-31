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
  const noteBody = note.notebody || note.body || "";
  const noteTitle = note.notetitle || note.title || "Untitled";
  const bodyHtml = DOMPurify.sanitize(md2html.render(noteBody));
  const titleHtml = DOMPurify.sanitize(md2html.render(noteTitle));

  // Collect relevant CSS from the parent page
  const styleSheets = Array.from(document.styleSheets);
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
    body { margin: 0; padding: 40px; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #1f2937; }
    .markdown-body { color: #1f2937 !important; }
    .markdown-body h1, .markdown-body h2 { border-color: #e5e7eb !important; color: #1f2937 !important; }
    .markdown-body pre { background: #f6f8fa !important; color: #1f2937 !important; }
    .markdown-body code { background: #f3f4f6 !important; color: #1f2937 !important; }
    .markdown-body blockquote { border-left: 4px solid #d1d5db !important; color: #4b5563 !important; }
    .markdown-body table th { background: #f9fafb !important; }
    .markdown-body table td, .markdown-body table th { border-color: #d1d5db !important; }
    .markdown-body a { color: #0969da !important; }
  `;

  // Render inside a hidden iframe so html2canvas doesn't touch the visible UI
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "750px",
    height: "0",
    border: "none",
    visibility: "hidden",
  });
  document.body.appendChild(iframe);

  // Wait for iframe to be ready
  await new Promise((resolve) => { iframe.onload = resolve; iframe.src = "about:blank"; });

  const iframeDoc = iframe.contentDocument;
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><style>${cssText}</style></head><body>
    <h1 style="font-size:1.75rem;font-weight:600;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">${titleHtml}</h1>
    <div class="markdown-body">${bodyHtml}</div>
  </body></html>`);
  iframeDoc.close();

  // Let the iframe content lay out fully
  iframe.style.height = iframeDoc.body.scrollHeight + "px";
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 750,
      windowHeight: iframeDoc.body.scrollHeight,
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

    const filename = `${(noteTitle === "Untitled" ? "note" : noteTitle).replace(/[^A-Z0-9]+/gi, "_")}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}
