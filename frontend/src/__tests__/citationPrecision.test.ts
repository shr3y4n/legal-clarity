import { describe, it, expect } from 'vitest';
import { parseDocumentFromText, clientAsk } from '../lib/clientEngine';

const BENCHMARK_RAW_TEXT = `--- PAGE 1 ---
SYNTHETIC TEST DOCUMENT PROFESSIONAL SERVICES AGREEMENT
1. SERVICES
1.1 Provider shall deliver end-to-end cloud migration and architecture modernization services in accordance with agreed specifications.
2. TERM
2.1 This Agreement shall commence on October 1, 2025 and continue for an initial period of twelve (12) months.
3. FEES AND PAYMENT
3.1 The Client shall pay an implementation fee of INR 500,000 upon contract execution.
3.2 All invoices are payable net 30 days from the date of invoice receipt.
Legal Clarity Synthetic Benchmark • Page 1

--- PAGE 2 ---
3.3 Maintenance services after deployment shall cost INR 35,000 per month.
6. WARRANTY
6.1 Provider warrants that the services will conform to specifications for a warranty period of ninety (90) days from delivery.
7. TERMINATION
7.1 Either party may terminate this Agreement for convenience upon sixty (60) days advance written notice.
11. LIMITATION OF LIABILITY
11.1 Neither party shall be liable for indirect, incidental, or consequential damages.
11.2 The aggregate liability of either party under this Agreement shall not exceed the total fees paid by Client in the preceding twelve (12) months.
Legal Clarity Synthetic Benchmark • Page 2

--- PAGE 3 ---
13. GOVERNING LAW AND DISPUTE RESOLUTION
13.1 This Agreement shall be governed by and construed in accordance with the substantive laws of the Republic of India.
13.2 Any disputes arising out of this Agreement shall be referred to arbitration in accordance with the Arbitration and Conciliation Act. The specific court jurisdiction or judicial venue is not specified herein.
14. TERM RENEWAL
14.1 This Agreement shall automatically renew on an annual basis for successive one-year terms unless terminated in accordance with Section 7.
14.2 Any annual fee increase upon renewal shall not exceed a maximum increase of 5% of the preceding term's baseline fees.
Legal Clarity Synthetic Benchmark • Page 3`;

describe('Evidence & Citation Precision Pipeline (Client Engine)', () => {
  const doc = parseDocumentFromText('synthetic_benchmark.txt', BENCHMARK_RAW_TEXT);

  it('strips repeating footers and synthetic page markers from parsed text and sections', () => {
    expect(doc.metadata.page_count).toBe(3);
    expect(doc.pages.length).toBe(3);

    for (const page of doc.pages) {
      expect(page.text).not.toContain('Legal Clarity Synthetic Benchmark');
      expect(page.text).not.toContain('--- PAGE');
      for (const sec of page.sections) {
        expect(sec.text).not.toContain('Legal Clarity Synthetic Benchmark');
        expect(sec.text).not.toContain('--- PAGE');
      }
    }

    // Verify subclauses are segmented into atomic units
    const p1Clauses = doc.pages[0].sections.map((s) => s.clause_number);
    expect(p1Clauses).toContain('1.1');
    expect(p1Clauses).toContain('3.1');
    expect(p1Clauses).toContain('3.2');

    const p2Clauses = doc.pages[1].sections.map((s) => s.clause_number);
    expect(p2Clauses).toContain('3.3');
    expect(p2Clauses).toContain('6.1');
    expect(p2Clauses).toContain('7.1');
    expect(p2Clauses).toContain('11.2');

    const p3Clauses = doc.pages[2].sections.map((s) => s.clause_number);
    expect(p3Clauses).toContain('13.1');
    expect(p3Clauses).toContain('13.2');
    expect(p3Clauses).toContain('14.1');
    expect(p3Clauses).toContain('14.2');
  });

  it('mandated query 1: monthly maintenance fee returns INR 35,000, Clause 3.3, Page 2 with NO header/footer noise', () => {
    const ans = clientAsk(doc, 'What is the monthly maintenance fee?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('35,000');
    expect(ans.citations && ans.citations.length).toBeGreaterThan(0);

    const cit = ans.citations![0];
    expect(cit.clause_number).toBe('3.3');
    expect(cit.page).toBe(2);
    expect(cit.source_text).toContain('35,000 per month');
    expect(cit.source_text).not.toContain('PAGE 1');
    expect(cit.source_text).not.toContain('Legal Clarity Synthetic Benchmark');
    expect(cit.source_text).not.toContain('SYNTHETIC TEST DOCUMENT');
  });

  it('mandated query 2: implementation fee returns INR 500,000 (Clause 3.1, Page 1)', () => {
    const ans = clientAsk(doc, 'What is the implementation fee?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('500,000');
    expect(ans.citations![0].clause_number).toBe('3.1');
    expect(ans.citations![0].page).toBe(1);
  });

  it('mandated query 3: payment terms returns net 30 days (Clause 3.2, Page 1)', () => {
    const ans = clientAsk(doc, 'What are the payment terms for invoices?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('30 days');
    expect(ans.citations![0].clause_number).toBe('3.2');
    expect(ans.citations![0].page).toBe(1);
  });

  it('mandated query 4: warranty period returns ninety (90) days (Clause 6.1, Page 2)', () => {
    const ans = clientAsk(doc, 'What is the warranty period for services?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('90');
    expect(ans.citations![0].clause_number).toBe('6.1');
    expect(ans.citations![0].page).toBe(2);
  });

  it('mandated query 5: convenience termination notice returns sixty (60) days (Clause 7.1, Page 2)', () => {
    const ans = clientAsk(doc, 'What is the notice period for convenience termination?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('60');
    expect(ans.citations![0].clause_number).toBe('7.1');
    expect(ans.citations![0].page).toBe(2);
  });

  it('mandated query 6: liability cap returns twelve months (Clause 11.2, Page 2)', () => {
    const ans = clientAsk(doc, 'What is the liability cap under this agreement?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toMatch(/twelve|preceding/);
    expect(ans.citations![0].clause_number).toBe('11.2');
    expect(ans.citations![0].page).toBe(2);
  });

  it('mandated query 7: renewal frequency returns annual basis (Clause 14.1, Page 3)', () => {
    const ans = clientAsk(doc, 'What is the renewal frequency of this contract?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toMatch(/annual|one-year/);
    expect(ans.citations![0].clause_number).toBe('14.1');
    expect(ans.citations![0].page).toBe(3);
  });

  it('mandated query 8: max renewal fee increase returns 5% (Clause 14.2, Page 3)', () => {
    const ans = clientAsk(doc, 'What is the maximum renewal fee increase allowed?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('5%');
    expect(ans.citations![0].clause_number).toBe('14.2');
    expect(ans.citations![0].page).toBe(3);
  });

  it('mandated query 9: governing law and court jurisdiction (Clause 13.1 / 13.2, Page 3)', () => {
    const ans = clientAsk(doc, 'What is the governing law and court jurisdiction?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('India');
    expect(ans.answer_text).toContain('not specified');
    expect(ans.citations![0].page).toBe(3);
  });

  it('mandated query 10: missing information query (bank account number) returns refusal with zero false citations', () => {
    const ans = clientAsk(doc, 'What is the bank account number for wire transfers?');
    expect(ans.is_supported).toBe(false);
    expect(ans.refusal_reason).toBeDefined();
    expect(ans.citations).toHaveLength(0);
    expect(ans.evidence).toHaveLength(0);
  });

  it('handles high-level document question: What is this agreement?', () => {
    const ans = clientAsk(doc, 'What is this agreement about?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toMatch(/binding agreement|contract/i);
    expect(ans.citations && ans.citations.length).toBeGreaterThan(0);
  });

  it('handles parties question: Who are the parties to this agreement?', () => {
    const ans = clientAsk(doc, 'Who are the parties to this agreement?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toMatch(/Provider and the Client/i);
    expect(ans.citations && ans.citations.length).toBeGreaterThan(0);
  });

  it('handles term question: What is the term of this agreement?', () => {
    const ans = clientAsk(doc, 'What is the term of this agreement?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('October 1, 2025');
    expect(ans.citations![0].clause_number).toBe('2.1');
  });

  it('handles services question: What services are provided?', () => {
    const ans = clientAsk(doc, 'What services are provided under this contract?');
    expect(ans.is_supported).toBe(true);
    expect(ans.answer_text).toContain('cloud migration');
    expect(ans.citations![0].clause_number).toBe('1.1');
  });
});
