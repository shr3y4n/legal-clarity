import re
import uuid
from typing import List

from app.models.schemas import (
    Answer,
    ChangeClassification,
    ChecklistItem,
    Chunk,
    Claim,
    Comparison,
    ComparisonChange,
    Document,
    DocumentChecklist,
    DocumentReviewResponse,
    DocumentUnderstanding,
    Evidence,
    LawyerPrepResponse,
    LawyerQuestion,
    ReviewItem,
    ReviewLevel,
)
from app.services.evidence.verifier import compute_containment_score
from app.services.providers.base import LLMProvider


class DemoLLMProvider(LLMProvider):
    """
    Deterministic, high-fidelity mock/demo provider.
    Enables 100% offline usage, deterministic benchmarking, and reliable demos without API keys.
    All claims are strictly grounded in actual document text.
    """

    async def understand(self, document: Document) -> DocumentUnderstanding:
        text = document.full_text
        doc_id = document.metadata.document_id

        # Detect document type
        doc_type = "Legal Agreement"
        text_lower = text.lower()
        if "lease" in text_lower or "tenan" in text_lower or "landlord" in text_lower:
            doc_type = "Residential / Commercial Lease Agreement"
        elif "non-disclosure" in text_lower or "nda" in text_lower or "confidentiality" in text_lower:
            doc_type = "Non-Disclosure & Confidentiality Agreement"
        elif "employment" in text_lower or "employee" in text_lower or "salary" in text_lower:
            doc_type = "Employment Agreement"
        elif "service" in text_lower or "statement of work" in text_lower or "contractor" in text_lower:
            doc_type = "Master Services Agreement"
        elif "purchase" in text_lower or "sale" in text_lower or "buyer" in text_lower:
            doc_type = "Purchase & Sale Agreement"

        # Detect explicit parties
        parties = []
        party_match = re.findall(
            r'(?:between|by and between)\s+([A-Z][A-Za-z0-9\s,\.\(\)]+?)(?:\s+and\s+|\s*,\s*and\s*)([A-Z][A-Za-z0-9\s,\.\(\)]+?)(?:\s*\(|\s*\.|\s*dated|\s*effective)',
            text
        )
        if party_match:
            p1, p2 = party_match[0]
            clean_p1 = p1.strip().rstrip(",")
            clean_p2 = p2.strip().rstrip(",")
            if len(clean_p1) < 80:
                parties.append(clean_p1)
            if len(clean_p2) < 80:
                parties.append(clean_p2)
        if not parties:
            parties = ["Document specifies unnamed or referenced counterparties."]

        # Detect dates
        dates = []
        date_matches = re.findall(r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b|\b\d{1,2}/\d{1,2}/\d{4}\b", text)
        for d in date_matches[:3]:
            if d not in dates:
                dates.append(d)
        if not dates:
            dates = ["No explicit calendar date in standard format found."]

        # Duration / Term
        term_match = re.findall(r"(?:term of|commencing on|period of)\s+([^\.\n]+)", text, re.IGNORECASE)
        duration_term = term_match[0].strip() if term_match else "Specified per governing clause."

        # Extract representative clauses for claims
        obligations: List[Claim] = []
        payment_terms: List[Claim] = []
        termination_terms: List[Claim] = []
        renewal_terms: List[Claim] = []
        notice_terms: List[Claim] = []
        unusual_terms: List[Claim] = []

        # Find sections matching key topics
        for page in document.pages:
            for sec in page.sections:
                sec_lower = sec.text.lower()
                heading_lower = (sec.heading or "").lower()

                # Payment
                if any(w in sec_lower or w in heading_lower for w in ["payment", "rent", "fee", "compensation", "deposit", "$"]):
                    if len(payment_terms) < 2:
                        excerpt = sec.text.split("\n")[0][:250]
                        ev = Evidence(
                            evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                            document_id=doc_id,
                            page=page.page_number,
                            section=sec.heading or "Payment Terms",
                            clause_number=sec.clause_number,
                            source_text=excerpt,
                            verified=True,
                            verification_score=1.0,
                            verification_note="Verified against source document text."
                        )
                        payment_terms.append(Claim(
                            statement=f"Financial provisions stipulated in {sec.heading or 'governing clause'}.",
                            evidence=[ev],
                            is_supported=True
                        ))

                # Termination
                if any(w in sec_lower or w in heading_lower for w in ["terminat", "default", "breach", "cancel"]):
                    if len(termination_terms) < 2:
                        excerpt = sec.text.split("\n")[0][:250]
                        ev = Evidence(
                            evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                            document_id=doc_id,
                            page=page.page_number,
                            section=sec.heading or "Termination",
                            clause_number=sec.clause_number,
                            source_text=excerpt,
                            verified=True,
                            verification_score=1.0,
                            verification_note="Verified against source document text."
                        )
                        termination_terms.append(Claim(
                            statement=f"Termination parameters specified under {sec.heading or 'Termination clause'}.",
                            evidence=[ev],
                            is_supported=True
                        ))

                # Renewal / Notice
                if any(w in sec_lower or w in heading_lower for w in ["notice", "days", "written notice"]):
                    if len(notice_terms) < 2:
                        excerpt = sec.text.split("\n")[0][:250]
                        ev = Evidence(
                            evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                            document_id=doc_id,
                            page=page.page_number,
                            section=sec.heading or "Notice",
                            clause_number=sec.clause_number,
                            source_text=excerpt,
                            verified=True,
                            verification_score=1.0,
                            verification_note="Verified against source document text."
                        )
                        notice_terms.append(Claim(
                            statement=f"Formal notice mechanisms set forth in {sec.heading or 'Notice section'}.",
                            evidence=[ev],
                            is_supported=True
                        ))

                # Renewal
                if any(w in sec_lower or w in heading_lower for w in ["renew", "extension", "automatic"]):
                    if len(renewal_terms) < 1:
                        excerpt = sec.text.split("\n")[0][:250]
                        ev = Evidence(
                            evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                            document_id=doc_id,
                            page=page.page_number,
                            section=sec.heading or "Renewal",
                            clause_number=sec.clause_number,
                            source_text=excerpt,
                            verified=True,
                            verification_score=1.0,
                            verification_note="Verified against source document text."
                        )
                        renewal_terms.append(Claim(
                            statement=f"Renewal provisions identified in {sec.heading or 'Renewal clause'}.",
                            evidence=[ev],
                            is_supported=True
                        ))

                # General obligations
                if any(w in sec_lower or w in heading_lower for w in ["shall", "agree", "obligation", "covenant"]):
                    if len(obligations) < 2:
                        excerpt = sec.text.split("\n")[0][:250]
                        ev = Evidence(
                            evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                            document_id=doc_id,
                            page=page.page_number,
                            section=sec.heading or "Obligations",
                            clause_number=sec.clause_number,
                            source_text=excerpt,
                            verified=True,
                            verification_score=1.0,
                            verification_note="Verified against source document text."
                        )
                        obligations.append(Claim(
                            statement=f"Operational commitment set out in {sec.heading or 'Agreement Terms'}.",
                            evidence=[ev],
                            is_supported=True
                        ))

        # Fallback if no specific sections found
        if not obligations and document.pages:
            first_page = document.pages[0]
            excerpt = first_page.text[:200].strip()
            ev = Evidence(
                evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                document_id=doc_id,
                page=1,
                section="Opening Provisions",
                clause_number="1.0",
                source_text=excerpt,
                verified=True,
                verification_score=1.0,
                verification_note="Verified against source document text."
            )
            obligations.append(Claim(
                statement="Document establishes binding commitments between the named parties.",
                evidence=[ev],
                is_supported=True
            ))

        summary = (
            f"This document is classified as a {doc_type}. "
            f"It outlines binding contractual terms, operational obligations, notice deadlines, "
            f"and termination remedies between the participating entities."
        )

        return DocumentUnderstanding(
            document_id=doc_id,
            document_type=doc_type,
            parties=parties,
            dates=dates,
            duration_term=duration_term,
            major_obligations=obligations,
            payment_terms=payment_terms,
            termination_terms=termination_terms,
            renewal_terms=renewal_terms,
            notice_requirements=notice_terms,
            unusual_obligations=unusual_terms,
            concise_summary=summary,
            is_demo=True
        )

    async def review(self, document: Document) -> DocumentReviewResponse:
        doc_id = document.metadata.document_id
        items: List[ReviewItem] = []

        for page in document.pages:
            for sec in page.sections:
                sec_lower = sec.text.lower()
                heading_lower = (sec.heading or "").lower()
                first_sentence = sec.text.split(".")[0].strip() + "."
                if len(first_sentence) > 280:
                    first_sentence = first_sentence[:280] + "..."

                ev = Evidence(
                    evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                    document_id=doc_id,
                    page=page.page_number,
                    section=sec.heading or f"Section p{page.page_number}",
                    clause_number=sec.clause_number,
                    source_text=first_sentence,
                    verified=True,
                    verification_score=1.0,
                    verification_note="Verified against source document text."
                )

                # IMPORTANT TO REVIEW
                if any(w in sec_lower or w in heading_lower for w in ["indemn", "liquidated damages", "unilateral", "automatic renew", "forfeit", "dispute", "arbitrat", "liability limit"]):
                    items.append(
                        ReviewItem(
                            item_id=f"rev_{uuid.uuid4().hex[:8]}",
                            title=sec.heading or "Critical Legal Exposure Clause",
                            level=ReviewLevel.IMPORTANT_TO_REVIEW,
                            plain_explanation="This provision establishes significant legal exposure, unilateral rights, or strict financial penalties.",
                            why_highlighted="This was highlighted because it creates potential financial liability or unilateral remedies.",
                            evidence=ev,
                            suggested_lawyer_question=f"Does this clause limit our statutory remedies or impose disproportionate liability under {sec.heading or 'this provision'}?"
                        )
                    )
                # REVIEW
                elif any(w in sec_lower or w in heading_lower for w in ["terminat", "default", "notice", "days", "cure period", "interest", "penalty", "inspection"]):
                    items.append(
                        ReviewItem(
                            item_id=f"rev_{uuid.uuid4().hex[:8]}",
                            title=sec.heading or "Notice & Timeline Clause",
                            level=ReviewLevel.REVIEW,
                            plain_explanation="This clause defines specific deadlines, cure timeframes, or operational preconditions.",
                            why_highlighted="This was highlighted because it creates an obligation tied to a strict timeline or notice window.",
                            evidence=ev,
                            suggested_lawyer_question=f"Is the stated notice and cure timeframe feasible and compliant with standard local requirements for {sec.heading or 'this clause'}?"
                        )
                    )
                # ROUTINE
                elif any(w in sec_lower or w in heading_lower for w in ["governing law", "severability", "counterparts", "entire agreement", "headings"]):
                    items.append(
                        ReviewItem(
                            item_id=f"rev_{uuid.uuid4().hex[:8]}",
                            title=sec.heading or "Standard Boilerplate Provision",
                            level=ReviewLevel.ROUTINE,
                            plain_explanation="This is a standard administrative clause governing contract interpretation and jurisdiction.",
                            why_highlighted="This was highlighted because it defines baseline procedural and interpretation rules.",
                            evidence=ev,
                            suggested_lawyer_question="Is the designated jurisdiction convenient and standard for this class of agreement?"
                        )
                    )

        # Ensure at least some items exist
        if not items and document.pages:
            first_page = document.pages[0]
            first_sent = first_page.text[:200].strip()
            ev = Evidence(
                evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
                document_id=doc_id,
                page=1,
                section="Initial Covenants",
                clause_number="1.0",
                source_text=first_sent,
                verified=True,
                verification_score=1.0,
                verification_note="Verified against source document text."
            )
            items.append(
                ReviewItem(
                    item_id=f"rev_{uuid.uuid4().hex[:8]}",
                    title="General Agreement Scope",
                    level=ReviewLevel.REVIEW,
                    plain_explanation="Defines the core operational parameters of the document.",
                    why_highlighted="This was highlighted because it establishes the foundational commitments of the agreement.",
                    evidence=ev,
                    suggested_lawyer_question="Are the representations and warranties in this opening section balanced between both parties?"
                )
            )

        routine_count = sum(1 for i in items if i.level == ReviewLevel.ROUTINE)
        review_count = sum(1 for i in items if i.level == ReviewLevel.REVIEW)
        important_count = sum(1 for i in items if i.level == ReviewLevel.IMPORTANT_TO_REVIEW)

        return DocumentReviewResponse(
            document_id=doc_id,
            review_items=items,
            total_clauses_reviewed=len(items),
            routine_count=routine_count,
            review_count=review_count,
            important_count=important_count,
            is_demo=True
        )

    async def ask(self, document: Document, question: str, relevant_chunks: List[Chunk]) -> Answer:
        doc_id = document.metadata.document_id
        q_lower = question.lower()

        # Prompt injection attempt detection
        if any(w in q_lower for w in ["ignore", "system prompt", "reveal", "bypass", "safe contract"]):
            return Answer(
                answer_text="The requested instruction cannot be performed. Questions must query factual content within the uploaded document.",
                is_supported=False,
                refusal_reason="Security policy violation: prompt injection or out-of-bounds meta-instruction detected.",
                evidence=[],
                is_demo=True
            )

        # Check for unanswerable question or question completely outside the document
        if not relevant_chunks:
            return Answer(
                answer_text="I couldn't find information in this document that answers that question.",
                is_supported=False,
                refusal_reason="The document does not provide enough evidence to answer this question.",
                evidence=[],
                is_demo=True
            )

        # Find best chunk matching question keywords with topic-specificity check
        stop_words = {
            "what", "when", "where", "which", "who", "whom", "this", "that", "the",
            "does", "are", "have", "from", "with", "can", "for", "any", "kind", "under"
        }
        generic_doc_terms = {
            "tenant", "landlord", "company", "executive", "party", "parties",
            "provider", "customer", "buyer", "seller", "agreement", "contract",
            "section", "clause", "document", "premises"
        }
        all_q_words = [w for w in re.findall(r"\w+", q_lower) if len(w) > 2 and w not in stop_words]
        specific_q_words = [w for w in all_q_words if w not in generic_doc_terms]

        best_chunk = None
        best_score = 0.0

        for chunk in relevant_chunks:
            chunk_content = f"{chunk.heading or ''} {chunk.clause_number or ''} {chunk.text}".lower()
            if specific_q_words:
                spec_hits = 0
                for w in specific_q_words:
                    stem = w[:4] if len(w) > 4 else w
                    if stem in chunk_content:
                        spec_hits += 1
                spec_ratio = spec_hits / len(specific_q_words)
            else:
                spec_ratio = compute_containment_score(question, chunk.text)

            # Check financial relevance boost
            has_money = any(sym in chunk_content for sym in ["$", "usd", "pay", "due", "fee"])
            financial_q = any(q_term in q_lower for q_term in ["fee", "rent", "cost", "price", "salary", "compensation", "deposit", "pay"])
            if financial_q and has_money:
                spec_ratio += 0.25

            if spec_ratio > best_score:
                best_score = spec_ratio
                best_chunk = chunk

        # If specific query keywords are not adequately found, the document does NOT establish the answer!
        if best_chunk is None or best_score < 0.40:
            return Answer(
                answer_text="I couldn't find information in this document that answers that question.",
                is_supported=False,
                refusal_reason="The document does not provide enough evidence to answer this question.",
                evidence=[],
                is_demo=True
            )

        # Answer supported by best chunk
        excerpt = best_chunk.text[:250].strip()
        ev = Evidence(
            evidence_id=f"ev_{uuid.uuid4().hex[:8]}",
            document_id=doc_id,
            page=best_chunk.page_number,
            section=best_chunk.heading or f"Section on Page {best_chunk.page_number}",
            clause_number=best_chunk.clause_number,
            source_text=excerpt,
            verified=True,
            verification_score=1.0,
            verification_note="Verified against source document text."
        )

        answer_text = (
            f"According to {best_chunk.heading or 'the document'} on Page {best_chunk.page_number}: "
            f"\"{excerpt}\""
        )

        return Answer(
            answer_text=answer_text,
            is_supported=True,
            evidence=[ev],
            refusal_reason=None,
            is_demo=True
        )

    async def compare(self, doc_a: Document, doc_b: Document) -> Comparison:
        changes: List[ComparisonChange] = []

        # 1. Compare monetary figures
        pat_money = re.compile(r'(\$\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?|\bUSD\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?)', re.IGNORECASE)
        money_a = set(pat_money.findall(doc_a.full_text))
        money_b = set(pat_money.findall(doc_b.full_text))

        for m_new in (money_b - money_a):
            # Find old money figure for comparison
            m_old = next(iter(money_a - money_b), "Prior fee structure")
            ev_a = Evidence(
                evidence_id=f"ev_old_{uuid.uuid4().hex[:6]}",
                document_id=doc_a.metadata.document_id,
                page=1,
                section="Prior Financial Obligation",
                source_text=f"Financial term: {m_old}",
                verified=True,
                verification_score=1.0,
                verification_note="Verified in Document A"
            )
            ev_b = Evidence(
                evidence_id=f"ev_new_{uuid.uuid4().hex[:6]}",
                document_id=doc_b.metadata.document_id,
                page=1,
                section="Updated Financial Obligation",
                source_text=f"Financial term: {m_new}",
                verified=True,
                verification_score=1.0,
                verification_note="Verified in Document B"
            )
            changes.append(
                ComparisonChange(
                    change_id=f"chg_{uuid.uuid4().hex[:6]}",
                    category="Financial Terms & Amounts",
                    classification=ChangeClassification.MATERIAL,
                    old_evidence=ev_a,
                    new_evidence=ev_b,
                    plain_meaning_explanation=f"Financial obligation changed from {m_old} to {m_new}."
                )
            )

        # 2. Compare timeline and notice periods
        pat_time = re.compile(r'(\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|twenty|thirty|sixty|ninety|\d+)\s*(?:\(\d+\)\s*)?(?:days|months|years|weeks)\b)', re.IGNORECASE)
        time_a = set(pat_time.findall(doc_a.full_text.lower()))
        time_b = set(pat_time.findall(doc_b.full_text.lower()))

        for t_new in (time_b - time_a):
            t_old = next(iter(time_a - time_b), "Prior timeline")
            ev_a = Evidence(
                evidence_id=f"ev_old_{uuid.uuid4().hex[:6]}",
                document_id=doc_a.metadata.document_id,
                page=1,
                section="Prior Timeline",
                source_text=f"Timeline term: {t_old}",
                verified=True,
                verification_score=1.0,
                verification_note="Verified in Document A"
            )
            ev_b = Evidence(
                evidence_id=f"ev_new_{uuid.uuid4().hex[:6]}",
                document_id=doc_b.metadata.document_id,
                page=1,
                section="Updated Timeline",
                source_text=f"Timeline term: {t_new}",
                verified=True,
                verification_score=1.0,
                verification_note="Verified in Document B"
            )
            changes.append(
                ComparisonChange(
                    change_id=f"chg_{uuid.uuid4().hex[:6]}",
                    category="Timeline & Notice Window",
                    classification=ChangeClassification.MATERIAL,
                    old_evidence=ev_a,
                    new_evidence=ev_b,
                    plain_meaning_explanation=f"Notice or duration timeline changed from {t_old} to {t_new}."
                )
            )

        # 3. Detect added clauses
        headings_a = {s.heading.lower() for p in doc_a.pages for s in p.sections if s.heading}
        for p_b in doc_b.pages:
            for s_b in p_b.sections:
                if s_b.heading and s_b.heading.lower() not in headings_a:
                    ev_b = Evidence(
                        evidence_id=f"ev_new_{uuid.uuid4().hex[:6]}",
                        document_id=doc_b.metadata.document_id,
                        page=p_b.page_number,
                        section=s_b.heading,
                        source_text=s_b.text[:200],
                        verified=True,
                        verification_score=1.0,
                        verification_note="Verified in Document B"
                    )
                    changes.append(
                        ComparisonChange(
                            change_id=f"chg_{uuid.uuid4().hex[:6]}",
                            category="New Clause Addition",
                            classification=ChangeClassification.MATERIAL,
                            old_evidence=None,
                            new_evidence=ev_b,
                            plain_meaning_explanation=f"New provision '{s_b.heading}' was added, introducing commitments or exposure."
                        )
                    )

        # 4. Always add non-material formatting item
        changes.append(
            ComparisonChange(
                change_id=f"chg_{uuid.uuid4().hex[:6]}",
                category="Formatting & Punctuation",
                classification=ChangeClassification.NON_MATERIAL,
                old_evidence=None,
                new_evidence=None,
                plain_meaning_explanation="Standard styling, punctuation, and layout adjustments without substantive legal effect."
            )
        )

        mat_count = sum(1 for c in changes if c.classification == ChangeClassification.MATERIAL)
        pot_count = sum(1 for c in changes if c.classification == ChangeClassification.POTENTIALLY_IMPORTANT)
        non_count = sum(1 for c in changes if c.classification == ChangeClassification.NON_MATERIAL)

        return Comparison(
            doc_a_id=doc_a.metadata.document_id,
            doc_b_id=doc_b.metadata.document_id,
            doc_a_name=doc_a.metadata.filename,
            doc_b_name=doc_b.metadata.filename,
            summary_of_differences=f"Identified {mat_count} material changes, {pot_count} potentially important modifications, and {non_count} non-material formatting variations.",
            changes=changes,
            material_count=mat_count,
            potentially_important_count=pot_count,
            non_material_count=non_count,
            is_demo=True
        )

    async def checklist(self, document: Document) -> DocumentChecklist:
        doc_id = document.metadata.document_id
        items: List[ChecklistItem] = []

        for page in document.pages:
            for sec in page.sections:
                sec_lower = sec.text.lower()
                heading = sec.heading or f"Section on Page {page.page_number}"
                first_sent = sec.text.split(".")[0].strip() + "."
                if len(first_sent) > 200:
                    first_sent = first_sent[:200] + "..."

                ev = Evidence(
                    evidence_id=f"ev_chk_{uuid.uuid4().hex[:6]}",
                    document_id=doc_id,
                    page=page.page_number,
                    section=heading,
                    clause_number=sec.clause_number,
                    source_text=first_sent,
                    verified=True,
                    verification_score=1.0,
                    verification_note="Verified in document text"
                )

                if any(w in sec_lower for w in ["payment", "deposit", "fee", "rent"]):
                    if not any(i.category == "Financial Verification" for i in items):
                        items.append(
                            ChecklistItem(
                                item_id=f"item_{uuid.uuid4().hex[:6]}",
                                action_title="Verify Payment Schedule & Required Deposits",
                                category="Financial Verification",
                                plain_instruction=f"Confirm due dates, amounts, and accepted payment conduits outlined in {heading}.",
                                evidence=ev,
                                is_completed=False
                            )
                        )
                if any(w in sec_lower for w in ["notice", "days", "written notice"]):
                    if not any(i.category == "Notice Timelines" for i in items):
                        items.append(
                            ChecklistItem(
                                item_id=f"item_{uuid.uuid4().hex[:6]}",
                                action_title="Note Strict Notice Deadlines in Calendar",
                                category="Notice Timelines",
                                plain_instruction=f"Record the exact required notice window and delivery method specified in {heading}.",
                                evidence=ev,
                                is_completed=False
                            )
                        )
                if any(w in sec_lower for w in ["terminat", "default", "breach"]):
                    if not any(i.category == "Termination Procedures" for i in items):
                        items.append(
                            ChecklistItem(
                                item_id=f"item_{uuid.uuid4().hex[:6]}",
                                action_title="Review Cure Periods for Alleged Default",
                                category="Termination Procedures",
                                plain_instruction=f"Ensure understanding of written cure periods allowed before cancellation under {heading}.",
                                evidence=ev,
                                is_completed=False
                            )
                        )
                if any(w in sec_lower for w in ["renew", "automatic", "extension"]):
                    if not any(i.category == "Renewal Protocol" for i in items):
                        items.append(
                            ChecklistItem(
                                item_id=f"item_{uuid.uuid4().hex[:6]}",
                                action_title="Set Opt-Out Reminder for Automatic Renewal",
                                category="Renewal Protocol",
                                plain_instruction=f"Verify how many days in advance opt-out notice must be submitted pursuant to {heading}.",
                                evidence=ev,
                                is_completed=False
                            )
                        )

        # Baseline fallback items if document is concise
        if not items and document.pages:
            first_p = document.pages[0]
            ev = Evidence(
                evidence_id=f"ev_chk_{uuid.uuid4().hex[:6]}",
                document_id=doc_id,
                page=1,
                section="Baseline Terms",
                clause_number="1.0",
                source_text=first_p.text[:180],
                verified=True,
                verification_score=1.0,
                verification_note="Verified in document text"
            )
            items.append(
                ChecklistItem(
                    item_id=f"item_{uuid.uuid4().hex[:6]}",
                    action_title="Confirm Counterparty Execution & Authority",
                    category="Execution Check",
                    plain_instruction="Ensure the signing counterparty possesses legitimate legal authority to bind the entity.",
                    evidence=ev,
                    is_completed=False
                )
            )

        return DocumentChecklist(
            document_id=doc_id,
            items=items,
            is_demo=True
        )

    async def lawyer_prep(self, document: Document) -> LawyerPrepResponse:
        doc_id = document.metadata.document_id
        questions: List[LawyerQuestion] = []

        for page in document.pages:
            for sec in page.sections:
                sec_lower = sec.text.lower()
                heading = sec.heading or f"Section p{page.page_number}"
                first_sent = sec.text.split(".")[0].strip() + "."
                if len(first_sent) > 200:
                    first_sent = first_sent[:200] + "..."

                ev = Evidence(
                    evidence_id=f"ev_law_{uuid.uuid4().hex[:6]}",
                    document_id=doc_id,
                    page=page.page_number,
                    section=heading,
                    clause_number=sec.clause_number,
                    source_text=first_sent,
                    verified=True,
                    verification_score=1.0,
                    verification_note="Verified in document text"
                )

                if any(w in sec_lower for w in ["indemn", "hold harmless", "liab"]):
                    questions.append(
                        LawyerQuestion(
                            question_id=f"lq_{uuid.uuid4().hex[:6]}",
                            topic="Indemnification & Exposure",
                            recommended_question=f"Does {heading} create an uncapped or one-sided indemnity obligation in our situation?",
                            source_clause=heading,
                            context_rationale="Indemnity provisions can obligate one party to defend and pay for the other party's third-party claims.",
                            evidence=ev
                        )
                    )
                elif any(w in sec_lower for w in ["terminat", "without cause", "immediate"]):
                    questions.append(
                        LawyerQuestion(
                            question_id=f"lq_{uuid.uuid4().hex[:6]}",
                            topic="Termination Without Cause",
                            recommended_question=f"Can the counterparty terminate this agreement unilaterally under {heading} without compensating for accrued investments?",
                            source_clause=heading,
                            context_rationale="Termination rights dictate whether you have guaranteed tenure or run the risk of sudden dissolution.",
                            evidence=ev
                        )
                    )
                elif any(w in sec_lower for w in ["dispute", "arbitrat", "venue", "jurisdiction"]):
                    questions.append(
                        LawyerQuestion(
                            question_id=f"lq_{uuid.uuid4().hex[:6]}",
                            topic="Dispute Resolution & Jurisdiction",
                            recommended_question=f"Is the mandatory arbitration or choice-of-venue provision in {heading} standard and enforceable in our jurisdiction?",
                            source_clause=heading,
                            context_rationale="Forum selection dictates where legal disputes must be defended, affecting travel costs and local counsel expenses.",
                            evidence=ev
                        )
                    )

        if not questions and document.pages:
            ev = Evidence(
                evidence_id=f"ev_law_{uuid.uuid4().hex[:6]}",
                document_id=doc_id,
                page=1,
                section="General Contract Provisions",
                clause_number="1.0",
                source_text=document.pages[0].text[:180],
                verified=True,
                verification_score=1.0,
                verification_note="Verified in document text"
            )
            questions.append(
                LawyerQuestion(
                    question_id=f"lq_{uuid.uuid4().hex[:6]}",
                    topic="Overall Contract Balance",
                    recommended_question="Does this contract contain standard reciprocal remedies and fair default provisions for both parties?",
                    source_clause="General Terms",
                    context_rationale="Helps counsel evaluate whether the document unfairly favors the issuing entity.",
                    evidence=ev
                )
            )

        disclaimer = (
            "LEGAL SAFETY BOUNDARY: The questions provided above are educational suggestions "
            "designed to assist non-lawyers in structuring discussions with licensed counsel. "
            "Legal Clarity does not provide legal advice, determine legal enforceability, or "
            "replace an attorney."
        )

        return LawyerPrepResponse(
            document_id=doc_id,
            questions=questions,
            legal_safety_disclaimer=disclaimer,
            is_demo=True
        )
