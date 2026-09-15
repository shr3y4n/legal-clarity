from fastapi import HTTPException, status

from app.models.schemas import DocumentReviewResponse
from app.services.caching.cache import analysis_cache
from app.services.providers import get_provider
from app.services.storage.document_store import document_store


async def get_document_review(document_id: str) -> DocumentReviewResponse:
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or has expired."
        )

    cached = analysis_cache.get(doc.metadata.sha256_hash, "review")
    if cached:
        return cached

    provider = get_provider()
    result = await provider.review(doc)
    analysis_cache.set(doc.metadata.sha256_hash, "review", result)
    return result
