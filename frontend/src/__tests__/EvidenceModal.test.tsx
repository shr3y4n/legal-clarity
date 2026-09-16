import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EvidenceModal } from '../components/EvidenceModal';
import { Evidence } from '../types/document';

const mockEvidence: Evidence = {
  evidence_id: 'ev_001',
  document_id: 'doc_123',
  page: 2,
  section: 'Termination Clause',
  clause_number: '4.2',
  source_text: 'Either party may terminate upon thirty (30) days written notice.',
  verified: true,
  verification_score: 1.0,
  verification_note: 'Strict textual match verified against source page 2.',
};

describe('EvidenceModal Component', () => {
  it('renders nothing when evidence is null', () => {
    const { container } = render(
      <EvidenceModal evidence={null} onClose={vi.fn()} onJumpToPage={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders evidence details and citation attributes when evidence is provided', () => {
    render(
      <EvidenceModal
        evidence={mockEvidence}
        onClose={vi.fn()}
        onJumpToPage={vi.fn()}
      />
    );

    expect(screen.getByText('Grounding Evidence Inspection')).not.toBeNull();
    expect(screen.getByText('Strict Containment Verified (100%)')).not.toBeNull();
    expect(screen.getByText('Score: 100%')).not.toBeNull();
    expect(screen.getByText(/Page 2/)).not.toBeNull();
    expect(screen.getByText(/Termination Clause/)).not.toBeNull();
    expect(screen.getByText(/4.2/)).not.toBeNull();
    expect(
      screen.getByText(
        '"Either party may terminate upon thirty (30) days written notice."'
      )
    ).not.toBeNull();
  });

  it('triggers jump to page and closes modal when canvas button is clicked', () => {
    const handleClose = vi.fn();
    const handleJump = vi.fn();
    render(
      <EvidenceModal
        evidence={mockEvidence}
        onClose={handleClose}
        onJumpToPage={handleJump}
      />
    );

    const jumpButton = screen.getByRole('button', {
      name: /view in document canvas/i,
    });
    fireEvent.click(jumpButton);

    expect(handleJump).toHaveBeenCalledWith(2);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when close icon button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <EvidenceModal
        evidence={mockEvidence}
        onClose={handleClose}
        onJumpToPage={vi.fn()}
      />
    );

    const closeButton = screen.getByRole('button', {
      name: /close evidence modal/i,
    });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
