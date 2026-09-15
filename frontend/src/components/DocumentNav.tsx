import React, { useState } from 'react';
import { Bookmark, Hash, Layers, Search, ChevronRight } from 'lucide-react';
import { Document } from '../types/document';

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

  return (
    <aside
      className="w-72 bg-[#f8f8f6] border-r border-[#e5e5e0] flex flex-col h-full overflow-hidden select-none"
      aria-label="Document Navigation and Structure"
    >
      {/* Top Search Filter */}
      <div className="p-3 border-b border-[#e5e5e0] bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#82827c]" />
          <input
            type="text"
            placeholder="Search clauses & terms..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f3f3f0] border border-[#e5e5e0] rounded-sm text-[#191919] placeholder-[#82827c] focus:bg-white focus:outline-hidden focus:border-[#1d3557]"
            aria-label="Search within document clauses"
          />
        </div>
      </div>

      {/* Pages Selector Bar */}
      <div className="p-2 border-b border-[#e5e5e0] bg-[#fafaf8] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#585854] flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Pages ({document.pages.length})
        </span>
      </div>

      <div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-[#e5e5e0] bg-white">
        {document.pages.map((p) => (
          <button
            key={p.page_number}
            onClick={() => onSelectPage(p.page_number)}
            className={`px-2.5 py-1 text-xs font-mono-legal rounded-sm border cursor-pointer transition-colors ${
              activePage === p.page_number
                ? 'bg-[#1d3557] text-white border-[#1d3557] font-semibold'
                : 'bg-[#f3f3f0] text-[#585854] border-[#e5e5e0] hover:bg-[#eaeae6]'
            }`}
            aria-label={`Jump to page ${p.page_number}`}
            aria-current={activePage === p.page_number ? 'page' : undefined}
          >
            P.{p.page_number}
          </button>
        ))}
      </div>

      {/* Outline Header */}
      <div className="p-2 border-b border-[#e5e5e0] bg-[#fafaf8]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#585854] flex items-center gap-1">
          <Bookmark className="w-3 h-3" />
          Document Outline ({filteredSections.length})
        </span>
      </div>

      {/* Clause and Section List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSections.length === 0 ? (
          <div className="text-xs text-[#82827c] text-center p-4">
            No matching clauses found.
          </div>
        ) : (
          filteredSections.map((sec) => (
            <button
              key={sec.section_id}
              onClick={() => {
                onSelectPage(sec.page_number);
                onSelectClause(sec.section_id);
              }}
              className="w-full text-left p-2 rounded-sm border border-transparent hover:border-[#e5e5e0] hover:bg-white text-xs cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="font-medium text-[#191919] group-hover:text-[#1d3557] line-clamp-1">
                  {sec.heading || `Clause ${sec.clause_number || sec.section_id}`}
                </div>
                <span className="text-[10px] font-mono-legal text-[#82827c] shrink-0 bg-[#f3f3f0] px-1 rounded-xs">
                  P.{sec.page_number}
                </span>
              </div>
              <p className="text-[11px] text-[#585854] line-clamp-2 mt-0.5 leading-snug">
                {sec.text}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer Hash Attribution */}
      <div className="p-2.5 border-t border-[#e5e5e0] bg-white text-[10px] text-[#82827c] font-mono-legal truncate">
        SHA256: {document.metadata.sha256_hash.slice(0, 16)}...
      </div>
    </aside>
  );
};
