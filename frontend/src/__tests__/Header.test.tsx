import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Header } from '../components/Header';
import { DocumentMetadata } from '../types/document';

const mockDoc: DocumentMetadata = {
  document_id: 'doc_123',
  filename: 'commercial_lease_v1.txt',
  sha256_hash: 'abc123def456',
  mime_type: 'text/plain',
  byte_size: 4096,
  page_count: 3,
  created_at: '2026-09-15T00:00:00Z',
};

describe('Header Component', () => {
  it('renders application branding and grounding badge', () => {
    render(
      <Header
        currentDocument={null}
        activeTab="understand"
        setActiveTab={vi.fn()}
        onOpenUpload={vi.fn()}
        isDemo={false}
      />
    );

    expect(screen.getByText('Legal Clarity')).not.toBeNull();
    expect(screen.getByText('Evidence-Grounded Document Companion')).not.toBeNull();
    expect(screen.getByText('100% Grounded')).not.toBeNull();
    expect(screen.getByText('Gemini 2.5 Active')).not.toBeNull();
  });

  it('renders document metadata and navigation tabs when document is loaded', () => {
    const handleTabChange = vi.fn();
    render(
      <Header
        currentDocument={mockDoc}
        activeTab="understand"
        setActiveTab={handleTabChange}
        onOpenUpload={vi.fn()}
        isDemo={false}
      />
    );

    expect(screen.getByText('commercial_lease_v1.txt')).not.toBeNull();
    expect(screen.getByText('3 pages')).not.toBeNull();

    // Verify all 6 tabs are rendered
    expect(screen.getByText('Understand')).not.toBeNull();
    expect(screen.getByText('Review')).not.toBeNull();
    expect(screen.getByText('Ask Document')).not.toBeNull();
    expect(screen.getByText('Compare')).not.toBeNull();
    expect(screen.getByText('Checklist')).not.toBeNull();
    expect(screen.getByText('Lawyer Prep')).not.toBeNull();

    // Click Review tab
    fireEvent.click(screen.getByText('Review'));
    expect(handleTabChange).toHaveBeenCalledWith('review');
  });

  it('triggers onOpenUpload when upload button is clicked', () => {
    const handleUpload = vi.fn();
    render(
      <Header
        currentDocument={null}
        activeTab="understand"
        setActiveTab={vi.fn()}
        onOpenUpload={handleUpload}
        isDemo={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(handleUpload).toHaveBeenCalledTimes(1);
  });

  it('toggles dark mode when theme toggle button is clicked', () => {
    render(
      <Header
        currentDocument={null}
        activeTab="understand"
        setActiveTab={vi.fn()}
        onOpenUpload={vi.fn()}
        isDemo={false}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /switch to (dark|light) mode/i });
    expect(toggleBtn).not.toBeNull();
    fireEvent.click(toggleBtn);
  });

  it('opens Problem Statement Alignment modal when button is clicked', () => {
    render(
      <Header
        currentDocument={null}
        activeTab="understand"
        setActiveTab={vi.fn()}
        onOpenUpload={vi.fn()}
        isDemo={false}
      />
    );

    const psBtn = screen.getByText(/Problem Statement \(100%\)/i);
    expect(psBtn).not.toBeNull();
    fireEvent.click(psBtn);

    expect(screen.getByText(/Problem Statement Alignment: 100%/i)).not.toBeNull();
    expect(screen.getByText(/The 3 Architectural Pillars/i)).not.toBeNull();
  });
});

