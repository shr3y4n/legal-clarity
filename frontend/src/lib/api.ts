import {
  Answer,
  Comparison,
  Document,
  DocumentChecklist,
  DocumentMetadata,
  DocumentReviewResponse,
  DocumentUnderstanding,
  LawyerPrepResponse,
} from '../types/document';
import {
  askWithGemini,
  clientAsk,
  clientChecklist,
  clientCompare,
  clientLawyerPrep,
  clientReview,
  clientUnderstand,
  deleteClientDocument,
  getClientDocument,
  getClientDocuments,
  initPreloadedDocuments,
  parseDocumentFromText,
  DEFAULT_GEMINI_API_KEY,
} from './clientEngine';
import { parseUploadedFile } from './fileParser';

const BASE_URL = '/api';
let isBackendAvailable: boolean | null = null;

// --- User-Configured Gemini API Key in LocalStorage ---
const GEMINI_KEY_STORAGE = 'legal_clarity_gemini_key';

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function getActiveApiKey(): string {
  return getStoredApiKey() || DEFAULT_GEMINI_API_KEY;
}

export function setStoredApiKey(key: string): void {
  try {
    if (!key.trim()) {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    } else {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    }
  } catch {
    // LocalStorage unavailable
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    let errorCode = 'API_ERROR';
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorDetail = errorJson.detail;
      if (errorJson.code) errorCode = errorJson.code;
    } catch {
      // Fallback
    }

    if (res.status === 413) {
      errorDetail = 'File size exceeds server upload limit (15MB).';
    } else if (res.status === 429) {
      errorDetail = 'Rate limit exceeded. Please wait a few moments before trying again.';
    }

    throw new ApiError(errorDetail, res.status, errorCode);
  }
  return res.json();
}

export async function checkReadiness(): Promise<{ status: string; provider: string; model: string; isBackend: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/ready`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      isBackendAvailable = true;
      return { ...data, isBackend: true };
    }
  } catch {
    // Backend unreachable (running on GitHub Pages or offline)
  }

  isBackendAvailable = false;
  initPreloadedDocuments();

  return {
    status: 'ready',
    provider: 'gemini',
    model: 'Gemini 2.5 Flash',
    isBackend: false,
  };
}

export async function uploadDocument(file: File): Promise<Document> {
  if (isBackendAvailable !== false) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to client extraction
    }
  }

  // Client-Side In-Browser Extraction (handles PDF, DOCX, TXT, MD)
  return parseUploadedFile(file);
}

export async function getDocument(documentId: string): Promise<Document> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const clientDoc = getClientDocument(documentId);
  if (clientDoc) return clientDoc;
  throw new ApiError('Document not found in workspace.', 404);
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  return getClientDocuments();
}

export async function deleteDocument(documentId: string): Promise<void> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (res.ok) return;
    } catch {
      // Fallback
    }
  }

  deleteClientDocument(documentId);
}

export async function getUnderstanding(documentId: string): Promise<DocumentUnderstanding> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}/understand`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const doc = getClientDocument(documentId);
  if (!doc) throw new ApiError('Document not found.', 404);
  return clientUnderstand(doc);
}

export async function getReview(documentId: string): Promise<DocumentReviewResponse> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}/review`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const doc = getClientDocument(documentId);
  if (!doc) throw new ApiError('Document not found.', 404);
  return clientReview(doc);
}

export async function askDocument(documentId: string, question: string): Promise<Answer> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: question }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const doc = getClientDocument(documentId);
  if (!doc) throw new ApiError('Document not found.', 404);
  const activeKey = getActiveApiKey();
  return askWithGemini(doc, question, activeKey);
}

export async function compareDocuments(docAId: string, docBId: string): Promise<Comparison> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_a_id: docAId, doc_b_id: docBId }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const docA = getClientDocument(docAId);
  const docB = getClientDocument(docBId);
  if (!docA || !docB) throw new ApiError('One or both documents not found for comparison.', 404);
  return clientCompare(docA, docB);
}

export async function getChecklist(documentId: string): Promise<DocumentChecklist> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}/checklist`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const doc = getClientDocument(documentId);
  if (!doc) throw new ApiError('Document not found.', 404);
  return clientChecklist(doc);
}

export async function getLawyerPrep(documentId: string): Promise<LawyerPrepResponse> {
  if (isBackendAvailable !== false) {
    try {
      const res = await fetch(`${BASE_URL}/documents/${documentId}/lawyer-prep`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
  }

  const doc = getClientDocument(documentId);
  if (!doc) throw new ApiError('Document not found.', 404);
  return clientLawyerPrep(doc);
}
