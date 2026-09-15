from app.models.schemas import Claim, Document, DocumentMetadata, Evidence, Page
from app.services.evidence.verifier import (
    compute_containment_score,
    verify_claim,
    verify_evidence,
)


def create_dummy_document() -> Document:
    metadata = DocumentMetadata(
        document_id="doc_test_123",
        filename="test_agreement.txt",
        sha256_hash="dummyhash123",
        mime_type="text/plain",
        byte_size=500,
        page_count=2,
        created_at="2026-09-15T00:00:00Z"
    )
    p1 = Page(
        page_number=1,
        text="SECTION 1.0 NOTICE. The tenant must provide 60 days written notice prior to departure.",
        sections=[]
    )
    p2 = Page(
        page_number=2,
        text="SECTION 2.0 SECURITY DEPOSIT. The total deposit is $3,000 payable upon signing.",
        sections=[]
    )
    return Document(metadata=metadata, pages=[p1, p2], full_text=f"{p1.text}\n\n{p2.text}")


def test_verify_evidence_success():
    doc = create_dummy_document()
    ev = Evidence(
        evidence_id="ev_1",
        document_id="doc_test_123",
        page=1,
        section="Notice",
        source_text="The tenant must provide 60 days written notice",
        verified=False
    )
    checked = verify_evidence(ev, doc)
    assert checked.verified is True
    assert checked.verification_score >= 0.9


def test_verify_evidence_document_mismatch():
    doc = create_dummy_document()
    ev = Evidence(
        evidence_id="ev_2",
        document_id="wrong_doc_id",
        page=1,
        source_text="The tenant must provide 60 days written notice",
        verified=False
    )
    checked = verify_evidence(ev, doc)
    assert checked.verified is False
    assert "Document mismatch" in checked.verification_note or "does not match" in checked.verification_note


def test_verify_evidence_page_out_of_bounds():
    doc = create_dummy_document()
    ev = Evidence(
        evidence_id="ev_3",
        document_id="doc_test_123",
        page=99,
        source_text="The tenant must provide 60 days written notice",
        verified=False
    )
    checked = verify_evidence(ev, doc)
    assert checked.verified is False
    assert "out of bounds" in checked.verification_note


def test_verify_evidence_fabricated_quote():
    doc = create_dummy_document()
    ev = Evidence(
        evidence_id="ev_4",
        document_id="doc_test_123",
        page=1,
        source_text="The tenant can terminate at any time with zero penalties or notice.",
        verified=False
    )
    checked = verify_evidence(ev, doc)
    assert checked.verified is False
    assert checked.verification_score < 0.5


def test_verify_claim_demotes_unsupported():
    doc = create_dummy_document()
    fake_ev = Evidence(
        evidence_id="ev_fake",
        document_id="doc_test_123",
        page=1,
        source_text="Non-existent contract language",
        verified=False
    )
    claim = Claim(
        statement="Tenant can paint the exterior purple.",
        evidence=[fake_ev],
        is_supported=True
    )
    checked_claim = verify_claim(claim, doc)
    assert checked_claim.is_supported is False
    assert checked_claim.evidence[0].verified is False
