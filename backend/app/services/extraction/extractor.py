import hashlib
import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models.schemas import Document, DocumentMetadata
from app.services.extraction.docx_extractor import extract_docx
from app.services.extraction.pdf_extractor import extract_pdf
from app.services.extraction.txt_extractor import extract_txt


def compute_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def process_document(
    filename: str,
    file_bytes: bytes,
    mime_type: str,
    doc_id: str | None = None
) -> Document:
    """
    Main extraction pipeline: computes cryptographic hash, extracts structured pages and sections,
    and constructs a normalized Document model.
    """
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot process empty document."
        )

    sha256_hash = compute_sha256(file_bytes)
    _, ext = os.path.splitext(filename.lower())
    document_id = doc_id or f"doc_{uuid.uuid4().hex[:12]}"

    if ext == ".pdf":
        try:
            pages, full_text = extract_pdf(file_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse PDF document structure: {str(e)}"
            )
    elif ext == ".docx":
        try:
            pages, full_text = extract_docx(file_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse DOCX document structure: {str(e)}"
            )
    elif ext == ".txt":
        try:
            pages, full_text = extract_txt(file_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse text document: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension: {ext}"
        )

    if not full_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document extraction resulted in zero readable text."
        )

    metadata = DocumentMetadata(
        document_id=document_id,
        filename=filename,
        sha256_hash=sha256_hash,
        mime_type=mime_type,
        byte_size=len(file_bytes),
        page_count=len(pages),
        created_at=datetime.now(timezone.utc).isoformat()
    )

    return Document(
        metadata=metadata,
        pages=pages,
        full_text=full_text
    )
