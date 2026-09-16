import time
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.schemas import Document, DocumentMetadata, Page, Section
from app.services.analysis.ask import ask_document_question
from app.services.analysis.review import get_document_review
from app.services.analysis.understand import get_document_understanding
from app.services.caching.cache import AnalysisCache, analysis_cache
from app.services.chunking.chunker import chunk_document
from app.services.retrieval.indexer import index_document_chunks
from app.services.storage.document_store import document_store


def setup_cache_test_document(doc_id: str) -> Document:
    text = (
        "CONFIDENTIAL MASTER AGREEMENT\n\n"
        "SECTION 1.0 COMPENSATION\n"
        "Fees shall be $50,000 paid quarterly.\n\n"
        "SECTION 2.0 TERMINATION\n"
        "Either party may terminate on sixty (60) days written notice.\n"
    )
    metadata = DocumentMetadata(
        document_id=doc_id,
        filename=f"{doc_id}.txt",
        sha256_hash=f"hash_{doc_id}",
        mime_type="text/plain",
        byte_size=len(text),
        page_count=1,
        created_at="2026-09-15T00:00:00Z"
    )
    sec1 = Section(
        section_id="p1_s1",
        page_number=1,
        heading="SECTION 1.0 COMPENSATION",
        clause_number="1.0",
        text="Fees shall be $50,000 paid quarterly.",
        start_char=0,
        end_char=50
    )
    p1 = Page(page_number=1, text=text, sections=[sec1])
    doc = Document(metadata=metadata, pages=[p1], full_text=text)

    document_store.save(doc)
    chunks = chunk_document(doc)
    index_document_chunks(doc_id, chunks)
    return doc


def test_analysis_cache_hit_miss_and_stats():
    cache = AnalysisCache()
    assert cache.get("doc1", "op1") is None
    stats = cache.get_stats()
    assert stats["misses"] == 1
    assert stats["hits"] == 0
    assert stats["hit_rate_pct"] == 0.0

    cache.set("doc1", "op1", {"result": "data"})
    hit = cache.get("doc1", "op1")
    assert hit == {"result": "data"}

    stats = cache.get_stats()
    assert stats["hits"] == 1
    assert stats["misses"] == 1
    assert stats["hit_rate_pct"] == 50.0
    assert stats["total_cached_items"] == 1

    cache.clear()
    stats = cache.get_stats()
    assert stats["hits"] == 0
    assert stats["misses"] == 0
    assert stats["total_cached_items"] == 0


@pytest.mark.asyncio
async def test_operation_caching_and_token_usage():
    analysis_cache.clear()
    doc_id = "cache_test_doc_1"
    setup_cache_test_document(doc_id)

    # First run: cache miss
    first_res = await get_document_understanding(doc_id)
    assert first_res.is_cached is False
    assert first_res.token_usage is not None
    assert first_res.token_usage.prompt_tokens > 0
    assert first_res.token_usage.savings_vs_full_document_pct is not None

    # Second run: cache hit!
    second_res = await get_document_understanding(doc_id)
    assert second_res.is_cached is True
    assert second_res.document_type == first_res.document_type

    stats = analysis_cache.get_stats()
    assert stats["hits"] >= 1


@pytest.mark.asyncio
async def test_ask_caching():
    doc_id = "cache_test_doc_2"
    setup_cache_test_document(doc_id)

    q = "What are the fees?"
    ans1 = await ask_document_question(doc_id, q)
    assert ans1.is_cached is False
    assert ans1.is_supported is True
    assert ans1.token_usage is not None

    ans2 = await ask_document_question(doc_id, q)
    assert ans2.is_cached is True
    assert ans2.answer_text == ans1.answer_text


@pytest.mark.asyncio
async def test_cache_metrics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/metrics/cache")
        assert res.status_code == 200
        data = res.json()
        assert "hits" in data
        assert "misses" in data
        assert "hit_rate_pct" in data
        assert "total_cached_items" in data
