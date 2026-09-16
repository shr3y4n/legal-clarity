from fastapi import HTTPException, status

from app.models.schemas import DocumentChecklist
from app.services.caching.cache import analysis_cache
from app.services.evidence.verifier import verify_evidence
from app.services.providers import get_provider
from app.services.storage.document_store import document_store


async def get_document_checklist(document_id: str) -> DocumentChecklist:
    """
    Generates actionable pre-signing compliance and verification checklists.
    Grounds checklist items against verified source evidence, caching results by document hash.
    """
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or has expired."
        )

    cached = analysis_cache.get(doc.metadata.sha256_hash, "checklist")
    if cached:
        return cached.model_copy(update={"is_cached": True})


    provider = get_provider()
    chk = await provider.checklist(doc)

    verified_items = []
    for item in chk.items:
        v_ev = verify_evidence(item.evidence, doc)
        verified_items.append(item.model_copy(update={"evidence": v_ev}))

    updated_chk = chk.model_copy(update={"items": verified_items})
    analysis_cache.set(doc.metadata.sha256_hash, "checklist", updated_chk)
    return updated_chk
