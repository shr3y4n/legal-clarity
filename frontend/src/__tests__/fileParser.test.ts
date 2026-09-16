import { describe, it, expect } from 'vitest';
import { parseDocumentFromText } from '../lib/clientEngine';

describe('Document Text Parsing & Binary Sanitization', () => {
  it('parses structured sections from plain legal text', () => {
    const rawText = `COMMERCIAL LEASE AGREEMENT
SECTION 1.0 PREMISES
Landlord leases the premises to Tenant.

SECTION 2.0 RENT
Monthly rent is $3,000.`;

    const doc = parseDocumentFromText('lease.txt', rawText);
    expect(doc.metadata.filename).toBe('lease.txt');
    expect(doc.pages.length).toBeGreaterThan(0);
    expect(doc.pages[0].sections.length).toBeGreaterThanOrEqual(2);
    expect(doc.full_text).toContain('$3,000');
  });

  it('safely filters out raw ZIP and Content_Types XML artifacts', () => {
    const corruptedZipString = `PK\x03\x04\x14\x00[Content_Types].xml _rels/.rels
SECTION 1.0 SERVICES
Contractor shall provide services.`;

    const doc = parseDocumentFromText('contract.docx', corruptedZipString);
    expect(doc.full_text).not.toContain('[Content_Types].xml');
    expect(doc.full_text).not.toContain('_rels/.rels');
    expect(doc.full_text).toContain('Contractor shall provide services.');
  });
});
