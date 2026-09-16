import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Document } from '../types/document';
import { parseDocumentFromText } from './clientEngine';

// Configure PDF.js worker for browser environment
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
} catch {
  // Ignore in non-browser or test environments
}

/**
 * Checks if a byte buffer or text string appears to be raw binary (e.g. ZIP PK header or null bytes).
 */
function isBinaryContent(text: string): boolean {
  if (text.startsWith('PK\x03\x04') || text.startsWith('%PDF')) {
    return true;
  }
  // Check for significant presence of binary null or control characters
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
 * Extracts text page-by-page from a PDF file buffer using pdfjs-dist.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      pageTexts.push(`--- PAGE ${i} ---\n${pageText}`);
    }
  }

  const fullText = pageTexts.join('\n\n').trim();
  if (!fullText) {
    throw new Error('No extractable text found in this PDF. It may be a scanned image without OCR.');
  }
  return fullText;
}

/**
 * Ingests any uploaded File (PDF, DOCX, TXT, MD) and returns a clean, structured Document.
 * Completely prevents raw binary strings like "PK... [Content_Types].xml" from ever appearing in the UI.
 */
export async function parseUploadedFile(file: File): Promise<Document> {
  const lowerName = file.name.toLowerCase();
  let extractedText = '';

  if (lowerName.endsWith('.docx')) {
    try {
      extractedText = await extractTextFromDocx(file);
    } catch (err: any) {
      throw new Error(`DOCX Extraction Error: ${err.message || 'Corrupted or unreadable Word document.'}`);
    }
  } else if (lowerName.endsWith('.pdf')) {
    try {
      extractedText = await extractTextFromPdf(file);
    } catch (err: any) {
      throw new Error(`PDF Extraction Error: ${err.message || 'Unable to parse PDF text streams.'}`);
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

  // Sanitize any remaining unprintable control characters
  const cleanText = extractedText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (!cleanText) {
    throw new Error('The document appears to be empty after text extraction.');
  }

  return parseDocumentFromText(file.name, cleanText);
}
