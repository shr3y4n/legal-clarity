import React, { useEffect, useRef } from 'react';
import { FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import { Document, Evidence } from '../types/document';

interface DocumentCanvasProps {
  document: Document;
  activePage: number;
  highlightedEvidence: Evidence | null;
  onClearHighlight?: () => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  document,
  activePage,
  highlightedEvidence,
  onClearHighlight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLElement | null }>({});

  // Scroll to highlighted clause section or page
  useEffect(() => {
    if (highlightedEvidence) {
      setTimeout(() => {
        const secId = highlightedEvidence.clause_number
          ? `p${highlightedEvidence.page}_${highlightedEvidence.clause_number.replace(/\./g, '_').replace(/[()]/g, '')}`
          : null;
        let targetEl = secId ? window.document.getElementById(secId) : null;

        if (!targetEl && highlightedEvidence.source_text && containerRef.current) {
          const snippet = highlightedEvidence.source_text.slice(0, 30);
          const sections = containerRef.current.querySelectorAll('section');
          for (const s of Array.from(sections)) {
            if (s.textContent?.includes(snippet)) {
              targetEl = s as HTMLElement;
              break;
            }
          }
        }

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const pageEl = pageRefs.current[highlightedEvidence.page];
          if (pageEl) {
            pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 50);
    }
  }, [highlightedEvidence]);

  // Scroll when activePage changes from Nav
  useEffect(() => {
    if (!highlightedEvidence) {
      const pageEl = pageRefs.current[activePage];
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activePage, highlightedEvidence]);

  return (
    <main
      ref={containerRef}
      className="flex-1 bg-[#f3f3f0] overflow-y-auto p-6 md:p-10 flex flex-col items-center select-text"
      tabIndex={0}
      aria-label="Document Content Canvas"
    >
      {/* Evidence Target Banner if active */}
      {highlightedEvidence && (
        <div className="sticky top-0 z-10 w-full max-w-3xl mb-6 bg-[#fffbeb] border border-[#fde68a] text-[#92400e] p-3 rounded-sm shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#d97706] shrink-0" />
            <span>
              <strong className="font-semibold">Source Anchor:</strong> Page {highlightedEvidence.page}
              {highlightedEvidence.section ? ` · ${highlightedEvidence.section}` : ''}
              {highlightedEvidence.verified && ' (Verified Grounding 100%)'}
            </span>
          </div>
          {onClearHighlight && (
            <button
              onClick={onClearHighlight}
              className="text-xs text-[#92400e] hover:text-[#191919] font-medium cursor-pointer underline"
            >
              Clear Focus
            </button>
          )}
        </div>
      )}

      {/* Pages Canvas */}
      <div className="w-full max-w-3xl space-y-10">
        {document.pages.map((page) => {
          const isTargetPage = highlightedEvidence?.page === page.page_number;

          return (
            <article
              key={page.page_number}
              ref={(el) => {
                pageRefs.current[page.page_number] = el;
              }}
              id={`page-${page.page_number}`}
              className={`bg-white border rounded-xs p-10 md:p-16 shadow-xs transition-shadow ${
                isTargetPage
                  ? 'border-[#8a6a24] ring-2 ring-[#fde68a]'
                  : 'border-[#e5e5e0]'
              }`}
              aria-label={`Page ${page.page_number}`}
            >
              {/* Page Running Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#f3f3f0] mb-8 text-[11px] font-mono-legal text-[#82827c] select-none uppercase tracking-wider">
                <span>{document.metadata.filename}</span>
                <span>
                  Page {page.page_number} of {document.pages.length}
                </span>
              </div>

              {/* Page Text Body */}
              <div className="font-document text-[#191919] text-[15px] leading-[1.8] whitespace-pre-wrap">
                {page.sections.length > 0 ? (
                  page.sections.map((sec) => {
                    const isSecHighlighted =
                      highlightedEvidence &&
                      isTargetPage &&
                      ((sec.heading && highlightedEvidence.section?.includes(sec.heading)) ||
                        (sec.clause_number && highlightedEvidence.clause_number === sec.clause_number) ||
                        (sec.text && highlightedEvidence.source_text && sec.text.includes(highlightedEvidence.source_text.slice(0, 40))));

                    return (
                      <section
                        key={sec.section_id}
                        id={sec.section_id}
                        className={`mb-6 p-2 rounded-xs transition-colors ${
                          isSecHighlighted
                            ? 'bg-[#fffbeb] border-l-4 border-[#d97706] pl-3'
                            : ''
                        }`}
                      >
                        {sec.heading && (
                          <h3 className="font-serif font-bold text-sm tracking-tight text-[#191919] mb-2 uppercase text-[13px] border-b border-[#f3f3f0] pb-1">
                            {sec.heading}
                          </h3>
                        )}
                        <p className="m-0">{sec.text}</p>
                      </section>
                    );
                  })
                ) : (
                  <div>{page.text}</div>
                )}
              </div>

              {/* Page Footer Rule */}
              <div className="mt-12 pt-4 border-t border-[#f3f3f0] text-center text-[10px] font-mono-legal text-[#82827c] select-none">
                - {page.page_number} -
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
};
