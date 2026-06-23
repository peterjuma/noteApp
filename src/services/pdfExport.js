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

  try {
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

/**
 * Collect markdown-related CSS rules from the page, plus forced light-mode overrides.
 */
function collectMarkdownCss() {
  let cssText = "";
  for (const sheet of Array.from(document.styleSheets)) {
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
  cssText += `
    body { margin: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; }
    .markdown-body { color: #1f2937 !important; }
    .markdown-body h1, .markdown-body h2 { border-color: #e5e7eb !important; color: #1f2937 !important; }
    .markdown-body pre { background: #f6f8fa !important; color: #1f2937 !important; }
    .markdown-body code { background: #f3f4f6 !important; color: #1f2937 !important; }
    .markdown-body blockquote { border-left: 4px solid #d1d5db !important; color: #4b5563 !important; }
    .markdown-body table th { background: #f9fafb !important; }
    .markdown-body table td, .markdown-body table th { border-color: #d1d5db !important; }
    .markdown-body a { color: #0969da !important; }
  `;
  return cssText;
}

/**
 * Export a presentation deck to a landscape PDF, one slide per page.
 * @param {string} title - deck title (used for the filename)
 * @param {string[]} slides - array of markdown strings, one per slide
 */
export async function exportDeckToPdf(title, slides) {
  if (!slides || slides.length === 0) return;
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const cssText = collectMarkdownCss() + `
    .pdf-slide { width: 1280px; height: 720px; box-sizing: border-box; padding: 64px 88px;
      display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
    .pdf-slide .markdown-body { font-size: 26px; line-height: 1.5; }
    .pdf-slide h1 { font-size: 2.4em; border: none; }
    .pdf-slide h2 { font-size: 1.9em; border: none; }
    .pdf-slide img { max-width: 100%; max-height: 420px; display: block; margin: 0 auto; }
    .pdf-slide > .markdown-body > :first-child { margin-top: 0; }
  `;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed", left: "-10000px", top: "0", width: "1280px", height: "720px",
    border: "none", visibility: "hidden",
  });
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => { iframe.onload = resolve; iframe.src = "about:blank"; });
    const iframeDoc = iframe.contentDocument;

    const pdf = new jsPDF("l", "mm", "a4");
    const pageW = 297, pageH = 210, margin = 10;
    const contentW = pageW - margin * 2;

    for (let i = 0; i < slides.length; i++) {
      const html = DOMPurify.sanitize(md2html.render(slides[i] || ""));
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>${cssText}</style></head><body><div class="pdf-slide"><div class="markdown-body">${html}</div></div></body></html>`);
      iframeDoc.close();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const canvas = await html2canvas(iframeDoc.querySelector(".pdf-slide"), {
        scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff",
        windowWidth: 1280, windowHeight: 720,
      });

      if (i > 0) pdf.addPage();
      const imgH = (canvas.height * contentW) / canvas.width;
      const y = Math.max(margin, (pageH - imgH) / 2);
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, contentW, imgH);
    }

    const filename = `${(title && title.trim() ? title : "presentation").replace(/[^A-Z0-9]+/gi, "_")}_slides.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}

