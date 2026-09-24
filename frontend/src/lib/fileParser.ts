import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Document, DocumentMetadata, Page, Section } from '../types/document';
import { parseDocumentFromText, saveClientDocument } from './clientEngine';

// Configure PDF.js worker for browser environment
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch {
  // Ignore in non-browser or test environments
}

const HEADING_PATTERN =
  /^(?:(?:ARTICLE|SECTION|CLAUSE)\s+([0-9A-Z\.]+)|([0-9]+)\.\s+([A-Z\s\&\,\-]+))\s*[:\.\-]?\s*(.*)$/i;

const SUBCLAUSE_PATTERN =
  /^(?:(?:CLAUSE|SECTION)\s+)?(\d+\.\d+(?:\.\d+)?|\([a-z0-9]\))\s*[:\.\-]?\s*(.*)$/i;

const COMMON_FOOTER_PATTERNS = [
  /^legal clarity synthetic benchmark.*/i,
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^---\s*page\s+\d+\s*---$/i,
  /^confidential\s*[-–•]\s*page\s+\d+$/i,
];

function normalizeHeaderFooterLine(line: string): string {
  return line.toLowerCase().replace(/\b\d+\b/g, '<NUM>').replace(/\s+/g, ' ').trim();
}

function identifyRepeatingHeadersFooters(rawPagesLines: string[][]): Set<string> {
  if (rawPagesLines.length < 2) return new Set();
  const topCandidates = new Map<string, number>();
  const bottomCandidates = new Map<string, number>();

  for (const lines of rawPagesLines) {
    if (!lines.length) continue;
    for (const l of lines.slice(0, 2)) {
      const clean = l.trim();
      if (clean && clean.length < 120) {
        const norm = normalizeHeaderFooterLine(clean);
        topCandidates.set(norm, (topCandidates.get(norm) || 0) + 1);
      }
    }
    for (const l of lines.slice(-2)) {
      const clean = l.trim();
      if (clean && clean.length < 120) {
        const norm = normalizeHeaderFooterLine(clean);
        bottomCandidates.set(norm, (bottomCandidates.get(norm) || 0) + 1);
      }
    }
  }

  const repeating = new Set<string>();
  const threshold = Math.max(2, Math.floor(rawPagesLines.length * 0.4));
  for (const [norm, count] of topCandidates.entries()) {
    if (count >= threshold) repeating.add(norm);
  }
  for (const [norm, count] of bottomCandidates.entries()) {
    if (count >= threshold) repeating.add(norm);
  }
  return repeating;
}

function isHeaderOrFooter(line: string, repeating: Set<string>): boolean {
  const stripped = line.trim();
  if (!stripped) return false;
  const norm = normalizeHeaderFooterLine(stripped);
  if (repeating.has(norm)) return true;
  for (const pat of COMMON_FOOTER_PATTERNS) {
    if (pat.test(stripped)) return true;
  }
  return false;
}

export function segmentLinesIntoSections(lines: string[], pageNum: number): Section[] {
  const sections: Section[] = [];
  let currentHeading = 'Opening Provisions';
  let currentClauseNum: string | null = null;
  let currentClauseLines: string[] = [];
  let charOffset = 0;

  const flush = () => {
    if (currentClauseLines.length > 0) {
      const text = currentClauseLines.join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        const clauseId = currentClauseNum || `p${pageNum}_s${sections.length + 1}`;
        sections.push({
          section_id: `p${pageNum}_${clauseId.replace(/\./g, '_').replace(/[()]/g, '')}`,
          page_number: pageNum,
          heading: currentHeading,
          clause_number: currentClauseNum || undefined,
          text,
          start_char: charOffset,
          end_char: charOffset + text.length,
          page_start: pageNum,
          page_end: pageNum,
          source_type: 'native_pdf',
        });
        charOffset += text.length + 1;
      }
      currentClauseLines = [];
    }
  };

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;

    const headMatch = stripped.match(HEADING_PATTERN);
    if (headMatch) {
      flush();
      currentHeading = stripped;
      const clauseP = headMatch[1] || headMatch[2];
      currentClauseNum = clauseP ? clauseP.trim() : null;
      continue;
    }

    const subMatch = stripped.match(SUBCLAUSE_PATTERN);
    if (subMatch) {
      flush();
      currentClauseNum = subMatch[1].trim();
      const rest = subMatch[2] ? subMatch[2].trim() : '';
      if (rest) {
        currentClauseLines.push(rest);
      } else {
        currentClauseLines.push(stripped);
      }
      continue;
    }

    currentClauseLines.push(stripped);
  }

  flush();
  return sections;
}

/**
 * Checks if a byte buffer or text string appears to be raw binary (e.g. ZIP PK header or null bytes).
 */
function isBinaryContent(text: string): boolean {
  if (text.startsWith('PK\x03\x04') || text.startsWith('%PDF')) {
    return true;
  }
  let controlChars = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    const code = text.charCodeAt(i);
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      controlChars++;
    }
  }
  return controlChars > 5;
}

/**
 * Extracts plain text from a DOCX file buffer using mammoth.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.trim();
  if (!text) {
    throw new Error('No readable text could be extracted from this DOCX document.');
  }
  return text;
}

/**
 * Layout-aware extraction of PDF into structured Document with page-by-page clause segmentation.
 * Strips headers/footers and never injects synthetic page markers into text.
 */
export async function extractPdfToDocument(file: File): Promise<Document> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const rawPagesLines: string[][] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const items = (content.items as any[])
      .filter((it) => it && it.str && it.str.trim())
      .map((it) => ({
        str: it.str,
        x: it.transform ? Number(it.transform[4]) : 0,
        y: it.transform ? Number(it.transform[5]) : 0,
      }));

    const lineBuckets: { y: number; items: typeof items }[] = [];
    for (const item of items) {
      let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) < 4.0);
      if (!bucket) {
        bucket = { y: item.y, items: [] };
        lineBuckets.push(bucket);
      }
      bucket.items.push(item);
    }

    lineBuckets.sort((a, b) => b.y - a.y);

    const pageLines: string[] = [];
    for (const bucket of lineBuckets) {
      bucket.items.sort((a, b) => a.x - b.x);
      const lineStr = bucket.items.map((it) => it.str).join(' ').trim();
      if (lineStr) {
        pageLines.push(lineStr);
      }
    }

    rawPagesLines.push(pageLines);
  }

  const repeating = identifyRepeatingHeadersFooters(rawPagesLines);
  const pages: Page[] = [];
  const fullTextParts: string[] = [];

  for (let idx = 0; idx < rawPagesLines.length; idx++) {
    const pageNum = idx + 1;
    const cleanLines = rawPagesLines[idx].filter((l) => !isHeaderOrFooter(l, repeating));
    const sections = segmentLinesIntoSections(cleanLines, pageNum);
    const pageBody = cleanLines.join('\n');
    pages.push({
      page_number: pageNum,
      text: pageBody,
      sections,
    });
    if (pageBody.trim()) {
      fullTextParts.push(pageBody.trim());
    }
  }

  const fullText = fullTextParts.join('\n\n').trim();
  if (!fullText) {
    throw new Error('No extractable text found in this PDF. It may be a scanned image without OCR.');
  }

  const docId = `doc_${Math.random().toString(36).substring(2, 10)}`;
  const metadata: DocumentMetadata = {
    document_id: docId,
    filename: file.name,
    sha256_hash: `hash_${Math.random().toString(36).substring(2, 12)}`,
    mime_type: 'application/pdf',
    byte_size: file.size,
    page_count: pages.length,
    created_at: new Date().toISOString(),
  };

  const doc: Document = {
    metadata,
    pages,
    full_text: fullText,
  };

  saveClientDocument(doc);
  return doc;
}

/**
 * Extracts plain text from a PDF without synthetic page markers.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const doc = await extractPdfToDocument(file);
  return doc.full_text;
}

/**
 * Ingests any uploaded File (PDF, DOCX, TXT, MD) and returns a clean, structured Document.
 */
export async function parseUploadedFile(file: File): Promise<Document> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.pdf')) {
    try {
      return await extractPdfToDocument(file);
    } catch (err: any) {
      throw new Error(`PDF Extraction Error: ${err.message || 'Unable to parse PDF text streams.'}`);
    }
  }

  let extractedText = '';
  if (lowerName.endsWith('.docx')) {
    try {
      extractedText = await extractTextFromDocx(file);
    } catch (err: any) {
      throw new Error(`DOCX Extraction Error: ${err.message || 'Corrupted or unreadable Word document.'}`);
    }
  } else {
    // Plain text or Markdown
    extractedText = await file.text();
    if (isBinaryContent(extractedText)) {
      throw new Error(
        'The uploaded file contains binary data or an unrecognized format. Please upload a standard text, PDF, or DOCX document.'
      );
    }
  }

  const cleanText = extractedText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (!cleanText) {
    throw new Error('The document appears to be empty after text extraction.');
  }

  return parseDocumentFromText(file.name, cleanText);
}
