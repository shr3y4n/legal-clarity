import React, { useEffect, useState } from 'react';
import { GitCompare, ArrowRight, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { compareDocuments, listDocuments } from '../../lib/api';
import { ChangeClassification, Comparison, DocumentMetadata, Evidence } from '../../types/document';

interface ComparePanelProps {
  currentDocId: string | null;
  onSelectEvidence: (ev: Evidence) => void;
}

export const ComparePanel: React.FC<ComparePanelProps> = ({ currentDocId, onSelectEvidence }) => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocB, setSelectedDocB] = useState<string>('');
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments().then((docs) => {
      setDocuments(docs);
      const other = docs.find((d) => d.document_id !== currentDocId);
      if (other) {
        setSelectedDocB(other.document_id);
      }
    });
  }, [currentDocId]);

  const handleCompare = async () => {
    if (!currentDocId || !selectedDocB) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await compareDocuments(currentDocId, selectedDocB);
      setComparison(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const getClassificationBadge = (cls: ChangeClassification) => {
    switch (cls) {
      case 'material':
        return 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]';
      case 'potentially important':
        return 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]';
      case 'non-material':
        return 'bg-[#f3f3f0] text-[#585854] border-[#e5e5e0]';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Selector Header */}
      <div className="p-4 bg-white border-b border-[#e5e5e0] space-y-3 shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#191919] m-0 flex items-center gap-1.5">
          <GitCompare className="w-3.5 h-3.5 text-[#1d3557]" />
          Semantic Document Comparison
        </h3>

        <div className="flex items-center gap-2">
          <select
            value={selectedDocB}
            onChange={(e) => setSelectedDocB(e.target.value)}
            disabled={isLoading || documents.length < 2}
            className="flex-1 px-2.5 py-1.5 bg-[#f8f8f6] border border-[#e5e5e0] rounded-sm text-xs text-[#191919] focus:bg-white focus:outline-hidden focus:border-[#1d3557]"
            aria-label="Select comparison document"
          >
            {documents.length < 2 && <option value="">Upload another document to compare</option>}
            {documents
              .filter((d) => d.document_id !== currentDocId)
              .map((d) => (
                <option key={d.document_id} value={d.document_id}>
                  {d.filename} ({d.page_count} pages)
                </option>
              ))}
          </select>

          <button
            onClick={handleCompare}
            disabled={isLoading || !selectedDocB || documents.length < 2}
            className="px-3 py-1.5 bg-[#1d3557] hover:bg-[#14263f] text-white rounded-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Comparing...' : 'Run Diff'}
          </button>
        </div>

        {error && (
          <div role="alert" className="p-2 bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] rounded-xs text-[11px]">
            {error}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!comparison ? (
          <div className="p-8 text-center text-[#82827c] space-y-2">
            <GitCompare className="w-8 h-8 mx-auto text-[#c8c8c0]" />
            <p className="m-0 font-medium text-[#585854]">No comparison performed yet</p>
            <p className="text-[11px] m-0">Select another document version and click Run Diff to identify material meaning shifts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overview Card */}
            <div className="p-3.5 bg-white border border-[#e5e5e0] rounded-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#82827c]">
                <span>Base: <strong className="text-[#191919]">{comparison.doc_a_name}</strong></span>
                <ArrowRight className="w-3 h-3 text-[#82827c]" />
                <span>Target: <strong className="text-[#191919]">{comparison.doc_b_name}</strong></span>
              </div>
              <p className="m-0 font-medium text-[#191919] leading-snug">{comparison.summary_of_differences}</p>

              {/* Classification Summary Badges */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#f3f3f0]">
                <span className="px-2 py-0.5 rounded-xs bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] font-semibold text-[10px]">
                  {comparison.material_count} Material
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-[#fffbeb] border border-[#fde68a] text-[#92400e] font-semibold text-[10px]">
                  {comparison.potentially_important_count} Potentially Important
                </span>
                <span className="px-2 py-0.5 rounded-xs bg-[#f3f3f0] border border-[#e5e5e0] text-[#585854] font-semibold text-[10px]">
                  {comparison.non_material_count} Non-Material
                </span>
              </div>
            </div>

            {/* Changes Feed */}
            {comparison.changes.map((change) => (
              <div
                key={change.change_id}
                className="p-4 bg-white border border-[#e5e5e0] rounded-sm space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#191919] text-xs">{change.category}</span>
                  <span
                    className={`px-2 py-0.5 rounded-xs border text-[10px] font-semibold uppercase tracking-wider ${getClassificationBadge(
                      change.classification
                    )}`}
                  >
                    {change.classification}
                  </span>
                </div>

                {/* Plain Meaning Explanation */}
                <p className="m-0 text-[#191919] leading-relaxed">{change.plain_meaning_explanation}</p>

                {/* Side-by-side Evidence Diffs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#f3f3f0]">
                  {/* OLD */}
                  <div className="p-2.5 bg-[#fafaf8] border border-[#e5e5e0] rounded-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#82827c] font-mono-legal uppercase">
                      <span>Document A (Old)</span>
                      {change.old_evidence && <span>Page {change.old_evidence.page}</span>}
                    </div>
                    <div className="font-document text-[12px] italic text-[#585854] line-clamp-3">
                      {change.old_evidence ? `"${change.old_evidence.source_text}"` : 'Not present in Document A'}
                    </div>
                  </div>

                  {/* NEW */}
                  <div className="p-2.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#166534] font-mono-legal uppercase">
                      <span>Document B (New)</span>
                      {change.new_evidence && <span>Page {change.new_evidence.page}</span>}
                    </div>
                    <div className="font-document text-[12px] italic text-[#14532d] line-clamp-3">
                      {change.new_evidence ? `"${change.new_evidence.source_text}"` : 'Removed in Document B'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
