import React, { useState } from 'react';
import { CheckSquare, Square, ShieldCheck, ExternalLink } from 'lucide-react';
import { ChecklistItem, DocumentChecklist, Evidence } from '../../types/document';

interface ChecklistPanelProps {
  checklist: DocumentChecklist | null;
  isLoading: boolean;
  onSelectEvidence: (ev: Evidence) => void;
}

export const ChecklistPanel: React.FC<ChecklistPanelProps> = ({
  checklist,
  isLoading,
  onSelectEvidence,
}) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#585854] space-y-3">
        <div className="w-5 h-5 border-2 border-[#1d3557] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Extracting practical obligations and creating document-grounded checklist...</p>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-6 text-center text-xs text-[#82827c]">
        Select a document to generate an actionable checklist.
      </div>
    );
  }

  const toggleItem = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progressPercent =
    checklist.items.length > 0
      ? Math.round((completedIds.size / checklist.items.length) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header & Progress */}
      <div className="p-4 bg-white border-b border-[#e5e5e0] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191919] m-0">
            Actionable Document Checklist
          </h3>
          <span className="text-[11px] font-mono-legal text-[#585854]">
            {completedIds.size} of {checklist.items.length} completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#f3f3f0] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#1d3557] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {checklist.items.map((item) => {
          const isDone = completedIds.has(item.item_id);

          return (
            <div
              key={item.item_id}
              onClick={() => toggleItem(item.item_id)}
              className={`p-3.5 bg-white border rounded-sm cursor-pointer transition-all space-y-2 select-none shadow-xs ${
                isDone ? 'border-[#bbf7d0] bg-[#f9fdfa]' : 'border-[#e5e5e0] hover:border-[#c8c8c0]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  className="mt-0.5 text-[#1d3557] focus:outline-hidden"
                  aria-label={isDone ? 'Mark uncompleted' : 'Mark completed'}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-[#166534]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#82827c]" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-semibold text-xs leading-snug ${
                        isDone ? 'line-through text-[#82827c]' : 'text-[#191919]'
                      }`}
                    >
                      {item.action_title}
                    </span>
                    <span className="text-[10px] uppercase font-mono-legal text-[#82827c] bg-[#f3f3f0] px-1.5 py-0.5 rounded-xs shrink-0">
                      {item.category}
                    </span>
                  </div>

                  <p className="m-0 text-[#585854] text-[11px] leading-relaxed">
                    {item.plain_instruction}
                  </p>
                </div>
              </div>

              {/* Source Evidence */}
              <div
                className="pt-2 border-t border-[#f3f3f0] flex items-center justify-between text-[10px] text-[#82827c]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-mono-legal">
                  Source: Page {item.evidence.page} · {item.evidence.section || 'Governing Section'}
                </span>
                <button
                  onClick={() => onSelectEvidence(item.evidence)}
                  className="inline-flex items-center gap-1 text-[#1d3557] hover:underline font-medium cursor-pointer"
                >
                  <span>View Source</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
