import React from 'react';
import { X, ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { Evidence } from '../types/document';

interface EvidenceModalProps {
  evidence: Evidence | null;
  onClose: () => void;
  onJumpToPage: (page: number) => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidence,
  onClose,
  onJumpToPage,
}) => {
  if (!evidence) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-lg w-full p-6 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#166534]" />
            <div>
              <h2 id="evidence-modal-title" className="text-sm font-semibold text-[#191919] m-0">
                Grounding Evidence Inspection
              </h2>
              <p className="text-xs text-[#82827c] m-0">Deterministic source verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#82827c] hover:text-[#191919] p-1 cursor-pointer"
            aria-label="Close evidence modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Status Banner */}
        <div
          className={`p-3 rounded-sm border text-xs flex items-center justify-between ${
            evidence.verified
              ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
              : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
          }`}
        >
          <div className="flex items-center gap-2">
            {evidence.verified ? (
              <CheckCircle2 className="w-4 h-4 text-[#166534]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#991b1b]" />
            )}
            <span className="font-semibold">
              {evidence.verified
                ? 'Strict Containment Verified (100%)'
                : 'Containment Verification Failed'}
            </span>
          </div>
          <span className="font-mono-legal text-[11px]">
            Score: {Math.round(evidence.verification_score * 100)}%
          </span>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono-legal text-[#585854] bg-[#f8f8f6] p-2.5 rounded-sm border border-[#e5e5e0]">
          <FileText className="w-3.5 h-3.5 text-[#82827c]" />
          <span>Page {evidence.page}</span>
          {evidence.section && <span>· Section: {evidence.section}</span>}
          {evidence.clause_number && <span>· Clause: {evidence.clause_number}</span>}
        </div>

        {/* Source Text Quote */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#585854]">
            Extracted Document Excerpt
          </label>
          <div className="p-3 bg-[#fafaf8] border border-[#e5e5e0] rounded-xs font-document text-[13px] leading-relaxed text-[#191919] italic max-h-48 overflow-y-auto">
            "{evidence.source_text}"
          </div>
        </div>

        {/* Verification Note */}
        {evidence.verification_note && (
          <div className="text-[11px] text-[#82827c]">
            <strong>Auditor Note: </strong>
            {evidence.verification_note}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-[#e5e5e0] flex items-center justify-end gap-2">
          <button
            onClick={() => {
              onJumpToPage(evidence.page);
              onClose();
            }}
            className="px-4 py-1.5 bg-[#1d3557] hover:bg-[#14263f] text-white text-xs font-medium rounded-sm cursor-pointer transition-colors"
          >
            View in Document Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
