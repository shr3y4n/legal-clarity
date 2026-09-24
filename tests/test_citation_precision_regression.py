import io
import pytest
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.models.schemas import Document
from app.services.chunking.chunker import chunk_document
from app.services.extraction.extractor import process_document
from app.services.extraction.pdf_extractor import extract_pdf
from app.services.providers.demo_provider import DemoLLMProvider
from app.services.retrieval.indexer import index_document_chunks, retrieve_relevant_chunks


def generate_synthetic_benchmark_pdf() -> bytes:
    """
    Generates the exact multi-page synthetic test document used in the hackathon benchmark.
    Contains repeating running footers, numbered sections, and atomic subclauses across 3 pages.
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)

    # --- Page 1 ---
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 750, "SYNTHETIC TEST DOCUMENT PROFESSIONAL SERVICES AGREEMENT")
    c.drawString(72, 720, "1. SERVICES")
    c.setFont("Helvetica", 9)
    c.drawString(72, 705, "1.1 Provider shall deliver end-to-end cloud migration and architecture")
    c.drawString(72, 690, "modernization services in accordance with agreed specifications.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 660, "2. TERM")
    c.setFont("Helvetica", 9)
    c.drawString(72, 645, "2.1 This Agreement shall commence on October 1, 2025 and continue")
    c.drawString(72, 630, "for an initial period of twelve (12) months.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 600, "3. FEES AND PAYMENT")
    c.setFont("Helvetica", 9)
    c.drawString(72, 585, "3.1 The Client shall pay an implementation fee of INR 500,000 upon contract execution.")
    c.drawString(72, 560, "3.2 All invoices are payable net 30 days from the date of invoice receipt.")
    c.drawString(72, 50, "Legal Clarity Synthetic Benchmark • Page 1")
    c.showPage()

    # --- Page 2 ---
    c.setFont("Helvetica", 9)
    c.drawString(72, 750, "3.3 Maintenance services after deployment shall cost INR 35,000 per month.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 710, "6. WARRANTY")
    c.setFont("Helvetica", 9)
    c.drawString(72, 695, "6.1 Provider warrants that the services will conform to specifications")
    c.drawString(72, 680, "for a warranty period of ninety (90) days from delivery.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 640, "7. TERMINATION")
    c.setFont("Helvetica", 9)
    c.drawString(72, 625, "7.1 Either party may terminate this Agreement for convenience")
    c.drawString(72, 610, "upon sixty (60) days advance written notice.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 570, "11. LIMITATION OF LIABILITY")
    c.setFont("Helvetica", 9)
    c.drawString(72, 555, "11.1 Neither party shall be liable for indirect, incidental, or consequential damages.")
    c.drawString(72, 535, "11.2 The aggregate liability of either party under this Agreement shall not exceed")
    c.drawString(72, 520, "the total fees paid by Client in the preceding twelve (12) months.")
    c.drawString(72, 50, "Legal Clarity Synthetic Benchmark • Page 2")
    c.showPage()

    # --- Page 3 ---
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 750, "13. GOVERNING LAW AND DISPUTE RESOLUTION")
    c.setFont("Helvetica", 9)
    c.drawString(72, 735, "13.1 This Agreement shall be governed by and construed in accordance with")
    c.drawString(72, 720, "the substantive laws of the Republic of India.")
    c.drawString(72, 695, "13.2 Any disputes arising out of this Agreement shall be referred to arbitration")
    c.drawString(72, 680, "in accordance with the Arbitration and Conciliation Act.")
    c.drawString(72, 665, "The specific court jurisdiction or judicial venue is not specified herein.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(72, 630, "14. TERM RENEWAL")
    c.setFont("Helvetica", 9)
    c.drawString(72, 615, "14.1 This Agreement shall automatically renew on an annual basis")
    c.drawString(72, 600, "for successive one-year terms unless terminated in accordance with Section 7.")
    c.drawString(72, 575, "14.2 Any annual fee increase upon renewal shall not exceed a maximum increase")
    c.drawString(72, 560, "of 5% of the preceding term's baseline fees.")
    c.drawString(72, 50, "Legal Clarity Synthetic Benchmark • Page 3")
    c.showPage()

    c.save()
    return buf.getvalue()


@pytest.fixture
def benchmark_doc() -> Document:
    pdf_bytes = generate_synthetic_benchmark_pdf()
    doc = process_document("legal_clarity_benchmark_service_agreement.pdf", pdf_bytes, "application/pdf")
    chunks = chunk_document(doc)
    index_document_chunks(doc.metadata.document_id, chunks)
    return doc


def test_pdf_extraction_precision(benchmark_doc: Document):
    """
    Asserts that repeating headers/footers and synthetic markers are stripped,
    and subclauses are segmented into fine-grained atomic units.
    """
    assert benchmark_doc.metadata.page_count == 3
    assert len(benchmark_doc.pages) == 3

    # Ensure repeating footer was removed from all pages
    for page in benchmark_doc.pages:
        assert "Legal Clarity Synthetic Benchmark" not in page.text
        assert "--- PAGE" not in page.text

    # Check atomic subclauses on Page 1
    p1_clauses = {s.clause_number: s for s in benchmark_doc.pages[0].sections if s.clause_number}
    assert "1.1" in p1_clauses
    assert "3.1" in p1_clauses
    assert "3.2" in p1_clauses
    assert "INR 500,000" in p1_clauses["3.1"].text
    assert "net 30 days" in p1_clauses["3.2"].text

    # Check atomic subclauses on Page 2
    p2_clauses = {s.clause_number: s for s in benchmark_doc.pages[1].sections if s.clause_number}
    assert "3.3" in p2_clauses
    assert "INR 35,000 per month" in p2_clauses["3.3"].text
    assert "6.1" in p2_clauses
    assert "ninety (90) days" in p2_clauses["6.1"].text
    assert "7.1" in p2_clauses
    assert "sixty (60) days" in p2_clauses["7.1"].text
    assert "11.2" in p2_clauses
    assert "total fees paid by Client in the preceding twelve (12) months" in p2_clauses["11.2"].text

    # Check atomic subclauses on Page 3
    p3_clauses = {s.clause_number: s for s in benchmark_doc.pages[2].sections if s.clause_number}
    assert "13.1" in p3_clauses
    assert "Republic of India" in p3_clauses["13.1"].text
    assert "13.2" in p3_clauses
    assert "14.1" in p3_clauses
    assert "14.2" in p3_clauses
    assert "5%" in p3_clauses["14.2"].text


@pytest.mark.asyncio
async def test_monthly_maintenance_fee_query(benchmark_doc: Document):
    """
    Mandated Query 1: Monthly maintenance fee.
    Must return INR 35,000, Clause 3.3, Page 2.
    Must NOT contain PAGE 1, document title, or footer text.
    """
    provider = DemoLLMProvider()
    q = "What is the monthly maintenance fee?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "35,000" in ans.answer_text
    assert len(ans.citations) >= 1

    cit = ans.citations[0]
    assert cit.clause_number == "3.3"
    assert cit.page == 2
    assert "35,000 per month" in cit.source_text
    # Strict negative assertions: no page markers, headers, or footers in citation
    assert "PAGE 1" not in cit.source_text
    assert "Legal Clarity Synthetic Benchmark" not in cit.source_text
    assert "SYNTHETIC TEST DOCUMENT" not in cit.source_text


@pytest.mark.asyncio
async def test_implementation_fee_query(benchmark_doc: Document):
    """Mandated Query 2: Implementation fee (Clause 3.1, Page 1)."""
    provider = DemoLLMProvider()
    q = "What is the implementation fee?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "500,000" in ans.answer_text
    assert ans.citations[0].clause_number == "3.1"
    assert ans.citations[0].page == 1
    assert "Legal Clarity Synthetic Benchmark" not in ans.citations[0].source_text


@pytest.mark.asyncio
async def test_payment_terms_query(benchmark_doc: Document):
    """Mandated Query 3: Payment terms (Clause 3.2, Page 1)."""
    provider = DemoLLMProvider()
    q = "What are the payment terms for invoices?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "30 days" in ans.answer_text
    assert ans.citations[0].clause_number == "3.2"
    assert ans.citations[0].page == 1


@pytest.mark.asyncio
async def test_warranty_period_query(benchmark_doc: Document):
    """Mandated Query 4: Warranty period (Clause 6.1, Page 2)."""
    provider = DemoLLMProvider()
    q = "What is the warranty period for services?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "90" in ans.answer_text
    assert ans.citations[0].clause_number == "6.1"
    assert ans.citations[0].page == 2


@pytest.mark.asyncio
async def test_convenience_termination_notice_query(benchmark_doc: Document):
    """Mandated Query 5: Notice for convenience termination (Clause 7.1, Page 2)."""
    provider = DemoLLMProvider()
    q = "What is the notice period for convenience termination?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "60" in ans.answer_text
    assert ans.citations[0].clause_number == "7.1"
    assert ans.citations[0].page == 2


@pytest.mark.asyncio
async def test_liability_cap_query(benchmark_doc: Document):
    """Mandated Query 6: Liability cap (Clause 11.2, Page 2)."""
    provider = DemoLLMProvider()
    q = "What is the liability cap under this agreement?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "twelve (12) months" in ans.answer_text or "preceding" in ans.answer_text
    assert ans.citations[0].clause_number == "11.2"
    assert ans.citations[0].page == 2


@pytest.mark.asyncio
async def test_renewal_frequency_query(benchmark_doc: Document):
    """Mandated Query 7: Renewal frequency (Clause 14.1, Page 3)."""
    provider = DemoLLMProvider()
    q = "What is the renewal frequency of this contract?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "annual" in ans.answer_text or "one-year" in ans.answer_text
    assert ans.citations[0].clause_number == "14.1"
    assert ans.citations[0].page == 3


@pytest.mark.asyncio
async def test_max_renewal_fee_increase_query(benchmark_doc: Document):
    """Mandated Query 8: Maximum renewal fee increase (Clause 14.2, Page 3)."""
    provider = DemoLLMProvider()
    q = "What is the maximum renewal fee increase allowed?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "5%" in ans.answer_text
    assert ans.citations[0].clause_number == "14.2"
    assert ans.citations[0].page == 3


@pytest.mark.asyncio
async def test_governing_law_jurisdiction_query(benchmark_doc: Document):
    """Mandated Query 9: Governing law & unspecified jurisdiction (Clause 13.1 / 13.2, Page 3)."""
    provider = DemoLLMProvider()
    q = "What is the governing law and court jurisdiction?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "India" in ans.answer_text
    assert "not specified" in ans.answer_text or "not specified" in ans.citations[0].source_text
    assert ans.citations[0].page == 3


@pytest.mark.asyncio
async def test_missing_information_bank_account_query(benchmark_doc: Document):
    """
    Mandated Query 10: Missing information query.
    Must state not found / not provided, with NO false citations.
    """
    provider = DemoLLMProvider()
    q = "What is the bank account number for wire transfers?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is False
    assert ans.refusal_reason is not None
    assert len(ans.citations) == 0
    assert len(ans.evidence) == 0


@pytest.mark.asyncio
async def test_document_summary_query(benchmark_doc: Document):
    """Handles high-level question: What is this agreement about?"""
    provider = DemoLLMProvider()
    q = "What is this agreement about?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "agreement" in ans.answer_text.lower() or "contract" in ans.answer_text.lower()
    assert len(ans.citations) >= 1


@pytest.mark.asyncio
async def test_parties_query(benchmark_doc: Document):
    """Handles parties question: Who are the parties to this agreement?"""
    provider = DemoLLMProvider()
    q = "Who are the parties to this agreement?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "Provider" in ans.answer_text
    assert len(ans.citations) >= 1


@pytest.mark.asyncio
async def test_term_query(benchmark_doc: Document):
    """Handles term question: What is the term of this agreement?"""
    provider = DemoLLMProvider()
    q = "What is the term of this agreement?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "October 1, 2025" in ans.answer_text or "twelve" in ans.answer_text.lower()
    assert ans.citations[0].clause_number == "2.1"


@pytest.mark.asyncio
async def test_services_query(benchmark_doc: Document):
    """Handles services question: What services are provided?"""
    provider = DemoLLMProvider()
    q = "What services are provided under this contract?"
    chunks = retrieve_relevant_chunks(benchmark_doc.metadata.document_id, q, top_k=4)
    ans = await provider.ask(benchmark_doc, q, chunks)

    assert ans.is_supported is True
    assert "cloud migration" in ans.answer_text.lower()
    assert ans.citations[0].clause_number == "1.1"
