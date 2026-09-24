import pytest
from app.models.schemas import ChangeClassification, Document, DocumentMetadata, Page, ReviewLevel, Section
from app.services.chunking.chunker import chunk_document
from app.services.retrieval.indexer import index_document_chunks
from app.services.storage.document_store import document_store
from app.services.analysis.ask import ask_document_question
from app.services.analysis.checklist import get_document_checklist
from app.services.analysis.compare import compare_documents_service
from app.services.analysis.lawyer_prep import get_lawyer_prep_questions
from app.services.analysis.review import get_document_review
from app.services.analysis.understand import get_document_understanding


def setup_sample_agreement(doc_id: str, title: str, notice_days: int) -> Document:
    text = (
        f"COMMERCIAL SERVICE AGREEMENT\n\n"
        f"SECTION 1.0 SERVICES AND COMPENSATION\n"
        f"Client shall pay Contractor the sum of $10,000 upon delivery.\n\n"
        f"SECTION 2.0 NOTICE AND TERMINATION\n"
        f"Either party may terminate upon {notice_days} days prior written notice.\n\n"
        f"SECTION 3.0 INDEMNIFICATION AND LIABILITY\n"
        f"Contractor shall indemnify, defend, and hold harmless the Client against all third-party claims.\n\n"
        f"SECTION 4.0 GOVERNING LAW\n"
        f"This agreement is governed by the laws of New York.\n"
    )
    metadata = DocumentMetadata(
        document_id=doc_id,
        filename=title,
        sha256_hash=f"hash_{doc_id}",
        mime_type="text/plain",
        byte_size=len(text),
        page_count=1,
        created_at="2026-09-15T00:00:00Z"
    )
    sec1 = Section(section_id="p1_s1", page_number=1, heading="SECTION 1.0 SERVICES AND COMPENSATION", clause_number="1.0", text="Client shall pay Contractor the sum of $10,000 upon delivery.", start_char=0, end_char=60)
    sec2 = Section(section_id="p1_s2", page_number=1, heading="SECTION 2.0 NOTICE AND TERMINATION", clause_number="2.0", text=f"Either party may terminate upon {notice_days} days prior written notice.", start_char=61, end_char=130)
    sec3 = Section(section_id="p1_s3", page_number=1, heading="SECTION 3.0 INDEMNIFICATION AND LIABILITY", clause_number="3.0", text="Contractor shall indemnify, defend, and hold harmless the Client against all third-party claims.", start_char=131, end_char=225)
    sec4 = Section(section_id="p1_s4", page_number=1, heading="SECTION 4.0 GOVERNING LAW", clause_number="4.0", text="This agreement is governed by the laws of New York.", start_char=226, end_char=280)

    p1 = Page(page_number=1, text=text, sections=[sec1, sec2, sec3, sec4])
    doc = Document(metadata=metadata, pages=[p1], full_text=text)

    # Save to store and index
    document_store.save(doc)
    chunks = chunk_document(doc)
    index_document_chunks(doc_id, chunks)
    return doc


@pytest.mark.asyncio
async def test_understand_service():
    doc = setup_sample_agreement("doc_svc_1", "service_v1.txt", 30)
    understanding = await get_document_understanding("doc_svc_1")
    assert understanding.document_id == "doc_svc_1"
    assert "Service" in understanding.document_type
    assert len(understanding.major_obligations) > 0
    assert understanding.concise_summary != ""


@pytest.mark.asyncio
async def test_review_service_classification():
    doc = setup_sample_agreement("doc_svc_2", "service_v2.txt", 30)
    review_resp = await get_document_review("doc_svc_2")
    assert review_resp.total_clauses_reviewed >= 2

    levels = [item.level for item in review_resp.review_items]
    # Indemnification should trigger IMPORTANT_TO_REVIEW
    assert ReviewLevel.IMPORTANT_TO_REVIEW in levels
    # Every review item must provide evidence and user-facing rationale
    for item in review_resp.review_items:
        assert item.why_highlighted.startswith("This was highlighted")
        assert item.evidence.verified is True
        assert len(item.options_and_next_steps) >= 3


@pytest.mark.asyncio
async def test_inconsistencies_and_options_detection():
    text = (
        "CONFIDENTIAL COMMERCIAL AGREEMENT\n\n"
        "SECTION 1.0 TERMINATION FOR CONVENIENCE\n"
        "Either party may terminate upon 30 days prior written notice.\n\n"
        "SECTION 2.0 NON-RENEWAL NOTICE\n"
        "Notice of non-renewal must be delivered at least 60 days prior to expiration.\n\n"
        "SECTION 3.0 LIMITATION OF LIABILITY\n"
        "Total aggregate liability under this agreement shall be capped at fees paid in prior 3 months.\n\n"
        "SECTION 4.0 INDEMNIFICATION\n"
        "Provider shall indemnify and hold harmless customer from any and all damages without limit.\n"
    )
    metadata = DocumentMetadata(
        document_id="doc_inconsistency_test",
        filename="inconsistent_contract.txt",
        sha256_hash="hash_inconsistency_test",
        mime_type="text/plain",
        byte_size=len(text),
        page_count=1,
        created_at="2026-09-24T00:00:00Z"
    )
    s1 = Section(section_id="p1_s1", page_number=1, heading="SECTION 1.0 TERMINATION FOR CONVENIENCE", clause_number="1.0", text="Either party may terminate upon 30 days prior written notice.", start_char=0, end_char=60)
    s2 = Section(section_id="p1_s2", page_number=1, heading="SECTION 2.0 NON-RENEWAL NOTICE", clause_number="2.0", text="Notice of non-renewal must be delivered at least 60 days prior to expiration.", start_char=61, end_char=140)
    s3 = Section(section_id="p1_s3", page_number=1, heading="SECTION 3.0 LIMITATION OF LIABILITY", clause_number="3.0", text="Total aggregate liability under this agreement shall be capped at fees paid in prior 3 months.", start_char=141, end_char=240)
    s4 = Section(section_id="p1_s4", page_number=1, heading="SECTION 4.0 INDEMNIFICATION", clause_number="4.0", text="Provider shall indemnify and hold harmless customer from any and all damages without limit.", start_char=241, end_char=340)
    p1 = Page(page_number=1, text=text, sections=[s1, s2, s3, s4])
    doc = Document(metadata=metadata, pages=[p1], full_text=text)
    document_store.save(doc)
    chunks = chunk_document(doc)
    index_document_chunks("doc_inconsistency_test", chunks)

    review_resp = await get_document_review("doc_inconsistency_test")
    assert review_resp.inconsistency_count >= 1
    assert len(review_resp.inconsistencies) >= 1
    inc = review_resp.inconsistencies[0]
    assert inc.clause_a_evidence.verified is True
    assert inc.clause_b_evidence.verified is True
    assert len(inc.suggested_remedy) > 0

    for item in review_resp.review_items:
        assert len(item.options_and_next_steps) == 3
        option_types = [opt.option_type for opt in item.options_and_next_steps]
        assert "Accept As-Is" in option_types
        assert "Request Redline / Counter-Proposal" in option_types
        assert "Escalate to Legal Counsel" in option_types


@pytest.mark.asyncio
async def test_ask_answerable_question():
    setup_sample_agreement("doc_svc_3", "service_v3.txt", 30)
    answer = await ask_document_question("doc_svc_3", "What is the compensation amount?")
    assert answer.is_supported is True
    assert "$10,000" in answer.answer_text
    assert len(answer.evidence) > 0
    assert answer.evidence[0].verified is True


@pytest.mark.asyncio
async def test_ask_unanswerable_question_refuses():
    setup_sample_agreement("doc_svc_4", "service_v4.txt", 30)
    # Question about pets in a commercial agreement
    answer = await ask_document_question("doc_svc_4", "Are emotional support dogs allowed in the bedroom?")
    assert answer.is_supported is False
    assert "couldn't find information" in answer.answer_text.lower()


@pytest.mark.asyncio
async def test_compare_service_detects_material_change():
    setup_sample_agreement("doc_comp_a", "agreement_v1.txt", 30)
    setup_sample_agreement("doc_comp_b", "agreement_v2.txt", 60)

    comparison = await compare_documents_service("doc_comp_a", "doc_comp_b")
    assert comparison.doc_a_id == "doc_comp_a"
    assert comparison.doc_b_id == "doc_comp_b"
    assert comparison.material_count >= 1

    material_changes = [c for c in comparison.changes if c.classification == ChangeClassification.MATERIAL]
    assert len(material_changes) >= 1
    assert "30 days" in material_changes[0].old_evidence.source_text
    assert "60 days" in material_changes[0].new_evidence.source_text


@pytest.mark.asyncio
async def test_checklist_service():
    setup_sample_agreement("doc_chk_1", "agreement_chk.txt", 30)
    chk = await get_document_checklist("doc_chk_1")
    assert len(chk.items) >= 2
    for item in chk.items:
        assert item.evidence.verified is True
        assert item.plain_instruction != ""


@pytest.mark.asyncio
async def test_lawyer_prep_service():
    setup_sample_agreement("doc_law_1", "agreement_law.txt", 30)
    prep = await get_lawyer_prep_questions("doc_law_1")
    assert len(prep.questions) >= 1
    assert "LEGAL SAFETY BOUNDARY" in prep.legal_safety_disclaimer
    for q in prep.questions:
        assert q.recommended_question.endswith("?")
