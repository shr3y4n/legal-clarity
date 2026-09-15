from fastapi import HTTPException, status

from app.models.schemas import Comparison
from app.services.caching.cache import analysis_cache
from app.services.evidence.verifier import verify_evidence
from app.services.providers import get_provider
from app.services.storage.document_store import document_store


async def compare_documents_service(doc_a_id: str, doc_b_id: str) -> Comparison:
    doc_a = document_store.get(doc_a_id)
    if not doc_a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base document '{doc_a_id}' not found or expired."
        )

    doc_b = document_store.get(doc_b_id)
    if not doc_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comparison document '{doc_b_id}' not found or expired."
        )

    cache_key = f"{doc_a.metadata.sha256_hash}_{doc_b.metadata.sha256_hash}"
    cached = analysis_cache.get(cache_key, "compare")
    if cached:
        return cached

    provider = get_provider()
    comp = await provider.compare(doc_a, doc_b)

    # Verify evidence on changes
    verified_changes = []
    for chg in comp.changes:
        v_old = verify_evidence(chg.old_evidence, doc_a) if chg.old_evidence else None
        v_new = verify_evidence(chg.new_evidence, doc_b) if chg.new_evidence else None
        verified_changes.append(
            chg.model_copy(update={"old_evidence": v_old, "new_evidence": v_new})
        )

    updated_comp = comp.model_copy(update={"changes": verified_changes})
    analysis_cache.set(cache_key, "compare", updated_comp)
    return updated_comp
