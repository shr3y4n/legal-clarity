import time
from typing import Dict, List, Optional

from app.config import get_settings
from app.models.schemas import Document, DocumentMetadata
from app.utils.logger import logger

settings = get_settings()


class EphemeralDocumentStore:
    """
    In-memory volatile document storage engine designed for strict privacy compliance.

    Architectural Rationale:
    -----------------------
    Legal documents routinely contain confidential commercial terms, non-public IP,
    and personally identifiable information (PII). Rather than persisting sensitive
    contract text to relational databases or persistent block storage, Legal Clarity
    holds documents exclusively in RAM.

    Lifecycle & Eviction Guarantees:
    -------------------------------
    1. Ephemeral Residency: Documents exist only as structured objects in memory.
    2. Automated TTL Reaper: Every read/write operation triggers a check against
       `settings.DOCUMENT_TTL_HOURS` (default 2 hours). Expired documents are safely
       evicted from memory and garbage collected.
    3. Explicit User Purge: Clients can trigger immediate deterministic eviction
       via `DELETE /api/documents/{document_id}`.
    """

    def __init__(self) -> None:
        self._store: Dict[str, Document] = {}
        self._timestamps: Dict[str, float] = {}

    def save(self, document: Document) -> None:
        """
        Stores an extracted, indexed document in memory and refreshes its residency timestamp.
        Triggers passive TTL cleanup of any documents that have exceeded the eviction window.
        """
        doc_id = document.metadata.document_id
        self._store[doc_id] = document
        self._timestamps[doc_id] = time.time()
        self.cleanup_expired()

    def get(self, document_id: str) -> Optional[Document]:
        """
        Retrieves an active document by its unique UUID identifier.
        Returns None if the document does not exist or has expired past the TTL boundary.
        """
        self.cleanup_expired()
        return self._store.get(document_id)

    def delete(self, document_id: str) -> bool:
        """
        Immediately purges a document and its tracking timestamp from memory.
        Returns True if the document was found and removed, False otherwise.
        """
        if document_id in self._store:
            del self._store[document_id]
            if document_id in self._timestamps:
                del self._timestamps[document_id]
            return True
        return False

    def list_all(self) -> List[DocumentMetadata]:
        """
        Returns metadata headers for all active non-expired documents currently resident in RAM.
        Excludes full text and page payload to conserve bandwidth.
        """
        self.cleanup_expired()
        return [doc.metadata for doc in self._store.values()]

    def cleanup_expired(self) -> int:
        """
        Identifies and removes all documents whose lifetime exceeds DOCUMENT_TTL_HOURS.
        Returns the count of purged documents.
        """
        now = time.time()
        ttl_seconds = settings.DOCUMENT_TTL_HOURS * 3600
        expired_ids = [
            doc_id for doc_id, added_at in self._timestamps.items()
            if (now - added_at) > ttl_seconds
        ]
        for doc_id in expired_ids:
            if doc_id in self._store:
                del self._store[doc_id]
            del self._timestamps[doc_id]

        if expired_ids:
            logger.info(f"Cleaned up {len(expired_ids)} expired ephemeral documents.")
        return len(expired_ids)



# Singleton store instance
document_store = EphemeralDocumentStore()
