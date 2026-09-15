import React from 'react';
import { Calendar, Clock, FileText, Info, ShieldCheck, Users } from 'lucide-react';
import { Claim, DocumentUnderstanding, Evidence } from '../../types/document';

interface UnderstandPanelProps {
  understanding: DocumentUnderstanding | null;
  isLoading: boolean;
  onSelectEvidence: (ev: Evidence) => void;
}

export const UnderstandPanel: React.FC<UnderstandPanelProps> = ({
  understanding,
  isLoading,
  onSelectEvidence,
}) => {
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
