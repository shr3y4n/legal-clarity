import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ReviewPanel } from '../components/panels/ReviewPanel';
import { DocumentReviewResponse } from '../types/document';

const mockReviewData: DocumentReviewResponse = {
  document_id: 'doc_rev_test',
  review_items: [
    {
      item_id: 'item_1',
      title: 'Limitation of Liability',
      level: 'IMPORTANT TO REVIEW',
      plain_explanation: 'Total liability is capped at $500.',
      why_highlighted: 'This was highlighted because it limits financial recovery.',
      evidence: {
        evidence_id: 'ev_1',
        document_id: 'doc_rev_test',
        page: 1,
        section: 'Section 4.0',
        clause_number: '4.1',
        source_text: 'Provider aggregate liability shall not exceed $500.',
        verified: true,
        verification_score: 1.0,
      },
      suggested_lawyer_question: 'Is this $500 liability cap standard?',
      options_and_next_steps: [
        {
          option_type: 'Accept As-Is',
          description: 'Accept the clause without modifications.',
          action_step: 'Proceed with signing.',
        },
        {
          option_type: 'Request Redline / Counter-Proposal',
          description: 'Request higher liability cap.',
          proposed_counter_language: 'In no event shall either party liability exceed 12 months fees.',
          action_step: 'Send counter-proposal to vendor.',
        },
        {
          option_type: 'Escalate to Legal Counsel',
          description: 'Consult attorney.',
          action_step: 'Ask lawyer about state statutory caps.',
        },
      ],
    },
  ],
  inconsistencies: [
    {
      inconsistency_id: 'inc_1',
      title: 'Liability Limitation vs. Indemnification Ambiguity',
      description: 'Limitation of Liability sets a $500 cap while Indemnification is uncapped.',
      clause_a_title: 'Limitation of Liability',
      clause_a_evidence: {
        evidence_id: 'ev_inc_a',
        document_id: 'doc_rev_test',
        page: 1,
        section: 'Section 4.0',
        source_text: 'Liability shall not exceed $500.',
        verified: true,
        verification_score: 1.0,
      },
      clause_b_title: 'Indemnification',
      clause_b_evidence: {
        evidence_id: 'ev_inc_b',
        document_id: 'doc_rev_test',
        page: 2,
        section: 'Section 7.0',
        source_text: 'Provider agrees to indemnify customer for all damages without limit.',
        verified: true,
        verification_score: 1.0,
      },
      suggested_remedy: 'Clarify whether indemnification is subject to the $500 liability cap.',
    },
  ],
  total_clauses_reviewed: 1,
  routine_count: 0,
  review_count: 0,
  important_count: 1,
  inconsistency_count: 1,
  is_demo: true,
};

describe('ReviewPanel Component', () => {
  it('renders review items with badges, evidence, and options & redlines', () => {
    const handleSelectEvidence = vi.fn();
    render(
      <ReviewPanel
        reviewData={mockReviewData}
        isLoading={false}
        onSelectEvidence={handleSelectEvidence}
      />
    );

    expect(screen.getByText('Limitation of Liability')).not.toBeNull();
    expect(screen.getByText('IMPORTANT TO REVIEW')).not.toBeNull();
    expect(screen.getByText(/Total liability is capped at \$500/i)).not.toBeNull();

    // Verify Options & Next Steps
    expect(screen.getByText(/Your Strategic Options & Potential Next Steps/i)).not.toBeNull();
    expect(screen.getByText(/Option 2: Request Redline \/ Counter-Proposal/i)).not.toBeNull();
    expect(screen.getByText(/Copy Proposed Redline/i)).not.toBeNull();

    // Click View Source
    fireEvent.click(screen.getByRole('button', { name: /view excerpt on page 1/i }));
    expect(handleSelectEvidence).toHaveBeenCalledTimes(1);
  });

  it('renders inconsistencies tab and displays side-by-side conflicting clauses', () => {
    render(
      <ReviewPanel
        reviewData={mockReviewData}
        isLoading={false}
        onSelectEvidence={vi.fn()}
      />
    );

    const incTab = screen.getByText(/Inconsistencies \(1\)/i);
    expect(incTab).not.toBeNull();
    fireEvent.click(incTab);

    // Verify inconsistency card
    expect(screen.getByText('Liability Limitation vs. Indemnification Ambiguity')).not.toBeNull();
    expect(screen.getByText(/Clause A: Limitation of Liability/i)).not.toBeNull();
    expect(screen.getByText(/Clause B: Indemnification/i)).not.toBeNull();
    expect(screen.getByText(/Suggested Harmonization Remedy/i)).not.toBeNull();
    expect(screen.getByText(/Copy Remedy/i)).not.toBeNull();
  });
});
