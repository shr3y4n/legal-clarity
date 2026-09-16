from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ReviewLevel(str, Enum):
    ROUTINE = "ROUTINE"
    REVIEW = "REVIEW"
    IMPORTANT_TO_REVIEW = "IMPORTANT TO REVIEW"


class ChangeClassification(str, Enum):
    MATERIAL = "material"
    POTENTIALLY_IMPORTANT = "potentially important"
    NON_MATERIAL = "non-material"


class Evidence(BaseModel):
    evidence_id: str = Field(description="Unique identifier for the evidence anchor")
    document_id: str = Field(description="Associated document ID")
    page: int = Field(default=1, description="1-indexed page number")
    section: Optional[str] = Field(default=None, description="Section heading or clause title")
    clause_number: Optional[str] = Field(default=None, description="Clause numbering e.g. '8.2'")
    source_text: str = Field(description="Exact excerpt quoted from the source document")
    verified: bool = Field(default=False, description="Whether cited text was strictly verified against the extracted text")
    verification_score: float = Field(default=0.0, description="Confidence score of text containment (0.0 - 1.0)")
    verification_note: Optional[str] = Field(default=None, description="Verification details or failure reason")


class Claim(BaseModel):
    statement: str = Field(description="The factual claim made about the document")
    evidence: List[Evidence] = Field(default_factory=list, description="Grounding evidence for this claim")
    is_supported: bool = Field(default=True, description="Whether this claim is backed by verified evidence")


class Section(BaseModel):
    section_id: str
    page_number: int
    heading: Optional[str] = None
    clause_number: Optional[str] = None
    text: str
    start_char: int
    end_char: int


class Page(BaseModel):
    page_number: int
    text: str
    sections: List[Section] = Field(default_factory=list)


class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    sha256_hash: str
    mime_type: str
    byte_size: int
    page_count: int
    created_at: str


class Document(BaseModel):
    metadata: DocumentMetadata
    pages: List[Page]
    full_text: str


class Chunk(BaseModel):
    chunk_id: str
    document_id: str
    page_number: int
    section_id: Optional[str] = None
    heading: Optional[str] = None
    clause_number: Optional[str] = None
    text: str
    token_count: int


class ReviewItem(BaseModel):
    item_id: str
    title: str
    level: ReviewLevel
    plain_explanation: str
    why_highlighted: str
    evidence: Evidence
    suggested_lawyer_question: str


class TokenUsage(BaseModel):
    prompt_tokens: int = Field(default=0, description="Input tokens processed (actual or retrieved chunk estimate)")
    completion_tokens: int = Field(default=0, description="Output tokens generated")
    total_tokens: int = Field(default=0, description="Total tokens consumed")
    savings_vs_full_document_pct: Optional[float] = Field(
        default=None,
        description="Percentage of tokens saved via targeted BM25 chunk retrieval vs stuffing full document"
    )


class CacheStatsResponse(BaseModel):
    hits: int
    misses: int
    hit_rate_pct: float
    total_cached_items: int


class DocumentReviewResponse(BaseModel):
    document_id: str
    review_items: List[ReviewItem]
    total_clauses_reviewed: int
    routine_count: int
    review_count: int
    important_count: int
    is_demo: bool = False
    is_cached: bool = False
    token_usage: Optional[TokenUsage] = None


class DocumentUnderstanding(BaseModel):
    document_id: str
    document_type: str
    parties: List[str]
    dates: List[str]
    duration_term: Optional[str] = None
    major_obligations: List[Claim]
    payment_terms: List[Claim]
    termination_terms: List[Claim]
    renewal_terms: List[Claim]
    notice_requirements: List[Claim]
    unusual_obligations: List[Claim]
    concise_summary: str
    is_demo: bool = False
    is_cached: bool = False
    token_usage: Optional[TokenUsage] = None


class QuestionRequest(BaseModel):
    question_text: str = Field(min_length=2, max_length=1000)


class Answer(BaseModel):
    answer_text: str
    is_supported: bool
    evidence: List[Evidence] = Field(default_factory=list)
    refusal_reason: Optional[str] = None
    is_demo: bool = False
    is_cached: bool = False
    token_usage: Optional[TokenUsage] = None


class ComparisonChange(BaseModel):
    change_id: str
    category: str
    classification: ChangeClassification
    old_evidence: Optional[Evidence] = None
    new_evidence: Optional[Evidence] = None
    plain_meaning_explanation: str


class Comparison(BaseModel):
    doc_a_id: str
    doc_b_id: str
    doc_a_name: str
    doc_b_name: str
    summary_of_differences: str
    changes: List[ComparisonChange]
    material_count: int
    potentially_important_count: int
    non_material_count: int
    is_demo: bool = False
    is_cached: bool = False
    token_usage: Optional[TokenUsage] = None


class ChecklistItem(BaseModel):
    item_id: str
    action_title: str
    category: str
    plain_instruction: str
    evidence: Evidence
    is_completed: bool = False


class DocumentChecklist(BaseModel):
    document_id: str
    items: List[ChecklistItem]
    is_demo: bool = False
    is_cached: bool = False
    token_usage: Optional[TokenUsage] = None


class LawyerQuestion(BaseModel):
    question_id: str
    topic: str
    recommended_question: str
    source_clause: str
    context_rationale: str
    evidence: Evidence


class LawyerPrepResponse(BaseModel):
    document_id: str
    questions: List[LawyerQuestion]
    legal_safety_disclaimer: str
    is_demo: bool = False
    is_cached: bool = False
    token_usage: Optional[TokenUsage] = None


class ErrorResponse(BaseModel):
    detail: str
    code: str
    request_id: Optional[str] = None


class BenchmarkResult(BaseModel):
    total_cases: int
    passed_cases: int
    grounded_answer_rate: float
    unsupported_answer_rate: float
    correct_refusal_rate: float
    evidence_accuracy: float
    comparison_accuracy: float
    extraction_accuracy: float
    timestamp: str


class DeadlineEvent(BaseModel):
    event_id: str
    title: str
    category: str
    date_description: str
    suggested_date: Optional[str] = None
    source_clause: Optional[str] = None
    action_required: str
    evidence: Optional[Evidence] = None


class DocumentDeadlinesResponse(BaseModel):
    document_id: str
    filename: str
    deadlines: List[DeadlineEvent]
    ics_download_url: str
    is_demo: bool = False
    is_cached: bool = False

