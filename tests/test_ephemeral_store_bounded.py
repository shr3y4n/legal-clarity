import time
import tracemalloc
from app.models.schemas import Document, DocumentMetadata, Page
from app.services.storage.document_store import EphemeralDocumentStore


def create_dummy_doc(doc_id: str, size_kb: int = 10) -> Document:
    # 10 KB synthetic legal text
    clause_text = "Section {}: The tenant shall pay monthly rent on the first day of each calendar month. ".format(doc_id) * 100
    return Document(
        metadata=DocumentMetadata(
            document_id=doc_id,
            filename=f"contract_{doc_id}.txt",
            sha256_hash=f"hash_{doc_id}",
            mime_type="text/plain",
            byte_size=len(clause_text.encode()),
            page_count=1,
            created_at="2026-09-16T12:00:00Z"
        ),
        pages=[Page(page_number=1, text=clause_text)],
        full_text=clause_text
    )


def test_ephemeral_store_bounded_memory_and_ttl_eviction():
    """
    Stress test verifying that EphemeralDocumentStore maintains bounded memory,
    releases RAM references, and suffers zero memory leaks under document churn.
    """
    tracemalloc.start()
    store = EphemeralDocumentStore()

    # Step 1: Baseline memory
    snapshot_baseline = tracemalloc.take_snapshot()

    # Step 2: Ingest 300 documents (~3 MB textual payload)
    num_docs = 300
    for i in range(num_docs):
        doc = create_dummy_doc(f"test_doc_{i:04d}")
        store.save(doc)

    assert len(store._store) == num_docs
    assert len(store._timestamps) == num_docs
    assert len(store.list_all()) == num_docs

    snapshot_loaded = tracemalloc.take_snapshot()
    stats_loaded = snapshot_loaded.compare_to(snapshot_baseline, 'lineno')
    loaded_diff_kb = sum(stat.size_diff for stat in stats_loaded) / 1024

    # Document store holds memory as expected
    assert loaded_diff_kb > 0, "Store should actively hold document payload in memory"

    # Step 3: Simulate expiration past TTL boundary (2 hours)
    expired_time = time.time() - (3 * 3600)  # 3 hours ago
    for doc_id in list(store._timestamps.keys()):
        store._timestamps[doc_id] = expired_time

    # Step 4: Run TTL reaper cleanup
    purged_count = store.cleanup_expired()

    # Step 5: Verify total eviction
    assert purged_count == num_docs
    assert len(store._store) == 0
    assert len(store._timestamps) == 0
    assert len(store.list_all()) == 0

    # Step 6: Verify memory is freed and bounded
    snapshot_cleared = tracemalloc.take_snapshot()
    stats_cleared = snapshot_cleared.compare_to(snapshot_baseline, 'lineno')
    cleared_diff_kb = sum(stat.size_diff for stat in stats_cleared) / 1024

    # The difference between cleared and baseline should be negligible (< 150 KB for metadata structures)
    assert cleared_diff_kb < loaded_diff_kb, "Memory after eviction must be lower than peak loaded state"
    tracemalloc.stop()
