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
    Abstract interface for AI document companion operations.
    All providers must return validated Pydantic schemas.
    """

    @abstractmethod
    async def understand(self, document: Document) -> DocumentUnderstanding:
        pass

    @abstractmethod
    async def review(self, document: Document) -> DocumentReviewResponse:
        pass

    @abstractmethod
    async def ask(self, document: Document, question: str, relevant_chunks: List[Chunk]) -> Answer:
        pass

    @abstractmethod
    async def compare(self, doc_a: Document, doc_b: Document) -> Comparison:
        pass

    @abstractmethod
    async def checklist(self, document: Document) -> DocumentChecklist:
        pass

    @abstractmethod
    async def lawyer_prep(self, document: Document) -> LawyerPrepResponse:
        pass
