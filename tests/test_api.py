import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_and_readiness_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_health = await client.get("/api/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "healthy"

        res_ready = await client.get("/api/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_security_headers_present():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.headers.get("X-Content-Type-Options") == "nosniff"
        assert res.headers.get("X-Frame-Options") == "DENY"
        assert "X-Request-ID" in res.headers


@pytest.mark.asyncio
async def test_full_document_api_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Upload valid TXT document
        doc_content = (
            b"CONSULTING AGREEMENT\n\n"
            b"SECTION 1.0 SERVICES AND COMPENSATION\n"
            b"Client will pay Consultant $150 per hour.\n\n"
            b"SECTION 2.0 NOTICE AND TERMINATION\n"
            b"Either party may terminate with 30 days written notice.\n\n"
            b"SECTION 3.0 INDEMNITY\n"
            b"Consultant shall indemnify and hold harmless the Client.\n"
        )
        files = {"file": ("consulting.txt", io.BytesIO(doc_content), "text/plain")}
        res_upload = await client.post("/api/documents", files=files)
        assert res_upload.status_code == 201
        doc_data = res_upload.json()
        doc_id = doc_data["metadata"]["document_id"]
        assert doc_id.startswith("doc_")

        # 2. Get document
        res_get = await client.get(f"/api/documents/{doc_id}")
        assert res_get.status_code == 200
        assert res_get.json()["metadata"]["filename"] == "consulting.txt"

        # 3. Understand document
        res_under = await client.get(f"/api/documents/{doc_id}/understand")
        assert res_under.status_code == 200
        assert "parties" in res_under.json()

        # 4. Review document
        res_rev = await client.get(f"/api/documents/{doc_id}/review")
        assert res_rev.status_code == 200
        rev_data = res_rev.json()
        assert rev_data["total_clauses_reviewed"] >= 1
        assert "inconsistencies" in rev_data
        assert "options_and_next_steps" in rev_data["review_items"][0]

        # 5. Ask document (answerable)
        res_ask = await client.post(
            f"/api/documents/{doc_id}/ask",
            json={"question_text": "What is the hourly compensation rate?"}
        )
        assert res_ask.status_code == 200
        assert res_ask.json()["is_supported"] is True
        assert "$150" in res_ask.json()["answer_text"]

        # 6. Ask document (unanswerable)
        res_ask_unsupported = await client.post(
            f"/api/documents/{doc_id}/ask",
            json={"question_text": "Can tenant keep a pet iguana in the living room?"}
        )
        assert res_ask_unsupported.status_code == 200
        assert res_ask_unsupported.json()["is_supported"] is False

        # 7. Checklist
        res_chk = await client.get(f"/api/documents/{doc_id}/checklist")
        assert res_chk.status_code == 200
        assert len(res_chk.json()["items"]) >= 1

        # 8. Lawyer Prep
        res_prep = await client.get(f"/api/documents/{doc_id}/lawyer-prep")
        assert res_prep.status_code == 200
        assert len(res_prep.json()["questions"]) >= 1

        # 9. Deadlines Timeline
        res_dl = await client.get(f"/api/documents/{doc_id}/deadlines")
        assert res_dl.status_code == 200
        dl_data = res_dl.json()
        assert len(dl_data["deadlines"]) >= 1
        assert "Notice" in dl_data["deadlines"][0]["category"]

        # 10. Calendar (.ics) Export
        res_ics = await client.get(f"/api/documents/{doc_id}/calendar.ics")
        assert res_ics.status_code == 200
        assert "text/calendar" in res_ics.headers.get("content-type", "")
        assert "BEGIN:VCALENDAR" in res_ics.text
        assert "END:VCALENDAR" in res_ics.text
        assert "BEGIN:VEVENT" in res_ics.text

        # 11. Delete document
        res_del = await client.delete(f"/api/documents/{doc_id}")
        assert res_del.status_code == 200

        # 10. Check 404 after deletion
        res_missing = await client.get(f"/api/documents/{doc_id}")
        assert res_missing.status_code == 404


@pytest.mark.asyncio
async def test_compare_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Upload doc 1
        d1 = b"SECTION 1.0 NOTICE\nTenant must provide 30 days notice."
        res1 = await client.post("/api/documents", files={"file": ("v1.txt", io.BytesIO(d1), "text/plain")})
        id1 = res1.json()["metadata"]["document_id"]

        # Upload doc 2
        d2 = b"SECTION 1.0 NOTICE\nTenant must provide 60 days notice."
        res2 = await client.post("/api/documents", files={"file": ("v2.txt", io.BytesIO(d2), "text/plain")})
        id2 = res2.json()["metadata"]["document_id"]

        # Compare
        res_comp = await client.post("/api/compare", json={"doc_a_id": id1, "doc_b_id": id2})
        assert res_comp.status_code == 200
        comp_data = res_comp.json()
        assert comp_data["material_count"] >= 1
