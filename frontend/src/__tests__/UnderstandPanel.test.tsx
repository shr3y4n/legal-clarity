import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { UnderstandPanel } from '../components/panels/UnderstandPanel';
import { Document, DocumentUnderstanding } from '../types/document';
import * as api from '../lib/api';

const mockUnderstanding: DocumentUnderstanding = {
  document_id: 'doc_123',
  document_type: 'Commercial Lease Agreement',
  parties: ['Acme Corp (Landlord)', 'Beta LLC (Tenant)'],
  dates: ['October 1, 2026', 'September 30, 2027'],
  duration_term: '12 months',
  concise_summary: 'Standard 12-month commercial lease with 60 days advance notice.',
  major_obligations: [],
  payment_terms: [
    {
      statement: 'Rent of $3,500 due on or before the 1st of each month.',
      evidence: [],
      is_supported: true,
    },
  ],
  termination_terms: [],
  renewal_terms: [],
  notice_requirements: [
    {
      statement: 'Tenant must provide at least 60 days advance written notice.',
      evidence: [],
      is_supported: true,
    },
  ],
  unusual_obligations: [],
  is_demo: false,
};

const mockDoc: Document = {
  metadata: {
    document_id: 'doc_123',
    filename: 'lease.txt',
    sha256_hash: 'hash123',
    mime_type: 'text/plain',
    byte_size: 500,
    page_count: 1,
    created_at: '2026-09-16T12:00:00Z',
  },
  pages: [],
  full_text: 'Tenant must provide 60 days written notice. Rent is due on or before the 1st.',
};

describe('UnderstandPanel Component', () => {
  it('renders document classification and plain summary', () => {
    render(
      <UnderstandPanel
        understanding={mockUnderstanding}
        document={mockDoc}
        isLoading={false}
        onSelectEvidence={vi.fn()}
      />
    );

    expect(screen.getByText('Commercial Lease Agreement')).not.toBeNull();
    expect(screen.getByText(/Standard 12-month commercial lease/i)).not.toBeNull();
    expect(screen.getByText(/Acme Corp/i)).not.toBeNull();
  });

  it('renders Action Timeline & Deadlines and triggers calendar export on click', () => {
    const exportSpy = vi.spyOn(api, 'exportCalendarIcs').mockResolvedValue();

    render(
      <UnderstandPanel
        understanding={mockUnderstanding}
        document={mockDoc}
        isLoading={false}
        onSelectEvidence={vi.fn()}
      />
    );

    expect(screen.getByText('Action Timeline & Deadlines')).not.toBeNull();
    const exportBtn = screen.getByRole('button', { name: /export to calendar \(\.ics\)/i });
    expect(exportBtn).not.toBeNull();

    fireEvent.click(exportBtn);
    expect(exportSpy).toHaveBeenCalledWith('doc_123');
  });
});
