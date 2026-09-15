import re
from typing import List

from app.config import get_settings
from app.models.schemas import Claim, Document, Evidence

settings = get_settings()


def normalize_text_for_comparison(text: str) -> str:
    """
    Normalizes whitespace, smart quotes, dashes, and case for robust text containment verification.
    """
    if not text:
        return ""
    normalized = text.lower()
    # Replace smart quotes and dashes
    normalized = normalized.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    normalized = normalized.replace("—", "-").replace("–", "-")
    # Collapse consecutive whitespace
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def compute_containment_score(query: str, target: str) -> float:
    """
    Calculates token containment of query within target document text.
    Returns a score between 0.0 and 1.0.
    """
    norm_query = normalize_text_for_comparison(query)
    norm_target = normalize_text_for_comparison(target)

    if not norm_query or not norm_target:
        return 0.0

    # Direct substring match
    if norm_query in norm_target:
        return 1.0

    query_tokens = norm_query.split()
    if not query_tokens:
        return 0.0

    # Check 4-gram and 3-gram window matches
    window_size = len(query_tokens)
    target_tokens = norm_target.split()

    if len(target_tokens) < window_size:
        # Check reverse containment if query is longer than target
        common = set(query_tokens).intersection(set(target_tokens))
        return len(common) / len(query_tokens)

    # Word overlap in local context
    best_overlap = 0.0
    query_token_set = set(query_tokens)

    # Scan with sliding window
    step = max(1, window_size // 4)
    for i in range(0, len(target_tokens) - window_size + 1, step):
        window = target_tokens[i : i + window_size]
        overlap = len(query_token_set.intersection(set(window))) / len(query_token_set)
        if overlap > best_overlap:
            best_overlap = overlap
            if best_overlap >= 0.95:
                break

    return best_overlap


def verify_evidence(evidence: Evidence, document: Document) -> Evidence:
    """
    Strict backend verification of an evidence citation against the extracted document.
    Ensures:
    1. Belongs to the correct document.
    2. Referenced page exists.
    3. Cited text actually exists in the page (or document fallback).
    """
    # 1. Document ID match
    if evidence.document_id != document.metadata.document_id:
        return evidence.model_copy(
            update={
                "verified": False,
                "verification_score": 0.0,
                "verification_note": "Citation document ID does not match current document."
            }
        )

    # 2. Page validity check
    total_pages = len(document.pages)
    if evidence.page < 1 or evidence.page > total_pages:
        return evidence.model_copy(
            update={
                "verified": False,
                "verification_score": 0.0,
                "verification_note": f"Referenced page {evidence.page} out of bounds (document has {total_pages} pages)."
            }
        )

    # 3. Source text containment
    target_page = document.pages[evidence.page - 1]
    page_score = compute_containment_score(evidence.source_text, target_page.text)

    # If not fully matched on cited page, search entire document in case of off-by-one page index
    doc_score = page_score
    corrected_page = evidence.page
    if page_score < settings.EVIDENCE_VERIFICATION_THRESHOLD:
        for idx, p in enumerate(document.pages):
            score = compute_containment_score(evidence.source_text, p.text)
            if score > doc_score:
                doc_score = score
                corrected_page = idx + 1
                if doc_score >= settings.EVIDENCE_VERIFICATION_THRESHOLD:
                    break

    verified = doc_score >= settings.EVIDENCE_VERIFICATION_THRESHOLD
    note = "Verified against source document text." if verified else (
        f"Verification failed: cited text overlap {doc_score:.2f} is below threshold {settings.EVIDENCE_VERIFICATION_THRESHOLD}"
    )

    return evidence.model_copy(
        update={
            "page": corrected_page,
            "verified": verified,
            "verification_score": round(doc_score, 3),
            "verification_note": note
        }
    )


def verify_claim(claim: Claim, document: Document) -> Claim:
    """
    Verifies all evidence supporting a factual claim. If evidence cannot be verified,
    the claim is marked as unsupported.
    """
    if not claim.evidence:
        return claim.model_copy(update={"is_supported": False})

    verified_evidence_list: List[Evidence] = []
    any_failed = False

    for ev in claim.evidence:
        checked_ev = verify_evidence(ev, document)
        verified_evidence_list.append(checked_ev)
        if not checked_ev.verified:
            any_failed = True

    return claim.model_copy(
        update={
            "evidence": verified_evidence_list,
            "is_supported": not any_failed and len(verified_evidence_list) > 0
        }
    )


def verify_claims_list(claims: List[Claim], document: Document) -> List[Claim]:
    return [verify_claim(c, document) for c in claims]
