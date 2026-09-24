export type ReviewLevel = 'ROUTINE' | 'REVIEW' | 'IMPORTANT TO REVIEW';
export type ChangeClassification = 'material' | 'potentially important' | 'non-material';

export interface Evidence {
  evidence_id: string;
  document_id: string;
  page: number;
  section?: string | null;
  clause_number?: string | null;
  source_text: string;
  verified: boolean;
  verification_score: number;
  verification_note?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  start_offset?: number | null;
  end_offset?: number | null;
  bbox?: number[] | null;
  source_type?: string | null;
}

export interface Claim {
  statement: string;
  evidence: Evidence[];
  is_supported: boolean;
}

export interface Section {
  section_id: string;
  page_number: number;
  heading?: string | null;
  clause_number?: string | null;
  text: string;
  start_char: number;
  end_char: number;
  page_start?: number | null;
  page_end?: number | null;
  bbox?: number[] | null;
  source_type?: string | null;
}

export interface Page {
  page_number: number;
  text: string;
  sections: Section[];
}

export interface DocumentMetadata {
  document_id: string;
  filename: string;
  sha256_hash: string;
  mime_type: string;
  byte_size: number;
  page_count: number;
  created_at: string;
}

export interface Document {
  metadata: DocumentMetadata;
  pages: Page[];
  full_text: string;
}

export interface ClauseOption {
  option_type: string;
  description: string;
  proposed_counter_language?: string | null;
  action_step: string;
}

export interface InconsistencyItem {
  inconsistency_id: string;
  title: string;
  description: string;
  clause_a_title: string;
  clause_a_evidence: Evidence;
  clause_b_title: string;
  clause_b_evidence: Evidence;
  suggested_remedy: string;
}

export interface ReviewItem {
  item_id: string;
  title: string;
  level: ReviewLevel;
  plain_explanation: string;
  why_highlighted: string;
  evidence: Evidence;
  suggested_lawyer_question: string;
  options_and_next_steps?: ClauseOption[];
}

export interface DocumentReviewResponse {
  document_id: string;
  review_items: ReviewItem[];
  inconsistencies?: InconsistencyItem[];
  total_clauses_reviewed: number;
  routine_count: number;
  review_count: number;
  important_count: number;
  inconsistency_count?: number;
  is_demo: boolean;
}

export interface DocumentUnderstanding {
  document_id: string;
  document_type: string;
  parties: string[];
  dates: string[];
  duration_term?: string | null;
  major_obligations: Claim[];
  payment_terms: Claim[];
  termination_terms: Claim[];
  renewal_terms: Claim[];
  notice_requirements: Claim[];
  unusual_obligations: Claim[];
  concise_summary: string;
  is_demo: boolean;
}

export interface Answer {
  answer_text: string;
  is_supported: boolean;
  evidence: Evidence[];
  citations?: Evidence[];
  grounded?: boolean;
  refusal_reason?: string | null;
  is_demo: boolean;
}

export interface ComparisonChange {
  change_id: string;
  category: string;
  classification: ChangeClassification;
  old_evidence?: Evidence | null;
  new_evidence?: Evidence | null;
  plain_meaning_explanation: string;
}

export interface Comparison {
  doc_a_id: string;
  doc_b_id: string;
  doc_a_name: string;
  doc_b_name: string;
  summary_of_differences: string;
  changes: ComparisonChange[];
  material_count: number;
  potentially_important_count: number;
  non_material_count: number;
  is_demo: boolean;
}

export interface ChecklistItem {
  item_id: string;
  action_title: string;
  category: string;
  plain_instruction: string;
  evidence: Evidence;
  is_completed: boolean;
}

export interface DocumentChecklist {
  document_id: string;
  items: ChecklistItem[];
  is_demo: boolean;
}

export interface LawyerQuestion {
  question_id: string;
  topic: string;
  recommended_question: string;
  source_clause: string;
  context_rationale: string;
  evidence: Evidence;
}

export interface LawyerPrepResponse {
  document_id: string;
  questions: LawyerQuestion[];
  legal_safety_disclaimer: string;
  is_demo: boolean;
}

export interface DeadlineEvent {
  event_id: string;
  title: string;
  category: string;
  date_description: string;
  action_required: string;
  source_clause?: string | null;
  suggested_date?: string | null;
  evidence?: Evidence | null;
}

export interface DocumentDeadlinesResponse {
  document_id: string;
  filename: string;
  deadlines: DeadlineEvent[];
  ics_download_url: string;
  is_demo: boolean;
  is_cached: boolean;
}

export type ActiveTab = 'understand' | 'review' | 'ask' | 'compare' | 'checklist' | 'lawyer-prep';

