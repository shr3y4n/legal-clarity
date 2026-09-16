r"""
File Ingestion Security and Validation Layer.

Security Threats Addressed:
1. Path Traversal & Shell Injection: Malicious filenames containing directory traversal
   sequences (`../`, `..\`) or shell meta-characters are sanitized to benign basenames.
2. File Type Spoofing: Extensions are treated as unverified hints; binary magic bytes
   (`%PDF`, PK zip headers) are strictly verified before passing buffers to parsers.
3. Resource Exhaustion / Zip Bombing: Upload streams are read with a bounded buffer cap
   (`settings.MAX_UPLOAD_SIZE_MB`), rejecting oversized payloads with HTTP 413. DOCX
   packages are checked in memory for `[Content_Types].xml` without disk extraction.
4. Binary Injection in Text Files: Plaintext uploads are inspected for null bytes (`\x00`)
   to prevent disguised compiled binaries or shellcode from entering the pipeline.
"""

import os
import re
import uuid
import zipfile
from typing import Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

# Magic byte signatures
PDF_MAGIC = b"%PDF"
ZIP_MAGIC = b"PK\x03\x04"


class FileValidationError(HTTPException):
    """Raised when an uploaded file violates security constraints, MIME signatures, or structural integrity."""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes client-supplied filenames to eliminate directory traversal and command injection.

    Transforms input by:
    1. Extracting strictly the basename, dropping directory path elements (`/` or `\\`).
    2. Filtering to an alphanumeric and safe punctuation whitelist `[a-zA-Z0-9_-. ()]`.
    3. Stripping leading dots to prevent hidden system file creation.
    4. Truncating length to 128 characters to avoid buffer or filesystem limits.
    """
    if not filename:
        return f"document_{uuid.uuid4().hex[:8]}.txt"
    # Take only the basename
    base = os.path.basename(filename)
    # Remove path traversal tokens and dangerous characters
    clean = re.sub(r'[^a-zA-Z0-9_\-\. \(\)]', '_', base).strip()
    if not clean or clean.startswith('.'):
        clean = f"doc_{clean.lstrip('.')}"
    return clean[:128]


async def validate_and_read_upload(file: UploadFile) -> Tuple[str, bytes, str]:
    """
    Performs comprehensive pre-parse validation and safe buffer reading of uploaded documents.

    Validation Pipeline:
    1. Extension verification against allowed whitelist (`.pdf`, `.docx`, `.txt`).
    2. Bounded stream reading enforcing `MAX_UPLOAD_SIZE_MB` with overflow guard.
    3. Zero-byte rejection.
    4. Binary magic-byte inspection matching true file signatures.
    5. In-memory DOCX OpenXML package table-of-contents validation.
    6. Text encoding safety and binary null-byte checks.

    Returns:
        Tuple of (sanitized_filename, file_bytes, detected_mime_type)
    """
    raw_filename = file.filename or "document.txt"
    sanitized_name = sanitize_filename(raw_filename)
    _, ext = os.path.splitext(sanitized_name.lower())

    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"Unsupported file format '{ext}'. Allowed formats: .pdf, .docx, .txt"
        )

    # Read content with strict size guard
    contents = await file.read(settings.max_upload_bytes + 1024)
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    if len(contents) == 0:
        raise FileValidationError("Uploaded file is completely empty.")

    # Signature and content validation
    detected_mime = "application/octet-stream"

    if ext == ".pdf":
        if not contents.startswith(PDF_MAGIC):
            raise FileValidationError(
                "Invalid PDF signature. File content does not match standard PDF header."
            )
        detected_mime = "application/pdf"

    elif ext == ".docx":
        if not contents.startswith(ZIP_MAGIC):
            raise FileValidationError(
                "Invalid DOCX signature. Document package header is corrupted or not a valid DOCX file."
            )
        # Verify ZIP package structure without loading everything into disk
        try:
            import io
            with zipfile.ZipFile(io.BytesIO(contents)) as zf:
                file_list = zf.namelist()
                if "[Content_Types].xml" not in file_list:
                    raise FileValidationError("Malformed DOCX archive: missing [Content_Types].xml.")
        except zipfile.BadZipFile:
            raise FileValidationError("Malformed or corrupted DOCX archive.")
        detected_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    elif ext == ".txt":
        # Check for binary null bytes that indicate non-text files
        if b"\x00" in contents:
            raise FileValidationError("File contains binary null bytes and is not valid text.")
        try:
            contents.decode("utf-8")
        except UnicodeDecodeError:
            try:
                contents.decode("latin-1")
            except Exception:
                raise FileValidationError("Unable to decode text file with standard UTF-8 or Latin-1 encodings.")
        detected_mime = "text/plain"

    return sanitized_name, contents, detected_mime
