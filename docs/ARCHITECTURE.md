# Legal Clarity - System Architecture

## Architectural Philosophy

Legal Clarity is an **evidence-grounded legal document companion** for non-lawyers. It is deliberately designed around six non-negotiable principles:
1. **Document as Single Source of Truth**: Factual statements must carry deterministic proof back to exact pages and clauses.
2. **Deterministic Evidence Verification**: Model outputs are never trusted without independent textual containment checks.
3. **Safe Failure**: Unanswerable or unsupported questions trigger clear refusals rather than hallucinated answers.
4. **Adversarial Resilience**: Document contents are strictly treated as untrusted data.
5. **Ephemerality & Privacy**: Zero permanent document storage by default; all artifacts are kept in volatile memory with TTL eviction.
6. **Accessible & Editorial Interface**: A formal, legal-research workspace built to WCAG AA accessibility standards.

---

## High-Level Architecture

```
                                    +-------------------------------------------------------------+
                                    |              Web Client (React / TS / Vite)                 |
                                    |   Formal Paper Canvas | Outline Nav | Contextual Panels    |
                                    +------------------------------+------------------------------+
                                                                   | REST / JSON
                                                                   v
                                    +-------------------------------------------------------------+
                                    |                FastAPI Application Gateway                  |
                                    |  Security Headers | SlowAPI Rate Limiter | Safe Exception   |
                                    +------------------------------+------------------------------+
                                                                   |
          +--------------------------------------------------------+--------------------------------------------------------+
          |                                                        |                                                        |
          v                                                        v                                                        v
+-----------------------+                                +-----------------------+                                +-----------------------+
|  Ingestion & Security |                                |  Grounding & Analysis |                                |  AI Provider Layer    |
| - Magic Bytes Checks  |                                | - Page-aware Chunker  |                                | - Gemini 2.0 Provider |
| - Extension Filtering |                                | - BM25 Lexical Index  |                                | - Offline Demo Model  |
| - Size & Malform Guard|                                | - Evidence Verifier   |                                | - Strict JSON Schema  |
| - Traversal Shield    |                                | - Ephemeral Store     |                                | - Delimited Prompts   |
+-----------------------+                                +-----------------------+                                +-----------------------+
```

---

## Ingestion Pipeline

```
Upload -> Extension Validation -> Signature (Magic Bytes) -> Page-Preserving Extraction -> Structured Document Model -> BM25 Indexing -> Ephemeral Store
```

1. **Upload Validation (`file_validator.py`)**:
   - Checks file extension against `.pdf`, `.docx`, `.txt`.
   - Inspects binary headers (`%PDF-` for PDF, `PK\x03\x04` for DOCX, UTF-8 / NUL check for TXT).
   - Enforces 15MB file ceiling.
   - Sanitizes filenames against path traversal.
2. **Extraction Engine (`extractor.py`)**:
   - PDF: Uses `pypdf` to extract per-page text, detecting headings (`SECTION`, `ARTICLE`, numbering `1.1`).
   - DOCX: Uses `python-docx` to read paragraphs, tables, outline levels, and assign virtual pages.
   - TXT: Parses headings and normalizes line breaks.
3. **Chunking & Indexing (`chunker.py`, `indexer.py`)**:
   - Chunks text while preserving `page_number`, `section_id`, `heading`, `clause_number`.
   - Builds an in-memory BM25 lexical index for fast, targeted retrieval without sending entire long contracts to the LLM.

---

## Grounding & Evidence Chain Verification

The core differentiator of Legal Clarity is its backend evidence verification engine:

```
User Query / Task
       │
       ▼
Targeted Chunk Retrieval (BM25)
       │
       ▼
LLM Generation (Gemini or Deterministic Demo)
       │
       ▼
Pydantic Schema Validation
       │
       ▼
Evidence Verifier (`verifier.py`)
       ├── 1. Check Document ID Match
       ├── 2. Check Page Bounds (1 <= page <= total_pages)
       ├── 3. Normalized Text Containment Test (Exact & Token Overlap >= 0.85)
       └── 4. If Verification Fails -> Reject claim / Demote to Refusal
       │
       ▼
Client Presentation with Clickable "View Source" Anchor
```

---

## AI Provider Layer

The system defines an abstract `LLMProvider` interface implemented by two distinct providers:
1. **`GeminiLLMProvider`**:
   - Uses Google's Gemini API (`gemini-2.0-flash` or `gemini-1.5-flash`).
   - Generates structured JSON with Pydantic schemas.
   - Sets temperature to `0.0` for deterministic reproducibility.
   - Wraps document chunks inside `<UNTRUSTED_DOCUMENT_DATA>` tags.
2. **`DemoLLMProvider`**:
   - High-fidelity deterministic mock provider.
   - Inspects actual extracted document text.
   - Operates 100% offline with zero external API key requirements.
   - Enables instant test suite runs and deterministic benchmarking.

---

## Ephemeral Storage & Privacy Model

- Documents, extracted pages, and lexical indexes reside solely in volatile memory (`EphemeralDocumentStore`).
- A background TTL mechanism evicts documents after 2 hours (configurable via `DOCUMENT_TTL_HOURS`).
- Explicit `DELETE /api/documents/{id}` allows immediate user purging.
- Logs record only hashes and metadata, never raw contract text or PII.
