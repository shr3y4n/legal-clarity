import React, { useState } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Tag,
  ExternalLink,
  GitBranch,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  Scale,
} from 'lucide-react';
import {
  DocumentReviewResponse,
  Evidence,
  InconsistencyItem,
  ReviewItem,
  ReviewLevel,
} from '../../types/document';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});

  const handleCopy = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleOptions = (itemId: string) => {
    setExpandedOptions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#585854] dark:text-[#9ca3af] space-y-3">
        <div className="w-5 h-5 border-2 border-[#1d3557] dark:border-[#60a5fa] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Analyzing clause characteristics, obligations, risks, and substantive inconsistencies...</p>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="p-6 text-center text-xs text-[#82827c] dark:text-[#6b7280]">
        Select a document to initiate clause review and inconsistency detection.
      </div>
    );
  }

  const inconsistencies = reviewData.inconsistencies || [];
  const inconsistencyCount = reviewData.inconsistency_count ?? inconsistencies.length;

  const filteredItems = reviewData.review_items.filter((item) => {
    if (filterLevel === 'ALL') return true;
    return item.level === filterLevel;
  });

  const getBadgeStyle = (level: ReviewLevel) => {
    switch (level) {
      case 'IMPORTANT TO REVIEW':
        return 'bg-[#fef2f2] dark:bg-[#451212] border-[#fecaca] dark:border-[#7f1d1d] text-[#991b1b] dark:text-[#f87171]';
      case 'REVIEW':
        return 'bg-[#fffbeb] dark:bg-[#452b0a] border-[#fde68a] dark:border-[#78350f] text-[#92400e] dark:text-[#fbbf24]';
      case 'ROUTINE':
        return 'bg-[#f0fdf4] dark:bg-[#0d3319] border-[#bbf7d0] dark:border-[#14532d] text-[#166534] dark:text-[#4ade80]';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Review Metrics Header */}
      <div className="p-4 bg-white dark:bg-[#161f30] border-b border-[#e5e5e0] dark:border-[#1f293d] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191919] dark:text-[#f3f4f6] m-0">
              Clause Attention & Risk Analysis
            </h3>
            <p className="text-[11px] text-[#82827c] dark:text-[#9ca3af] m-0">
              Highlighting obligations, severe risks, and conflicting provisions
            </p>
          </div>
          <span className="text-[11px] text-[#82827c] dark:text-[#9ca3af] font-mono-legal">
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
                : 'bg-[#f3f3f0] dark:bg-[#1f293d] text-[#585854] dark:text-[#9ca3af] border-[#e5e5e0] dark:border-[#2d3748] hover:bg-[#eaeae6] dark:hover:bg-[#283548]'
            }`}
          >
            All ({reviewData.review_items.length})
          </button>

          <button
            onClick={() => setFilterLevel('IMPORTANT TO REVIEW')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'IMPORTANT TO REVIEW'
                ? 'bg-[#991b1b] text-white border-[#991b1b]'
                : 'bg-[#fef2f2] dark:bg-[#321313] text-[#991b1b] dark:text-[#f87171] border-[#fecaca] dark:border-[#7f1d1d] hover:bg-[#fee2e2]'
            }`}
          >
            Important ({reviewData.important_count})
          </button>

          <button
            onClick={() => setFilterLevel('REVIEW')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'REVIEW'
                ? 'bg-[#92400e] text-white border-[#92400e]'
                : 'bg-[#fffbeb] dark:bg-[#33220a] text-[#92400e] dark:text-[#fbbf24] border-[#fde68a] dark:border-[#78350f] hover:bg-[#fef3c7]'
            }`}
          >
            Review ({reviewData.review_count})
          </button>

          <button
            onClick={() => setFilterLevel('ROUTINE')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors ${
              filterLevel === 'ROUTINE'
                ? 'bg-[#166534] text-white border-[#166534]'
                : 'bg-[#f0fdf4] dark:bg-[#0c2a16] text-[#166534] dark:text-[#4ade80] border-[#bbf7d0] dark:border-[#14532d] hover:bg-[#dcfce7]'
            }`}
          >
            Routine ({reviewData.routine_count})
          </button>

          <button
            onClick={() => setFilterLevel('INCONSISTENCIES')}
            className={`px-2 py-1 rounded-sm border font-medium cursor-pointer transition-colors flex items-center gap-1 ${
              filterLevel === 'INCONSISTENCIES'
                ? 'bg-[#7c2d12] dark:bg-[#9a3412] text-white border-[#7c2d12]'
                : 'bg-[#fff7ed] dark:bg-[#2c1a0e] text-[#c2410c] dark:text-[#fb923c] border-[#ffedd5] dark:border-[#9a3412] hover:bg-[#ffedd5]'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-[#ea580c] dark:text-[#fb923c]" />
            <span>Inconsistencies ({inconsistencyCount})</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filterLevel === 'INCONSISTENCIES' ? (
          /* Inconsistencies View */
          inconsistencies.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#161f30] border border-[#e5e5e0] dark:border-[#1f293d] rounded-sm space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#166534] dark:text-[#4ade80] mx-auto" />
              <h4 className="text-xs font-semibold text-[#191919] dark:text-[#f3f4f6] m-0">
                No Substantive Contradictions Detected
              </h4>
              <p className="text-[11px] text-[#82827c] dark:text-[#9ca3af] max-w-sm mx-auto m-0 leading-relaxed">
                The provisions, notice periods, and liability caps in this document appear harmonized without direct internal operational conflicts.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-[#fff7ed] dark:bg-[#2c1a0e] border border-[#ffedd5] dark:border-[#9a3412] rounded-sm flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#c2410c] dark:text-[#fb923c] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs text-[#9a3412] dark:text-[#fb923c]">
                    {inconsistencies.length} Substantive Contract Contradiction{inconsistencies.length > 1 ? 's' : ''} Identified
                  </span>
                  <p className="text-[11px] text-[#7c2d12] dark:text-[#fdba74] m-0 leading-relaxed">
                    Conflicting provisions create legal ambiguity and enforcement risk. Compare the conflicting clauses below with proposed harmonization redlines.
                  </p>
                </div>
              </div>

              {inconsistencies.map((inc) => (
                <div
                  key={inc.inconsistency_id}
                  className="bg-white dark:bg-[#161f30] border-2 border-[#fdba74] dark:border-[#9a3412] rounded-sm p-4 space-y-3.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#ea580c] dark:text-[#fb923c] shrink-0" />
                      <h4 className="text-xs font-bold text-[#191919] dark:text-[#f3f4f6] m-0">
                        {inc.title}
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-xs bg-[#fef3c7] dark:bg-[#452b0a] border border-[#fde68a] dark:border-[#78350f] text-[#92400e] dark:text-[#fbbf24] text-[10px] font-bold uppercase tracking-wider shrink-0">
                      Conflict
                    </span>
                  </div>

                  <p className="text-[#585854] dark:text-[#d1d5db] leading-relaxed m-0 text-xs">
                    {inc.description}
                  </p>

                  {/* Conflicting Clauses Side-by-Side Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Clause A */}
                    <div className="p-3 bg-[#f8f8f6] dark:bg-[#0f172a] border border-[#e5e5e0] dark:border-[#1f293d] rounded-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#191919] dark:text-[#f3f4f6]">
                          Clause A: {inc.clause_a_title}
                        </span>
                        <button
                          onClick={() => onSelectEvidence(inc.clause_a_evidence)}
                          className="inline-flex items-center gap-1 text-[#1d3557] dark:text-[#60a5fa] hover:underline font-medium cursor-pointer"
                        >
                          <span>P.{inc.clause_a_evidence.page}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#161f30] border border-[#e5e5e0] dark:border-[#2d3748] rounded-xs font-document text-[11px] italic text-[#585854] dark:text-[#9ca3af]">
                        "{inc.clause_a_evidence.source_text}"
                      </div>
                    </div>

                    {/* Clause B */}
                    <div className="p-3 bg-[#f8f8f6] dark:bg-[#0f172a] border border-[#e5e5e0] dark:border-[#1f293d] rounded-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#191919] dark:text-[#f3f4f6]">
                          Clause B: {inc.clause_b_title}
                        </span>
                        <button
                          onClick={() => onSelectEvidence(inc.clause_b_evidence)}
                          className="inline-flex items-center gap-1 text-[#1d3557] dark:text-[#60a5fa] hover:underline font-medium cursor-pointer"
                        >
                          <span>P.{inc.clause_b_evidence.page}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#161f30] border border-[#e5e5e0] dark:border-[#2d3748] rounded-xs font-document text-[11px] italic text-[#585854] dark:text-[#9ca3af]">
                        "{inc.clause_b_evidence.source_text}"
                      </div>
                    </div>
                  </div>

                  {/* Suggested Remedy Box */}
                  <div className="p-3 bg-[#f0fdf4] dark:bg-[#0c2a16] border border-[#bbf7d0] dark:border-[#14532d] rounded-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px] uppercase tracking-wider text-[#166534] dark:text-[#4ade80] flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5" />
                        Suggested Harmonization Remedy
                      </span>
                      <button
                        onClick={() => handleCopy(inc.inconsistency_id, inc.suggested_remedy)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#166534] dark:text-[#4ade80] hover:underline font-medium cursor-pointer"
                      >
                        {copiedId === inc.inconsistency_id ? (
                          <>
                            <Check className="w-3 h-3 text-[#16a34a]" />
                            <span className="text-[#16a34a] font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Remedy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="m-0 text-[11px] text-[#14532d] dark:text-[#bbf7d0] leading-relaxed font-document">
                      {inc.suggested_remedy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center text-[#82827c] dark:text-[#6b7280]">
            No clauses found under the selected filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const hasOptions = item.options_and_next_steps && item.options_and_next_steps.length > 0;
            const isOptionsOpen = expandedOptions[item.item_id] ?? (item.level === 'IMPORTANT TO REVIEW');

            return (
              <div
                key={item.item_id}
                className="bg-white dark:bg-[#161f30] border border-[#e5e5e0] dark:border-[#1f293d] rounded-sm p-4 space-y-3.5 shadow-xs"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#191919] dark:text-[#f3f4f6] m-0 leading-snug">
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
                <p className="text-[#585854] dark:text-[#d1d5db] leading-relaxed m-0 text-xs">
                  {item.plain_explanation}
                </p>

                {/* Why was this highlighted? */}
                <div className="p-2.5 bg-[#fafaf8] dark:bg-[#1f293d] border-l-2 border-[#1d3557] dark:border-[#60a5fa] text-[11px] text-[#585854] dark:text-[#d1d5db] leading-snug">
                  <strong className="text-[#191919] dark:text-[#f3f4f6] font-medium">Why Highlighted: </strong>
                  {item.why_highlighted}
                </div>

                {/* Exact Source Excerpt & Grounding */}
                <div className="pt-2 border-t border-[#f3f3f0] dark:border-[#1f293d] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono-legal text-[#82827c] dark:text-[#9ca3af]">
                      Page {item.evidence.page} · {item.evidence.section || 'Governing Section'}
                    </span>
                    <button
                      onClick={() => onSelectEvidence(item.evidence)}
                      className="inline-flex items-center gap-1 text-[#1d3557] dark:text-[#60a5fa] hover:underline font-medium cursor-pointer"
                      aria-label={`View excerpt on page ${item.evidence.page}`}
                    >
                      <span>View Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-2 bg-[#f8f8f6] dark:bg-[#0f172a] border border-[#e5e5e0] dark:border-[#1f293d] rounded-xs font-document text-[12px] italic text-[#585854] dark:text-[#d1d5db] line-clamp-3">
                    "{item.evidence.source_text}"
                  </div>
                </div>

                {/* Suggested Lawyer Question */}
                <div className="p-2.5 bg-[#eff6ff] dark:bg-[#0f2347] border border-[#bfdbfe] dark:border-[#1e3a8a] rounded-sm text-[11px] text-[#1e40af] dark:text-[#93c5fd] space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider">
                    <HelpCircle className="w-3 h-3 text-[#2563eb] dark:text-[#60a5fa]" />
                    <span>Suggested Question for Counsel</span>
                  </div>
                  <p className="m-0 italic leading-snug">"{item.suggested_lawyer_question}"</p>
                </div>

                {/* Strategic Options & Potential Next Steps (PS Use Case Requirement) */}
                {hasOptions && (
                  <div className="pt-2 border-t border-[#f3f3f0] dark:border-[#1f293d]">
                    <button
                      onClick={() => toggleOptions(item.item_id)}
                      className="w-full flex items-center justify-between p-2 bg-[#f8f9fa] dark:bg-[#1a2333] border border-[#e2e8f0] dark:border-[#2d3748] rounded-xs text-[11px] font-semibold text-[#1e293b] dark:text-[#f1f5f9] hover:bg-[#edf2f7] dark:hover:bg-[#222e44] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#60a5fa]" />
                        <span>Your Strategic Options & Potential Next Steps</span>
                        <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8] font-normal">
                          ({item.options_and_next_steps!.length} available)
                        </span>
                      </span>
                      {isOptionsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-[#64748b]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
                      )}
                    </button>

                    {isOptionsOpen && (
                      <div className="mt-2 space-y-2.5">
                        {item.options_and_next_steps!.map((opt, idx) => {
                          const isRedline = opt.option_type.includes('Redline') || opt.option_type.includes('Counter');
                          const optKey = `${item.item_id}_opt_${idx}`;

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xs border text-[11px] space-y-2 ${
                                isRedline
                                  ? 'bg-[#f0fdf4] dark:bg-[#0c2a16] border-[#86efac] dark:border-[#166534]'
                                  : 'bg-white dark:bg-[#0f172a] border-[#e2e8f0] dark:border-[#1f293d]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-semibold text-xs ${
                                    isRedline
                                      ? 'text-[#166534] dark:text-[#4ade80]'
                                      : 'text-[#1e293b] dark:text-[#f8fafc]'
                                  }`}
                                >
                                  Option {idx + 1}: {opt.option_type}
                                </span>
                                {isRedline && (
                                  <span className="px-1.5 py-0.5 rounded-2xs bg-[#bbf7d0] dark:bg-[#14532d] text-[#166534] dark:text-[#86efac] text-[9px] font-bold uppercase tracking-wider">
                                    Recommended Action
                                  </span>
                                )}
                              </div>

                              <p className="m-0 text-[#475569] dark:text-[#cbd5e1] leading-relaxed">
                                {opt.description}
                              </p>

                              {/* Proposed Balanced Counter-Language (Redline) */}
                              {opt.proposed_counter_language && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#166534] dark:text-[#4ade80] flex items-center gap-1">
                                      <FileCode className="w-3 h-3" />
                                      Proposed Balanced Counter-Language:
                                    </span>
                                    <button
                                      onClick={() => handleCopy(optKey, opt.proposed_counter_language!)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-2xs bg-white dark:bg-[#161f30] border border-[#86efac] dark:border-[#166534] text-[#166534] dark:text-[#4ade80] hover:bg-[#dcfce7] font-medium cursor-pointer shadow-2xs transition-colors"
                                      title="Copy proposed counter-language to clipboard"
                                    >
                                      {copiedId === optKey ? (
                                        <>
                                          <Check className="w-3 h-3 text-[#16a34a]" />
                                          <span className="text-[#16a34a] font-bold">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Proposed Redline</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <div className="p-2.5 bg-white dark:bg-[#161f30] border border-[#bbf7d0] dark:border-[#166534] rounded-xs font-mono-legal text-[11px] italic text-[#166534] dark:text-[#86efac] leading-relaxed">
                                    "{opt.proposed_counter_language}"
                                  </div>
                                </div>
                              )}

                              <div className="p-1.5 bg-[#f1f5f9] dark:bg-[#1e293b] rounded-2xs text-[10px] text-[#334155] dark:text-[#94a3b8]">
                                <strong className="font-semibold text-[#0f172a] dark:text-[#e2e8f0]">Immediate Next Step: </strong>
                                {opt.action_step}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
