import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DrawingStroke, StickyNoteItem } from '../types';

export interface ExportAnnotatedPdfOptions {
  pdfData: ArrayBuffer | Uint8Array;
  fileName: string;
  pageStrokes?: Record<number, DrawingStroke[]>;
  stickyNotes?: StickyNoteItem[];
}

function parseHexColor(colorStr: string = '#000000'): { r: number; g: number; b: number } {
  if (!colorStr) return { r: 0.1, g: 0.1, b: 0.1 };
  let cleaned = colorStr.trim();
  if (cleaned.startsWith('#')) {
    let hex = cleaned.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const val = parseInt(hex, 16);
    if (!isNaN(val)) {
      return {
        r: ((val >> 16) & 255) / 255,
        g: ((val >> 8) & 255) / 255,
        b: (val & 255) / 255,
      };
    }
  }
  return { r: 0.15, g: 0.15, b: 0.15 };
}

/**
 * Exports a PDF with user ink annotations, highlighters, and sticky notes
 * baked directly into the document so that any standard PDF viewer displays them.
 */
export async function exportAnnotatedPdf({
  pdfData,
  fileName,
  pageStrokes = {},
  stickyNotes = [],
}: ExportAnnotatedPdfOptions): Promise<void> {
  // Load existing PDF
  const pdfDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  let helveticaFont;
  try {
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    helveticaFont = null;
  }

  for (let pIndex = 0; pIndex < totalPages; pIndex++) {
    const pageNum = pIndex + 1; // 1-based page index
    const page = pdfDoc.getPage(pIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // 1. Render Drawing Strokes (Pen, Highlighter, Ruler)
    const strokes = pageStrokes[pageNum] || pageStrokes[pIndex] || [];
    if (Array.isArray(strokes) && strokes.length > 0) {
      // Draw highlighters first (so ink sits on top)
      const highlighters = strokes.filter((s) => s.tool === 'highlighter');
      const inks = strokes.filter((s) => s.tool !== 'highlighter');
      const orderedStrokes = [...highlighters, ...inks];

      for (const stroke of orderedStrokes) {
        if (!stroke.points || stroke.points.length < 2) continue;
        const { r, g, b } = parseHexColor(stroke.color);
        const isHighlighter = stroke.tool === 'highlighter';
        const opacity = isHighlighter ? (stroke.opacity || 0.45) : (stroke.opacity || 1.0);
        const thickness = Math.max(1, stroke.width || (isHighlighter ? 12 : 2));

        for (let i = 0; i < stroke.points.length - 1; i++) {
          const pt1 = stroke.points[i];
          const pt2 = stroke.points[i + 1];

          // Convert from top-left canvas coords to bottom-left PDF coords
          const x1 = Math.min(Math.max(0, pt1.x), pageWidth);
          const y1 = Math.min(Math.max(0, pageHeight - pt1.y), pageHeight);
          const x2 = Math.min(Math.max(0, pt2.x), pageWidth);
          const y2 = Math.min(Math.max(0, pageHeight - pt2.y), pageHeight);

          try {
            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness,
              color: rgb(r, g, b),
              opacity,
            });
          } catch (e) {
            // gracefully skip individual malformed points
          }
        }
      }
    }

    // 2. Render Sticky Notes on this page
    const pageNotes = stickyNotes.filter((n) => n.pageNumber === pageNum || n.pageNumber === pIndex);
    for (const note of pageNotes) {
      const noteX = Math.min(Math.max(10, note.x), pageWidth - 140);
      const noteY = Math.min(Math.max(10, pageHeight - note.y - 70), pageHeight - 40);
      const noteBg = parseHexColor(note.color || '#fef08a');
      const noteTextColor = parseHexColor(note.textColor || '#713f12');

      try {
        // Draw note card background
        page.drawRectangle({
          x: noteX,
          y: noteY,
          width: 140,
          height: 70,
          color: rgb(noteBg.r, noteBg.g, noteBg.b),
          borderColor: rgb(Math.max(0, noteBg.r - 0.2), Math.max(0, noteBg.g - 0.2), Math.max(0, noteBg.b - 0.2)),
          borderWidth: 1,
          opacity: 0.95,
        });

        // Draw note header strip
        page.drawRectangle({
          x: noteX,
          y: noteY + 54,
          width: 140,
          height: 16,
          color: rgb(Math.max(0, noteBg.r - 0.1), Math.max(0, noteBg.g - 0.1), Math.max(0, noteBg.b - 0.1)),
          opacity: 0.9,
        });

        if (helveticaFont) {
          // Note label / title
          const titleSnippet = (note.title || 'Note').slice(0, 22);
          page.drawText(titleSnippet, {
            x: noteX + 6,
            y: noteY + 57,
            size: 8,
            font: helveticaFont,
            color: rgb(noteTextColor.r, noteTextColor.g, noteTextColor.b),
          });

          // Note preview content
          if (note.content) {
            const contentSnippet = note.content.slice(0, 60);
            page.drawText(contentSnippet, {
              x: noteX + 6,
              y: noteY + 38,
              size: 7,
              font: helveticaFont,
              color: rgb(noteTextColor.r, noteTextColor.g, noteTextColor.b),
              maxWidth: 128,
            });
          }
        }
      } catch (e) {
        // Skip malformed sticky note gracefully
      }
    }
  }

  // Save the modified PDF document to bytes
  const modifiedPdfBytes = await pdfDoc.save();

  // Trigger browser download
  const blob = new Blob([modifiedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  a.download = safeName.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
