import time
from typing import Dict, List, Optional

from app.config import get_settings
from app.models.schemas import Document, DocumentMetadata
from app.utils.logger import logger

settings = get_settings()


class EphemeralDocumentStore:
    def __init__(self):
        self._store: Dict[str, Document] = {}
        self._timestamps: Dict[str, float] = {}

    def save(self, document: Document) -> None:
        doc_id = document.metadata.document_id
        self._store[doc_id] = document
        self._timestamps[doc_id] = time.time()
        self.cleanup_expired()

    def get(self, document_id: str) -> Optional[Document]:
        self.cleanup_expired()
        return self._store.get(document_id)

    def delete(self, document_id: str) -> bool:
        if document_id in self._store:
            del self._store[document_id]
            if document_id in self._timestamps:
                del self._timestamps[document_id]
            return True
        return False

    def list_all(self) -> List[DocumentMetadata]:
        self.cleanup_expired()
        return [doc.metadata for doc in self._store.values()]

    def cleanup_expired(self) -> int:
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
