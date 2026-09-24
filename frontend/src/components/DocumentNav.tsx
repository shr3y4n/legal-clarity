import React, { useState } from 'react';
import { Bookmark, Hash, Layers, Search, Compass, AlertCircle } from 'lucide-react';
import { Document, Section } from '../types/document';

interface DocumentNavProps {
  document: Document;
  activePage: number;
  onSelectPage: (pageNum: number) => void;
  onSelectClause: (clauseId: string) => void;
}

export const DocumentNav: React.FC<DocumentNavProps> = ({
  document,
  activePage,
  onSelectPage,
  onSelectClause,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Collect all sections across pages
  const allSections = document.pages.flatMap((p) =>
    p.sections.map((s) => ({ ...s, page_number: p.page_number }))
  );

  const filteredSections = allSections.filter((s) => {
    const q = filterQuery.toLowerCase();
    const heading = (s.heading || '').toLowerCase();
    const clause = (s.clause_number || '').toLowerCase();
    const text = s.text.toLowerCase();
    return heading.includes(q) || clause.includes(q) || text.includes(q);
  });

  const getSectionRiskCategory = (sec: Section) => {
    const sLower = sec.text.toLowerCase();
    const hLower = (sec.heading || '').toLowerCase();
    if (['indemn', 'liquidated damages', 'unilateral', 'injunctive', 'forfeit', 'dispute', 'arbitrat', 'liability limit'].some((w) => sLower.includes(w) || hLower.includes(w))) {
      return { label: 'IMPORTANT', style: 'bg-[#fef2f2] dark:bg-[#451212] text-[#991b1b] dark:text-[#f87171] border-[#fecaca] dark:border-[#7f1d1d]' };
    }
    if (['terminat', 'default', 'notice', 'days', 'fee', 'rent', 'deposit', 'cure period', 'pet'].some((w) => sLower.includes(w) || hLower.includes(w))) {
      return { label: 'REVIEW', style: 'bg-[#fffbeb] dark:bg-[#452b0a] text-[#92400e] dark:text-[#fbbf24] border-[#fde68a] dark:border-[#78350f]' };
    }
    return { label: 'ROUTINE', style: 'bg-[#f0fdf4] dark:bg-[#0d3319] text-[#166534] dark:text-[#4ade80] border-[#bbf7d0] dark:border-[#14532d]' };
  };

  return (
    <aside
      className="w-72 bg-[#f8f8f6] dark:bg-[#111827] border-r border-[#e5e5e0] dark:border-[#1f293d] flex flex-col h-full overflow-hidden select-none"
      aria-label="Clause Navigator and Document Structure"
    >
      {/* Top Search Filter */}
      <div className="p-3 border-b border-[#e5e5e0] dark:border-[#1f293d] bg-white dark:bg-[#161f30]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#82827c] dark:text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search clauses & terms..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f3f3f0] dark:bg-[#1f293d] border border-[#e5e5e0] dark:border-[#2d3748] rounded-sm text-[#191919] dark:text-[#f3f4f6] placeholder-[#82827c] dark:placeholder-[#9ca3af] focus:bg-white dark:focus:bg-[#161f30] focus:outline-hidden focus:border-[#1d3557] dark:focus:border-[#60a5fa]"
            aria-label="Search within document clauses"
          />
        </div>
      </div>

      {/* Pages Selector Bar */}
      <div className="p-2 border-b border-[#e5e5e0] dark:border-[#1f293d] bg-[#fafaf8] dark:bg-[#0f172a] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#585854] dark:text-[#9ca3af] flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Pages ({document.pages.length})
        </span>
      </div>

      <div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-[#e5e5e0] dark:border-[#1f293d] bg-white dark:bg-[#161f30]">
        {document.pages.map((p) => (
          <button
            key={p.page_number}
            onClick={() => onSelectPage(p.page_number)}
            className={`px-2.5 py-1 text-xs font-mono-legal rounded-sm border cursor-pointer transition-colors ${
              activePage === p.page_number
                ? 'bg-[#1d3557] dark:bg-[#2563eb] text-white border-[#1d3557] dark:border-[#2563eb] font-semibold'
                : 'bg-[#f3f3f0] dark:bg-[#1f293d] text-[#585854] dark:text-[#9ca3af] border-[#e5e5e0] dark:border-[#2d3748] hover:bg-[#eaeae6] dark:hover:bg-[#283548]'
            }`}
            aria-label={`Jump to page ${p.page_number}`}
            aria-current={activePage === p.page_number ? 'page' : undefined}
          >
            P.{p.page_number}
          </button>
        ))}
      </div>

      {/* Clause Navigator Header (Core Navigate Pillar) */}
      <div className="p-2 border-b border-[#e5e5e0] dark:border-[#1f293d] bg-[#fafaf8] dark:bg-[#0f172a] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#585854] dark:text-[#9ca3af] flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#1d3557] dark:text-[#60a5fa]" />
          Clause Navigator ({filteredSections.length})
        </span>
        <span className="text-[9px] uppercase font-mono-legal text-[#82827c] dark:text-[#9ca3af] bg-[#e5e5e0] dark:bg-[#1f293d] px-1 py-0.5 rounded-2xs">
          Interactive Index
        </span>
      </div>

      {/* Clause and Section List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSections.length === 0 ? (
          <div className="text-xs text-[#82827c] dark:text-[#9ca3af] text-center p-4">
            No matching clauses found.
          </div>
        ) : (
          filteredSections.map((sec) => {
            const risk = getSectionRiskCategory(sec);

            return (
              <button
                key={sec.section_id}
                onClick={() => {
                  onSelectPage(sec.page_number);
                  onSelectClause(sec.section_id);
                }}
                className="w-full text-left p-2 rounded-sm border border-transparent hover:border-[#e5e5e0] dark:hover:border-[#2d3748] hover:bg-white dark:hover:bg-[#161f30] text-xs cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="font-medium text-[#191919] dark:text-[#f3f4f6] group-hover:text-[#1d3557] dark:group-hover:text-[#60a5fa] line-clamp-1">
                    {sec.heading || `Clause ${sec.clause_number || sec.section_id}`}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-1 py-0.2 rounded-2xs border text-[8px] font-bold uppercase tracking-wider ${risk.style}`}>
                      {risk.label}
                    </span>
                    <span className="text-[10px] font-mono-legal text-[#82827c] dark:text-[#9ca3af] bg-[#f3f3f0] dark:bg-[#1f293d] px-1 rounded-xs">
                      P.{sec.page_number}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#585854] dark:text-[#9ca3af] line-clamp-2 mt-0.5 leading-snug">
                  {sec.text}
                </p>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Hash Attribution */}
      <div className="p-2.5 border-t border-[#e5e5e0] dark:border-[#1f293d] bg-white dark:bg-[#161f30] text-[10px] text-[#82827c] dark:text-[#9ca3af] font-mono-legal truncate">
        SHA256: {document.metadata.sha256_hash.slice(0, 16)}...
      </div>
    </aside>
  );
};
