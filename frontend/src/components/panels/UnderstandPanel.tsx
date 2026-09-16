import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Info,
  ShieldCheck,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Claim, DeadlineEvent, Document, DocumentUnderstanding, Evidence } from '../../types/document';
import { exportCalendarIcs } from '../../lib/api';
import { extractClientDeadlines } from '../../lib/clientEngine';

interface UnderstandPanelProps {
  understanding: DocumentUnderstanding | null;
  document?: Document | null;
  isLoading: boolean;
  onSelectEvidence: (ev: Evidence) => void;
}

export const UnderstandPanel: React.FC<UnderstandPanelProps> = ({
  understanding,
  document,
  isLoading,
  onSelectEvidence,
}) => {
  // Extract or synthesize structured contractual deadlines
  const deadlines = useMemo<DeadlineEvent[]>(() => {
    if (document) {
      return extractClientDeadlines(document);
    }
    if (!understanding) return [];

    const synthesized: DeadlineEvent[] = [];
    if (understanding.notice_requirements && understanding.notice_requirements.length > 0) {
      const claim = understanding.notice_requirements[0];
      synthesized.push({
        event_id: 'dl_notice_synth',
        title: 'Advance Written Notice Requirement',
        category: 'Notice Period',
        date_description: claim.statement,
        action_required: 'Deliver formal written notice before the contractual window expires.',
        source_clause: claim.evidence?.[0]?.source_text,
        evidence: claim.evidence?.[0],
      });
    }

    if (understanding.payment_terms && understanding.payment_terms.length > 0) {
      const claim = understanding.payment_terms[0];
      synthesized.push({
        event_id: 'dl_payment_synth',
        title: 'Contractual Payment Milestone',
        category: 'Payment Deadline',
        date_description: claim.statement,
        action_required: 'Verify invoice and disburse payments in accordance with agreed schedule.',
        source_clause: claim.evidence?.[0]?.source_text,
        evidence: claim.evidence?.[0],
      });
    }

    if (understanding.termination_terms && understanding.termination_terms.length > 0) {
      const claim = understanding.termination_terms[0];
      synthesized.push({
        event_id: 'dl_term_synth',
        title: 'Termination / Cure Window',
        category: 'Cure Period',
        date_description: claim.statement,
        action_required: 'Remedy potential default within the cure timeline or trigger termination proceedings.',
        source_clause: claim.evidence?.[0]?.source_text,
        evidence: claim.evidence?.[0],
      });
    }

    return synthesized;
  }, [document, understanding]);

  const handleExportCalendar = async () => {
    const docId = document?.metadata.document_id || understanding?.document_id;
    if (!docId) return;
    try {
      await exportCalendarIcs(docId);
    } catch {
      // Fallback handled inside api.ts
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#585854] space-y-3">
        <div className="w-5 h-5 border-2 border-[#1d3557] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Extracting parties, dates, obligations, and grounded summary...</p>
      </div>
    );
  }

  if (!understanding) {
    return (
      <div className="p-6 text-center text-xs text-[#82827c]">
        Select a document to view structured understanding.
      </div>
    );
  }

  const renderClaimList = (title: string, claims: Claim[]) => {
    if (!claims || claims.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[#191919] uppercase tracking-wider">{title}</h4>
        <div className="space-y-2">
          {claims.map((claim, idx) => (
            <div
              key={idx}
              className="p-3 bg-white border border-[#e5e5e0] rounded-sm text-xs space-y-1.5"
            >
              <p className="text-[#191919] m-0 leading-relaxed">{claim.statement}</p>
              {claim.evidence && claim.evidence.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {claim.evidence.map((ev) => (
                    <button
                      key={ev.evidence_id}
                      onClick={() => onSelectEvidence(ev)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#f3f3f0] hover:bg-[#e5e5e0] text-[#585854] hover:text-[#191919] font-mono-legal text-[10px] rounded-xs border border-[#e5e5e0] cursor-pointer transition-colors"
                      title={ev.source_text}
                    >
                      <ShieldCheck className="w-3 h-3 text-[#166534]" />
                      <span>
                        P.{ev.page} {ev.clause_number ? `· ${ev.clause_number}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 space-y-6 overflow-y-auto h-full text-xs">
      {/* Document Classification */}
      <div className="p-4 bg-white border border-[#e5e5e0] rounded-sm space-y-3">
        <div>
          <span className="text-[10px] font-mono-legal uppercase tracking-wider text-[#82827c]">
            Document Classification
          </span>
          <h3 className="text-sm font-serif font-bold text-[#191919] m-0">
            {understanding.document_type}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f3f3f0]">
          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#82827c] mb-0.5">
              <Users className="w-3 h-3" />
              <span>Parties</span>
            </div>
            <div className="font-medium text-[#191919] line-clamp-2">
              {understanding.parties.join(', ')}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] text-[#82827c] mb-0.5">
              <Calendar className="w-3 h-3" />
              <span>Key Dates</span>
            </div>
            <div className="font-medium text-[#191919] line-clamp-2">
              {understanding.dates.join(', ')}
            </div>
          </div>
        </div>

        {understanding.duration_term && (
          <div className="pt-2 border-t border-[#f3f3f0] flex items-center gap-1.5 text-[#585854]">
            <Clock className="w-3.5 h-3.5 text-[#82827c]" />
            <span>
              <strong className="text-[#191919]">Duration:</strong> {understanding.duration_term}
            </span>
          </div>
        )}
      </div>

      {/* Key Deadlines & Calendar Export Card (Original Hackathon Feature) */}
      {deadlines.length > 0 && (
        <div className="p-4 bg-[#fbfbfa] dark:bg-[#131b2c] border border-[#d8d8d2] dark:border-[#28354f] rounded-sm space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#1d3557] dark:text-[#60a5fa]" />
              <h4 className="text-xs font-semibold text-[#191919] dark:text-[#f3f4f6] uppercase tracking-wider m-0">
                Action Timeline & Deadlines
              </h4>
            </div>
            <button
              onClick={handleExportCalendar}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1d3557] dark:bg-[#2563eb] hover:bg-[#15253e] dark:hover:bg-[#1d4ed8] text-white font-mono-legal text-[11px] font-medium rounded-xs cursor-pointer transition-colors shadow-2xs"
              title="Download RFC 5545 iCalendar file for Google Calendar, Apple Calendar, or Outlook"
            >
              <Download className="w-3 h-3" />
              <span>Export to Calendar (.ics)</span>
            </button>
          </div>

          <p className="text-[11px] text-[#585854] dark:text-[#9ca3af] m-0 leading-relaxed">
            Legal Clarity auto-extracted notice periods, payment due dates, and cure windows into an actionable timeline. Export them directly to your calendar to guarantee you never miss a contractual deadline.
          </p>

          <div className="space-y-2 pt-1">
            {deadlines.map((dl) => (
              <div
                key={dl.event_id}
                className="p-2.5 bg-white dark:bg-[#182234] border border-[#e5e5e0] dark:border-[#2a3854] rounded-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-[#191919] dark:text-[#f3f4f6]">
                    {dl.title}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-mono-legal uppercase font-medium bg-[#eef2f6] dark:bg-[#1e293b] text-[#1e40af] dark:text-[#93c5fd] border border-[#dbeafe] dark:border-[#1e3a8a]">
                    {dl.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#585854] dark:text-[#cbd5e1] m-0">
                  <strong className="text-[#191919] dark:text-white">Timing:</strong> {dl.date_description}
                </p>
                <p className="text-[11px] text-[#6b7280] dark:text-[#94a3b8] m-0 leading-relaxed">
                  {dl.action_required}
                </p>
                {dl.evidence && (
                  <div className="pt-1">
                    <button
                      onClick={() => onSelectEvidence(dl.evidence!)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#f3f3f0] dark:bg-[#0e1726] hover:bg-[#e5e5e0] text-[#585854] dark:text-[#94a3b8] font-mono-legal text-[10px] rounded-xs border border-[#e5e5e0] dark:border-[#223049] cursor-pointer"
                    >
                      <ShieldCheck className="w-2.5 h-2.5 text-[#166534] dark:text-[#4ade80]" />
                      <span>Verify Clause in Document Canvas</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plain Language Summary */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-[#191919] uppercase tracking-wider flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-[#1d3557]" />
          Executive Plain-Language Summary
        </h4>
        <div className="p-3 bg-white border border-[#e5e5e0] rounded-sm leading-relaxed text-[#191919]">
          {understanding.concise_summary}
        </div>
      </div>

      {/* Major Obligations */}
      {renderClaimList('Core Contractual Obligations', understanding.major_obligations)}

      {/* Payment & Financial Terms */}
      {renderClaimList('Payment & Financial Terms', understanding.payment_terms)}

      {/* Termination & Remedies */}
      {renderClaimList('Termination & Default Terms', understanding.termination_terms)}

      {/* Notice Windows */}
      {renderClaimList('Notice Requirements & Deadlines', understanding.notice_requirements)}

      {/* Renewal Terms */}
      {renderClaimList('Renewal & Extensions', understanding.renewal_terms)}
    </div>
  );
};
