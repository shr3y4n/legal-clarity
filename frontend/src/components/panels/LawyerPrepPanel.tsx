import React from 'react';
import { Briefcase, ExternalLink, HelpCircle, Printer, ShieldAlert } from 'lucide-react';
import { Evidence, LawyerPrepResponse } from '../../types/document';

interface LawyerPrepPanelProps {
  prepData: LawyerPrepResponse | null;
  isLoading: boolean;
  onSelectEvidence: (ev: Evidence) => void;
}

export const LawyerPrepPanel: React.FC<LawyerPrepPanelProps> = ({
  prepData,
  isLoading,
  onSelectEvidence,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#585854] space-y-3">
        <div className="w-5 h-5 border-2 border-[#1d3557] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Formulating neutral questions for counsel grounded in clauses...</p>
      </div>
    );
  }

  if (!prepData) {
    return (
      <div className="p-6 text-center text-xs text-[#82827c]">
        Select a document to prepare questions for legal counsel.
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Disclaimer Banner */}
      <div className="p-3.5 bg-[#fef2f2] border-b border-[#fecaca] text-[#991b1b] shrink-0 space-y-1">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#991b1b]" />
          <span>Legal Safety Notice & Disclaimers</span>
        </div>
        <p className="text-[11px] leading-relaxed m-0">{prepData.legal_safety_disclaimer}</p>
      </div>

      {/* Header & Print Action */}
      <div className="p-4 bg-white border-b border-[#e5e5e0] flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191919] m-0">
            Focused Questions for Your Lawyer
          </h3>
          <p className="text-[11px] text-[#82827c] m-0">
            Neutral inquiries grounded directly in specific clauses of this agreement.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f3f0] hover:bg-[#e5e5e0] text-[#191919] border border-[#e5e5e0] rounded-sm font-medium cursor-pointer transition-colors"
          aria-label="Print lawyer questions"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Export</span>
        </button>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {prepData.questions.map((q, idx) => (
          <div
            key={q.question_id}
            className="p-4 bg-white border border-[#e5e5e0] rounded-sm space-y-2.5 shadow-xs"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#1d3557] flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                <span>Question {idx + 1}: {q.topic}</span>
              </span>
              <span className="font-mono-legal text-[#82827c] bg-[#f8f8f6] px-1.5 py-0.5 rounded-xs border border-[#e5e5e0]">
                {q.source_clause}
              </span>
            </div>

            {/* Recommended Neutral Question */}
            <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xs font-serif text-sm font-medium text-[#1e40af] leading-snug">
              "{q.recommended_question}"
            </div>

            {/* Context Rationale */}
            <p className="m-0 text-[#585854] text-[11px] leading-relaxed">
              <strong className="text-[#191919]">Why this matters: </strong>
              {q.context_rationale}
            </p>

            {/* Source Anchor */}
            <div className="pt-2 border-t border-[#f3f3f0] flex items-center justify-between text-[10px] text-[#82827c]">
              <span className="font-mono-legal">
                Page {q.evidence.page} · Quote: "{q.evidence.source_text.slice(0, 60)}..."
              </span>
              <button
                onClick={() => onSelectEvidence(q.evidence)}
                className="inline-flex items-center gap-1 text-[#1d3557] hover:underline font-medium cursor-pointer"
              >
                <span>View Excerpt</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
