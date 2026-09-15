from fastapi import HTTPException, status

from app.models.schemas import Answer
from app.services.evidence.verifier import verify_evidence
from app.services.providers import get_provider
from app.services.retrieval.indexer import retrieve_relevant_chunks
from app.services.security.prompt_shield import sanitize_user_question
from app.services.storage.document_store import document_store


async def ask_document_question(document_id: str, raw_question: str) -> Answer:
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or has expired."
        )

    clean_question, is_suspicious = sanitize_user_question(raw_question)
    if is_suspicious:
        return Answer(
            answer_text="The requested inquiry cannot be processed because it contains potential adversarial instructions. Questions must strictly seek factual information from the uploaded document.",
            is_supported=False,
            refusal_reason="Potential prompt injection or out-of-bounds meta-instruction detected.",
            evidence=[],
            is_demo=False
        )

    chunks = retrieve_relevant_chunks(document_id, clean_question, top_k=5)
    provider = get_provider()
    answer = await provider.ask(doc, clean_question, chunks)

    # Secondary verification guard
    if answer.is_supported and answer.evidence:
        verified_ev_list = []
        for ev in answer.evidence:
            checked_ev = verify_evidence(ev, doc)
            verified_ev_list.append(checked_ev)

        # If any primary evidence failed, demote to unsupported
        if any(not e.verified for e in verified_ev_list):
            return Answer(
                answer_text="I couldn't find verified information in this document to support an answer to that question.",
                is_supported=False,
                refusal_reason="Cited evidence failed strict textual containment verification.",
                evidence=verified_ev_list,
                is_demo=answer.is_demo
            )
        answer = answer.model_copy(update={"evidence": verified_ev_list})

    return answer
