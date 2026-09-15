from fastapi import HTTPException, status

from app.models.schemas import DocumentUnderstanding
from app.services.caching.cache import analysis_cache
from app.services.providers import get_provider
from app.services.storage.document_store import document_store


async def get_document_understanding(document_id: str) -> DocumentUnderstanding:
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or has expired."
        )

    cached = analysis_cache.get(doc.metadata.sha256_hash, "understand")
    if cached:
        return cached

    provider = get_provider()
    result = await provider.understand(doc)
    analysis_cache.set(doc.metadata.sha256_hash, "understand", result)
    return result
