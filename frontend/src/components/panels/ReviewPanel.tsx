import React, { useState } from 'react';
import { AlertTriangle, HelpCircle, ShieldCheck, Tag, ExternalLink } from 'lucide-react';
import { DocumentReviewResponse, Evidence, ReviewItem, ReviewLevel } from '../../types/document';

interface ReviewPanelProps {
  reviewData: DocumentReviewResponse | null;
  isLoading: boolean;
  onSelectEvidence: (ev: Evidence) => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  reviewData,
  isLoading,
  onSelectEvidence,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#585854] space-y-3">
        <div className="w-5 h-5 border-2 border-[#1d3557] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Analyzing clause characteristics, obligations, and review levels...</p>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="p-6 text-center text-xs text-[#82827c]">
        Select a document to initiate clause review.
      </div>
    );
  }

  const filteredItems = reviewData.review_items.filter((item) => {
    if (filterLevel === 'ALL') return true;
    return item.level === filterLevel;
  });

  const getBadgeStyle = (level: ReviewLevel) => {
    switch (level) {
      case 'IMPORTANT TO REVIEW':
        return 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]';
      case 'REVIEW':
        return 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]';
      case 'ROUTINE':
        return 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Review Metrics Header */}
      <div className="p-4 bg-white border-b border-[#e5e5e0] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191919] m-0">
            Clause Attention Analysis
          </h3>
          <span className="text-[11px] text-[#82827c]">
            {reviewData.total_clauses_reviewed} clauses evaluated
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <button
            onClick={() => setFilterLevel('ALL')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'ALL'
                ? 'bg-[#1d3557] text-white border-[#1d3557]'
                : 'bg-[#f3f3f0] text-[#585854] border-[#e5e5e0] hover:bg-[#eaeae6]'
            }`}
          >
            All ({reviewData.review_items.length})
          </button>

          <button
            onClick={() => setFilterLevel('IMPORTANT TO REVIEW')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'IMPORTANT TO REVIEW'
                ? 'bg-[#991b1b] text-white border-[#991b1b]'
                : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca] hover:bg-[#fee2e2]'
            }`}
          >
            Important ({reviewData.important_count})
          </button>

          <button
            onClick={() => setFilterLevel('REVIEW')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'REVIEW'
                ? 'bg-[#92400e] text-white border-[#92400e]'
                : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] hover:bg-[#fef3c7]'
            }`}
          >
            Review ({reviewData.review_count})
          </button>

          <button
            onClick={() => setFilterLevel('ROUTINE')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'ROUTINE'
                ? 'bg-[#166534] text-white border-[#166534]'
                : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0] hover:bg-[#dcfce7]'
            }`}
          >
            Routine ({reviewData.routine_count})
          </button>
        </div>
      </div>

      {/* Clause Items Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-[#82827c]">
            No clauses found under the selected filter.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.item_id}
              className="bg-white border border-[#e5e5e0] rounded-sm p-4 space-y-3 shadow-xs"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-[#191919] m-0 leading-snug">
                  {item.title}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-xs border text-[10px] font-semibold tracking-wider shrink-0 uppercase ${getBadgeStyle(
                    item.level
                  )}`}
                >
                  {item.level}
                </span>
              </div>

              {/* Plain Language Explanation */}
              <p className="text-[#585854] leading-relaxed m-0">{item.plain_explanation}</p>

              {/* Why was this highlighted? */}
              <div className="p-2.5 bg-[#fafaf8] border-l-2 border-[#1d3557] text-[11px] text-[#585854] leading-snug">
                <strong className="text-[#191919] font-medium">Why Highlighted: </strong>
                {item.why_highlighted}
              </div>

              {/* Exact Source Excerpt & Grounding */}
              <div className="pt-2 border-t border-[#f3f3f0] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono-legal text-[#82827c]">
                    Page {item.evidence.page} · {item.evidence.section || 'Governing Section'}
                  </span>
                  <button
                    onClick={() => onSelectEvidence(item.evidence)}
                    className="inline-flex items-center gap-1 text-[#1d3557] hover:underline font-medium cursor-pointer"
                    aria-label={`View excerpt on page ${item.evidence.page}`}
                  >
                    <span>View Source</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-2 bg-[#f8f8f6] border border-[#e5e5e0] rounded-xs font-document text-[12px] italic text-[#585854] line-clamp-3">
                  "{item.evidence.source_text}"
                </div>
              </div>

              {/* Suggested Lawyer Question */}
              <div className="p-2.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-sm text-[11px] text-[#1e40af] space-y-1">
                <div className="flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider">
                  <HelpCircle className="w-3 h-3 text-[#2563eb]" />
                  <span>Suggested Question for Counsel</span>
                </div>
                <p className="m-0 italic leading-snug">"{item.suggested_lawyer_question}"</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
