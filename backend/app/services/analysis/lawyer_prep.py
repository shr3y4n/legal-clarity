from fastapi import HTTPException, status

from app.models.schemas import LawyerPrepResponse
from app.services.caching.cache import analysis_cache
from app.services.evidence.verifier import verify_evidence
from app.services.providers import get_provider
from app.services.storage.document_store import document_store


async def get_lawyer_prep_questions(document_id: str) -> LawyerPrepResponse:
    """
    Synthesizes critical negotiation points into targeted questions for a licensed attorney.
    Ensures clear disclaimer boundaries and caches outputs against document hash.
    """
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or has expired."
        )

    cached = analysis_cache.get(doc.metadata.sha256_hash, "lawyer_prep")
    if cached:
        return cached.model_copy(update={"is_cached": True})


    provider = get_provider()
    prep = await provider.lawyer_prep(doc)

    verified_questions = []
    for q in prep.questions:
        v_ev = verify_evidence(q.evidence, doc)
        verified_questions.append(q.model_copy(update={"evidence": v_ev}))

    updated_prep = prep.model_copy(update={"questions": verified_questions})
    analysis_cache.set(doc.metadata.sha256_hash, "lawyer_prep", updated_prep)
    return updated_prep
