import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  ShieldCheck,
  ExternalLink,
  Calendar,
  Download,
  Copy,
  Check,
} from 'lucide-react';
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
  const [copiedMd, setCopiedMd] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#585854] dark:text-[#9ca3af] space-y-3">
        <div className="w-5 h-5 border-2 border-[#1d3557] dark:border-[#60a5fa] border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Extracting practical obligations and creating document-grounded checklist...</p>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-6 text-center text-xs text-[#82827c] dark:text-[#6b7280]">
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

  const handleExportICS = () => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const events = checklist.items.map((item, idx) => {
      const eventDate = new Date(now.getTime() + (idx + 1) * 7 * 24 * 60 * 60 * 1000);
      const startStr = formatDate(eventDate);
      const endStr = formatDate(new Date(eventDate.getTime() + 60 * 60 * 1000));
      return [
        'BEGIN:VEVENT',
        `UID:legal-clarity-${item.item_id}@legalclarity.app`,
        `DTSTAMP:${formatDate(now)}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:Legal Action: ${item.action_title}`,
        `DESCRIPTION:${item.plain_instruction.replace(/\n/g, ' ')} (Category: ${item.category})`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
      ].join('\r\n');
    });

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Legal Clarity//Document Action Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `action-deadlines-${checklist.document_id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = [
      `# Legal Clarity Action Checklist - ${checklist.document_id}`,
      `Generated on ${new Date().toLocaleDateString()}`,
      '',
      ...checklist.items.map((i) => {
        const isDone = completedIds.has(i.item_id);
        return `- [${isDone ? 'x' : ' '}] **${i.action_title}** [${i.category}]\n  ${i.plain_instruction} *(Page ${i.evidence.page})*`;
      }),
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
    }
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header & Progress */}
      <div className="p-4 bg-white dark:bg-[#161f30] border-b border-[#e5e5e0] dark:border-[#1f293d] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191919] dark:text-[#f3f4f6] m-0">
              Actionable Document Checklist & Deadlines
            </h3>
            <p className="text-[11px] text-[#82827c] dark:text-[#9ca3af] m-0">
              Transforming dense contractual obligations into executable action items
            </p>
          </div>
          <span className="text-[11px] font-mono-legal text-[#585854] dark:text-[#9ca3af]">
            {completedIds.size} of {checklist.items.length} completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#f3f3f0] dark:bg-[#1f293d] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#1d3557] dark:bg-[#3b82f6] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Actionable Outputs Export Bar */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleExportICS}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1d3557] dark:bg-[#2563eb] text-white hover:bg-[#14263f] dark:hover:bg-[#1d4ed8] rounded-xs font-medium cursor-pointer transition-colors shadow-2xs"
            title="Download iCalendar file (.ics) with scheduled contract action deadlines"
          >
            <Calendar className="w-3 h-3" />
            <span>Export Action Deadlines (.ics Calendar)</span>
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f3f3f0] dark:bg-[#1f293d] text-[#191919] dark:text-[#e2e8f0] border border-[#e5e5e0] dark:border-[#2d3748] hover:bg-[#eaeae6] dark:hover:bg-[#283548] rounded-xs font-medium cursor-pointer transition-colors"
            title="Copy entire checklist as markdown"
          >
            {copiedMd ? (
              <>
                <Check className="w-3 h-3 text-[#16a34a]" />
                <span className="text-[#16a34a] font-semibold">Copied Markdown!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Checklist</span>
              </>
            )}
          </button>
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
              className={`p-3.5 bg-white dark:bg-[#161f30] border rounded-sm cursor-pointer transition-all space-y-2 select-none shadow-xs ${
                isDone
                  ? 'border-[#bbf7d0] dark:border-[#14532d] bg-[#f9fdfa] dark:bg-[#0b2413]'
                  : 'border-[#e5e5e0] dark:border-[#1f293d] hover:border-[#c8c8c0] dark:hover:border-[#374151]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  className="mt-0.5 text-[#1d3557] dark:text-[#60a5fa] focus:outline-hidden"
                  aria-label={isDone ? 'Mark uncompleted' : 'Mark completed'}
                >
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-[#166534] dark:text-[#4ade80]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#82827c] dark:text-[#9ca3af]" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`font-semibold text-xs leading-snug ${
                        isDone
                          ? 'line-through text-[#82827c] dark:text-[#6b7280]'
                          : 'text-[#191919] dark:text-[#f3f4f6]'
                      }`}
                    >
                      {item.action_title}
                    </span>
                    <span className="text-[10px] uppercase font-mono-legal text-[#82827c] dark:text-[#9ca3af] bg-[#f3f3f0] dark:bg-[#1f293d] px-1.5 py-0.5 rounded-xs shrink-0">
                      {item.category}
                    </span>
                  </div>

                  <p className="m-0 text-[#585854] dark:text-[#d1d5db] text-[11px] leading-relaxed">
                    {item.plain_instruction}
                  </p>
                </div>
              </div>

              {/* Source Evidence */}
              <div
                className="pt-2 border-t border-[#f3f3f0] dark:border-[#1f293d] flex items-center justify-between text-[10px] text-[#82827c] dark:text-[#9ca3af]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-mono-legal">
                  Source: Page {item.evidence.page} · {item.evidence.section || 'Governing Section'}
                </span>
                <button
                  onClick={() => onSelectEvidence(item.evidence)}
                  className="inline-flex items-center gap-1 text-[#1d3557] dark:text-[#60a5fa] hover:underline font-medium cursor-pointer"
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
