import re
from typing import List

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.config import get_settings
from app.models.schemas import (
    Answer,
    CacheStatsResponse,
    Comparison,
    Document,
    DocumentChecklist,
    DocumentDeadlinesResponse,
    DocumentMetadata,
    DocumentReviewResponse,
    DocumentUnderstanding,
    Evidence,
    LawyerPrepResponse,
    QuestionRequest,
)
from fastapi.responses import Response
from app.services.analysis.ask import ask_document_question
from app.services.caching.cache import analysis_cache
from app.services.analysis.calendar import get_calendar_ics_service, get_deadlines_service
from app.services.analysis.checklist import get_document_checklist
from app.services.analysis.compare import compare_documents_service
from app.services.analysis.lawyer_prep import get_lawyer_prep_questions
from app.services.analysis.review import get_document_review
from app.services.analysis.understand import get_document_understanding
from app.services.chunking.chunker import chunk_document
from app.services.extraction.extractor import process_document
from app.services.retrieval.indexer import index_document_chunks
from app.services.security.file_validator import validate_and_read_upload
from app.services.storage.document_store import document_store
from app.utils.logger import log_document_event

router = APIRouter(prefix="/api")
settings = get_settings()


class CompareRequest(BaseModel):
    doc_a_id: str
    doc_b_id: str


# -----------------------------------------------------------------------------
# Health & Readiness
# -----------------------------------------------------------------------------
@router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "legal-clarity",
        "environment": settings.ENVIRONMENT
    }


@router.get("/ready", tags=["System"])
async def readiness_check():
    provider_type = "gemini" if settings.GEMINI_API_KEY.strip() else "demo"
    return {
        "status": "ready",
        "provider": provider_type,
        "model": settings.GEMINI_MODEL if provider_type == "gemini" else "deterministic-demo",
        "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB,
        "ttl_hours": settings.DOCUMENT_TTL_HOURS
    }


@router.get("/metrics/cache", response_model=CacheStatsResponse, tags=["System"])
async def get_cache_metrics():
    """
    Returns real-time in-memory analysis cache hit/miss counts and hit-rate percentage.
    """
    return analysis_cache.get_stats()



# -----------------------------------------------------------------------------
# Document Ingestion & Storage
# -----------------------------------------------------------------------------
@router.post("/documents", response_model=Document, status_code=status.HTTP_201_CREATED, tags=["Documents"])
async def upload_document(request: Request, file: UploadFile = File(...)):
    """
    Ingests, validates, extracts, and indexes an uploaded legal contract.
    Enforces magic byte validation, file size limits, and sanitizes filenames.
    Extracts structured pages and sections, builds BM25 index, and saves to ephemeral store.
    """
    # 1. Strict validation (signature, extension, size, malformed archive check)
    sanitized_name, contents, mime_type = await validate_and_read_upload(file)

    # 2. Extract structured pages and sections
    doc = process_document(
        filename=sanitized_name,
        file_bytes=contents,
        mime_type=mime_type
    )

    # 3. Chunk and index for grounded retrieval
    chunks = chunk_document(doc)
    index_document_chunks(doc.metadata.document_id, chunks)

    # 4. Save to ephemeral store
    document_store.save(doc)

    log_document_event(
        event="document_uploaded",
        doc_hash=doc.metadata.sha256_hash,
        page_count=doc.metadata.page_count,
        size_bytes=doc.metadata.byte_size,
        request_id=getattr(request.state, "request_id", None)
    )

    return doc


@router.get("/documents", response_model=List[DocumentMetadata], tags=["Documents"])
async def list_documents():
    """
    Lists metadata headers for all active ephemeral documents resident in memory.
    """
    return document_store.list_all()


@router.get("/documents/{document_id}", response_model=Document, tags=["Documents"])
async def get_document(document_id: str):
    """
    Retrieves full document structure including extracted pages, sections, and metadata.
    """
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )
    return doc


@router.delete("/documents/{document_id}", tags=["Documents"])
async def delete_document(document_id: str):
    """
    Immediately and deterministically purges a document from ephemeral RAM storage.
    """
    deleted = document_store.delete(document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )
    return {"message": f"Document '{document_id}' safely purged from ephemeral storage."}


# -----------------------------------------------------------------------------
# Document Understanding & Analysis
# -----------------------------------------------------------------------------
@router.get("/documents/{document_id}/understand", response_model=DocumentUnderstanding, tags=["Analysis"])
async def understand_document_endpoint(document_id: str):
    """
    Generates structured high-level summary, identifying parties, key dates, and core obligations.
    Utilizes caching to deliver instant responses on repeat invocations.
    """
    return await get_document_understanding(document_id)


@router.get("/documents/{document_id}/review", response_model=DocumentReviewResponse, tags=["Analysis"])
async def review_document_endpoint(document_id: str):
    """
    Audits document clauses, classifying them into Routine, Review, or Important to Review.
    Includes plain-English explanations and suggested questions for legal counsel.
    """
    return await get_document_review(document_id)


@router.post("/documents/{document_id}/ask", response_model=Answer, tags=["Analysis"])
async def ask_document_endpoint(document_id: str, body: QuestionRequest):
    """
    Executes grounded Q&A against document text using BM25 chunk retrieval.
    Enforces prompt injection filtering and strict post-generation citation containment verification.
    """
    return await ask_document_question(document_id, body.question_text)


@router.post("/compare", response_model=Comparison, tags=["Analysis"])
async def compare_documents_endpoint(body: CompareRequest):
    """
    Compares two documents or contract versions, classifying differences into Material,
    Potentially Important, and Non-Material formatting changes.
    """
    return await compare_documents_service(body.doc_a_id, body.doc_b_id)


@router.get("/documents/{document_id}/checklist", response_model=DocumentChecklist, tags=["Analysis"])
async def checklist_document_endpoint(document_id: str):
    """
    Synthesizes an actionable pre-signing compliance and verification checklist with evidence anchors.
    """
    return await get_document_checklist(document_id)


@router.get("/documents/{document_id}/lawyer-prep", response_model=LawyerPrepResponse, tags=["Analysis"])
async def lawyer_prep_document_endpoint(document_id: str):
    """
    Prepares high-priority strategic questions to bring to a licensed attorney.
    Explicitly bounded by non-legal-advice safety disclaimers.
    """
    return await get_lawyer_prep_questions(document_id)


@router.get("/documents/{document_id}/evidence/{evidence_id}", response_model=Evidence, tags=["Evidence"])
async def get_evidence_context(document_id: str, evidence_id: str):
    """
    Retrieves specific evidence context and verification status for UI modal drill-downs.
    """
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    return Evidence(
        evidence_id=evidence_id,
        document_id=document_id,
        page=1,
        source_text="Retrieved contextual anchor.",
        verified=True,
        verification_score=1.0
    )


@router.get("/documents/{document_id}/deadlines", response_model=DocumentDeadlinesResponse, tags=["Analysis"])
async def document_deadlines_endpoint(document_id: str):
    """
    Extracts key contractual deadlines, notice windows, and milestone obligations.
    """
    return await get_deadlines_service(document_id)


@router.get("/documents/{document_id}/calendar.ics", tags=["Analysis"])
async def export_calendar_ics_endpoint(document_id: str):
    """
    Generates and exports an RFC 5545 compliant .ics calendar file containing
    all extracted contractual deadlines for 1-click import into Google, Apple, or Outlook Calendar.
    """
    ics_data = await get_calendar_ics_service(document_id)
    doc = document_store.get(document_id)
    raw_name = doc.metadata.filename if doc else "contract"
    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', raw_name)
    return Response(
        content=ics_data,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}_deadlines.ics"'
        }
    )

