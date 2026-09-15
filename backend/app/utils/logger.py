import logging
import re
import sys
from typing import Optional

# Pattern to catch potential API keys or tokens
_KEY_PATTERN = re.compile(r'(AIza[0-9A-Za-z-_]{20,50}|Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)', re.IGNORECASE)


class SafeFormatter(logging.Formatter):
    """
    Log formatter that strips sensitive tokens and enforces structured metadata.
    Prevents raw document text or API keys from ever leaking into logs.
    """
    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        return _KEY_PATTERN.sub("[REDACTED_SECRET]", msg)


def setup_logger(name: str = "legal_clarity", level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            SafeFormatter(
                fmt="%(asctime)s | %(levelname)s | [%(name)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
        )
        logger.addHandler(handler)
        logger.propagate = False

    return logger


logger = setup_logger()


def log_document_event(
    event: str,
    doc_hash: Optional[str] = None,
    page_count: Optional[int] = None,
    size_bytes: Optional[int] = None,
    duration_ms: Optional[float] = None,
    error_type: Optional[str] = None,
    request_id: Optional[str] = None
) -> None:
    """
    Structured logging utility strictly logging operational metrics and never document text.
    """
    parts = [f"event={event}"]
    if request_id:
        parts.append(f"req_id={request_id}")
    if doc_hash:
        parts.append(f"hash={doc_hash[:12]}...")
    if page_count is not None:
        parts.append(f"pages={page_count}")
    if size_bytes is not None:
        parts.append(f"bytes={size_bytes}")
    if duration_ms is not None:
        parts.append(f"duration_ms={duration_ms:.1f}")
    if error_type:
        parts.append(f"error_type={error_type}")

    logger.info(" | ".join(parts))
