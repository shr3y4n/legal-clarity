from abc import ABC, abstractmethod
from typing import List

from app.models.schemas import (
    Answer,
    Chunk,
    Comparison,
    Document,
    DocumentChecklist,
    DocumentReviewResponse,
    DocumentUnderstanding,
    LawyerPrepResponse,
)


class LLMProvider(ABC):
    """
    Abstract interface for evidence-grounded legal document analysis engines.

    Contractual Invariants:
    -----------------------
    1. Schema Conformity: All implementations must return strictly validated Pydantic models.
       Ad-hoc untyped dictionaries or loose JSON strings are forbidden.
    2. Evidence Anchoring: Any claim, finding, or answer MUST be linked to an `Evidence`
       object referencing the exact source page, section heading, and text excerpt.
    3. Non-Hallucination: When source evidence is absent or insufficient, providers must
       explicitly flag `is_supported=False` and supply a structured `refusal_reason`.
    4. Token Accounting: Implementations should calculate or estimate `TokenUsage`
       highlighting input/output consumption and BM25 retrieval efficiency savings.
    """

    @abstractmethod
    async def understand(self, document: Document) -> DocumentUnderstanding:
        """Extracts structured document metadata, party entities, critical dates, and key obligations."""
        pass

    @abstractmethod
    async def review(self, document: Document) -> DocumentReviewResponse:
        """Audits document provisions, classifying them by review urgency (Routine, Review, Important to Review)."""
        pass

    @abstractmethod
    async def ask(self, document: Document, question: str, relevant_chunks: List[Chunk]) -> Answer:
        """Answers factual questions using retrieved document chunks, enforcing citation containment."""
        pass

    @abstractmethod
    async def compare(self, doc_a: Document, doc_b: Document) -> Comparison:
        """Performs semantic diffing between two documents, isolating material risk changes from non-material styling."""
        pass

    @abstractmethod
    async def checklist(self, document: Document) -> DocumentChecklist:
        """Generates an actionable, evidence-linked verification checklist for pre-signing review."""
        pass

    @abstractmethod
    async def lawyer_prep(self, document: Document) -> LawyerPrepResponse:
        """Synthesizes high-impact discussion questions for counsel, bounded by legal safety disclaimers."""
        pass

