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
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes user filename, removing path traversal attempts and special characters.
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
    Validates uploaded file against size, extension, and binary signatures.
    Returns (sanitized_filename, file_bytes, detected_mime).
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
