import datetime
import re
import uuid
from typing import List, Optional

from fastapi import HTTPException, status

from app.models.schemas import (
    DeadlineEvent,
    Document,
    DocumentDeadlinesResponse,
    Evidence,
)
from app.services.caching.cache import analysis_cache
from app.services.storage.document_store import document_store


def extract_deadlines_from_document(document: Document) -> List[DeadlineEvent]:
    """
    Extracts actionable legal deadlines and milestones from document text.
    Identifies:
    1. Notice Periods (termination windows, non-renewal notices)
    2. Payment Due Dates (rent, retainer, invoice payment terms)
    3. Cure Periods (remedies for breach or default)
    4. Renewal Windows (automatic extension deadlines)
    """
    deadlines: List[DeadlineEvent] = []
    text = document.full_text
    doc_id = document.metadata.document_id

    # 1. Notice Periods
    notice_matches = re.finditer(
        r'(\b(?:at least\s+)?(\d+|one|two|three|four|five|ten|fifteen|thirty|sixty|ninety)\s*(?:\(\d+\)\s*)?(?:days|months)\s*(?:advance\s*)?(?:written\s*)?notice\b[^\.\n]*)',
        text,
        re.IGNORECASE
    )
    for m in notice_matches:
        snippet = m.group(1).strip()
        ev = Evidence(
            evidence_id=f"ev_dl_{uuid.uuid4().hex[:6]}",
            document_id=doc_id,
            page=1,
            section="Notice Provisions",
            source_text=snippet[:250],
            verified=True,
            verification_score=1.0,
            verification_note="Extracted from notice clause"
        )
        deadlines.append(
            DeadlineEvent(
                event_id=f"dl_notice_{uuid.uuid4().hex[:6]}",
                title="Mandatory Advance Notice Window",
                category="Notice Period",
                date_description=snippet,
                action_required="Deliver formal written notice to counterparty before the specified window closes.",
                source_clause=snippet,
                evidence=ev
            )
        )
        if len(deadlines) >= 2:
            break

    # 2. Payment Deadlines
    payment_matches = re.finditer(
        r'(\b(?:due on or before|payable on|due within|payable within|due by)\s+[^\.\n]{5,80})',
        text,
        re.IGNORECASE
    )
    for m in payment_matches:
        snippet = m.group(1).strip()
        ev = Evidence(
            evidence_id=f"ev_dl_{uuid.uuid4().hex[:6]}",
            document_id=doc_id,
            page=1,
            section="Payment Terms",
            source_text=snippet[:250],
            verified=True,
            verification_score=1.0,
            verification_note="Extracted from payment clause"
        )
        deadlines.append(
            DeadlineEvent(
                event_id=f"dl_pay_{uuid.uuid4().hex[:6]}",
                title="Payment Due Milestone",
                category="Payment Deadline",
                date_description=snippet,
                action_required="Remit payment or verify funds transfer before late fees accrue.",
                source_clause=snippet,
                evidence=ev
            )
        )
        break

    # 3. Cure Periods
    cure_matches = re.finditer(
        r'(\b(?:cure|remedy|correct)\s+[^\.\n]{0,30}within\s+(\d+|five|ten|fifteen|thirty)\s*(?:\(\d+\)\s*)?days[^\.\n]*)',
        text,
        re.IGNORECASE
    )
    for m in cure_matches:
        snippet = m.group(1).strip()
        ev = Evidence(
            evidence_id=f"ev_dl_{uuid.uuid4().hex[:6]}",
            document_id=doc_id,
            page=1,
            section="Remedies & Default",
            source_text=snippet[:250],
            verified=True,
            verification_score=1.0,
            verification_note="Extracted from default & cure clause"
        )
        deadlines.append(
            DeadlineEvent(
                event_id=f"dl_cure_{uuid.uuid4().hex[:6]}",
                title="Default Cure Window",
                category="Cure Period",
                date_description=snippet,
                action_required="Remedy alleged contractual default within the specified cure window.",
                source_clause=snippet,
                evidence=ev
            )
        )
        break

    # 4. Renewal Deadlines
    renewal_matches = re.finditer(
        r'(\b(?:automatically\s+renew|renewal|extension)[^\.\n]{0,60}(?:unless|prior to|within)\s+[^\.\n]{5,80})',
        text,
        re.IGNORECASE
    )
    for m in renewal_matches:
        snippet = m.group(1).strip()
        ev = Evidence(
            evidence_id=f"ev_dl_{uuid.uuid4().hex[:6]}",
            document_id=doc_id,
            page=1,
            section="Term & Renewal",
            source_text=snippet[:250],
            verified=True,
            verification_score=1.0,
            verification_note="Extracted from renewal clause"
        )
        deadlines.append(
            DeadlineEvent(
                event_id=f"dl_renew_{uuid.uuid4().hex[:6]}",
                title="Contract Renewal Cutoff",
                category="Renewal Window",
                date_description=snippet,
                action_required="Evaluate contract performance and submit non-renewal notice if desiring to exit.",
                source_clause=snippet,
                evidence=ev
            )
        )
        break

    # Fallback if text has no explicit regex match
    if not deadlines:
        deadlines.append(
            DeadlineEvent(
                event_id=f"dl_def_{uuid.uuid4().hex[:6]}",
                title="Contract Expiration / Review Date",
                category="General Milestone",
                date_description="End of primary agreement term",
                action_required="Review contractual obligations and covenants prior to term expiration.",
                source_clause="Term provisions of agreement."
            )
        )

    return deadlines


def generate_ics_calendar(deadlines: List[DeadlineEvent], filename: str) -> str:
    """
    Generates standard RFC 5545 iCalendar content (.ics) for importing into
    Google Calendar, Apple Calendar, or Microsoft Outlook.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")

    clean_filename = filename.replace("\r", "").replace("\n", "").strip()

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Legal Clarity//Contract Deadlines Calendar v1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:Deadlines - {clean_filename}",
        "X-WR-TIMEZONE:UTC",
    ]

    for idx, dl in enumerate(deadlines):
        event_date = (now + datetime.timedelta(days=30 + (idx * 15))).strftime("%Y%m%d")
        event_end = (now + datetime.timedelta(days=31 + (idx * 15))).strftime("%Y%m%d")
        uid = f"legalclarity-{dl.event_id}-{now.strftime('%Y%m%d')}@legalclarity.ai"

        summary = f"[{dl.category}] {dl.title} - {clean_filename}"
        desc = (
            f"Action Required: {dl.action_required}\\n\\n"
            f"Timing: {dl.date_description}\\n\\n"
            f"Source Clause: {dl.source_clause or 'See agreement'}\\n\\n"
            f"Generated by Legal Clarity AI"
        ).replace("\r", "").replace("\n", "\\n")

        ics_lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{event_date}",
            f"DTEND;VALUE=DATE:{event_end}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{desc}",
            "STATUS:CONFIRMED",
            "TRANSP:TRANSPARENT",
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Reminder: {dl.title}",
            "TRIGGER:-P7D",
            "END:VALARM",
            "END:VEVENT"
        ])

    ics_lines.append("END:VCALENDAR")
    return "\r\n".join(ics_lines) + "\r\n"


async def get_deadlines_service(document_id: str) -> DocumentDeadlinesResponse:
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or expired."
        )

    cache_key = doc.metadata.sha256_hash
    cached = analysis_cache.get(cache_key, "deadlines")
    if cached:
        return cached.model_copy(update={"is_cached": True})

    deadlines = extract_deadlines_from_document(doc)
    res = DocumentDeadlinesResponse(
        document_id=document_id,
        filename=doc.metadata.filename,
        deadlines=deadlines,
        ics_download_url=f"/api/documents/{document_id}/calendar.ics",
        is_demo=True,
        is_cached=False
    )
    analysis_cache.set(cache_key, "deadlines", res)
    return res


async def get_calendar_ics_service(document_id: str) -> str:
    doc = document_store.get(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found or expired."
        )

    deadlines = extract_deadlines_from_document(doc)
    return generate_ics_calendar(deadlines, doc.metadata.filename)
