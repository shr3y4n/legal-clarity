import React, { useState } from 'react';
import { Send, AlertCircle, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react';
import { askDocument } from '../../lib/api';
import { Answer, Evidence } from '../../types/document';

interface AskPanelProps {
  documentId: string | null;
  onSelectEvidence: (ev: Evidence) => void;
}

interface MessageHistory {
  id: string;
  question: string;
  answer: Answer;
}

export const AskPanel: React.FC<AskPanelProps> = ({ documentId, onSelectEvidence }) => {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<MessageHistory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !question.trim() || isSubmitting) return;

    setError(null);
    const currentQ = question.trim();
    setQuestion('');
    setIsSubmitting(true);

    try {
      const answer = await askDocument(documentId, currentQ);
      setHistory((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          question: currentQ,
          answer,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to query document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Notice Banner */}
      <div className="p-3 bg-[#f8f8f6] border-b border-[#e5e5e0] text-[#585854] shrink-0 text-[11px] leading-snug">
        <strong className="text-[#191919]">Strict Grounding Policy:</strong> Responses are drawn solely from the text of this uploaded document. If an answer cannot be verified from the document, the system will explicitly refuse to guess.
      </div>

      {/* Query Form */}
      <div className="p-4 bg-white border-b border-[#e5e5e0] shrink-0">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question grounded in this document..."
              disabled={isSubmitting || !documentId}
              className="w-full pl-3 pr-10 py-2 text-xs bg-[#f8f8f6] border border-[#e5e5e0] rounded-sm text-[#191919] placeholder-[#82827c] focus:bg-white focus:outline-hidden focus:border-[#1d3557] disabled:opacity-60"
              aria-label="Ask a question about this document"
            />
            <button
              type="submit"
              disabled={isSubmitting || !question.trim() || !documentId}
              className="absolute right-2 top-2 text-[#1d3557] hover:text-[#14263f] disabled:text-[#c8c8c0] cursor-pointer disabled:cursor-not-allowed p-0.5"
              aria-label="Submit question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#82827c]">
            <span>Press Enter to send</span>
            {isSubmitting && (
              <span className="flex items-center gap-1 text-[#1d3557]" aria-live="polite">
                <span className="w-2.5 h-2.5 border border-[#1d3557] border-t-transparent rounded-full animate-spin" />
                Retrieving verified context...
              </span>
            )}
          </div>
        </form>

        {error && (
          <div role="alert" className="mt-2 p-2 bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] rounded-xs text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Q&A Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
        {history.length === 0 ? (
          <div className="p-8 text-center text-[#82827c] space-y-3">
            <HelpCircle className="w-8 h-8 mx-auto text-[#c8c8c0]" />
            <div>
              <p className="font-medium text-[#585854] m-0">No questions asked yet</p>
              <p className="text-[11px] m-0 mt-1">Try querying notice periods, deposits, termination rules, or compensation.</p>
            </div>
          </div>
        ) : (
          history.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {/* Question */}
              <div className="p-3 bg-[#f3f3f0] border border-[#e5e5e0] rounded-sm text-[#191919] font-medium">
                {msg.question}
              </div>

              {/* Answer Card */}
              <div
                className={`p-4 rounded-sm border space-y-3 ${
                  msg.answer.is_supported
                    ? 'bg-white border-[#e5e5e0] shadow-xs'
                    : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                }`}
              >
                {/* Status Indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-xs border ${
                      msg.answer.is_supported
                        ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
                        : 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                    }`}
                  >
                    {msg.answer.is_supported ? (
                      <>
                        <ShieldCheck className="w-3 h-3" />
                        Supported by Document Evidence
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Document Does Not Establish Answer
                      </>
                    )}
                  </span>

                  {msg.answer.is_supported ? (
                    msg.answer.is_demo ? (
                      <span className="text-[10px] font-mono-legal text-[#166534] bg-[#f0fdf4] px-1.5 py-0.5 rounded-xs border border-[#bbf7d0]">
                        Deterministic Engine
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono-legal text-[#1e40af] bg-[#eff6ff] px-1.5 py-0.5 rounded-xs border border-[#bfdbfe]">
                        Gemini Verified
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-mono-legal text-[#991b1b] bg-[#fef2f2] px-1.5 py-0.5 rounded-xs border border-[#fecaca]">
                      Strict Grounding Refusal
                    </span>
                  )}
                </div>

                {/* Answer Text */}
                <p className="text-xs text-[#191919] leading-relaxed m-0">{msg.answer.answer_text}</p>

                {/* Grounding Evidence Anchor */}
                {msg.answer.is_supported && (msg.answer.citations?.length || msg.answer.evidence?.length) && (
                  (() => {
                    const citList = (msg.answer.citations && msg.answer.citations.length > 0)
                      ? msg.answer.citations
                      : msg.answer.evidence;
                    const cit = citList[0];
                    if (!cit || !cit.source_text) return null;

                    return (
                      <div className="pt-2.5 border-t border-[#e5e5e0] space-y-2">
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <div className="flex items-center gap-1.5 font-medium text-[#191919] min-w-0">
                            <span className="font-semibold text-[#1d3557]">Source:</span>
                            {cit.clause_number && (
                              <span className="font-semibold text-[#191919]">Clause {cit.clause_number}</span>
                            )}
                            {cit.clause_number && cit.section && <span className="text-[#82827c]">·</span>}
                            {cit.section && (
                              <span className="truncate max-w-[180px] text-[#585854]" title={cit.section}>
                                {cit.section}
                              </span>
                            )}
                            <span className="bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] px-1.5 py-0.5 rounded-xs text-[10px] font-mono-legal shrink-0">
                              Page {cit.page}
                            </span>
                          </div>
                          <button
                            onClick={() => onSelectEvidence(cit)}
                            className="inline-flex items-center gap-1 text-[#1d3557] hover:underline font-medium cursor-pointer shrink-0 text-[11px]"
                            title="Highlight and focus this exact clause in document"
                          >
                            <span>View in document</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <blockquote className="p-2.5 bg-[#f8f8f6] border-l-3 border-[#1d3557] rounded-r-xs font-document text-[12px] italic text-[#40403c] leading-relaxed m-0">
                          "{cit.source_text}"
                        </blockquote>
                      </div>
                    );
                  })()
                )}

                {/* Refusal Explanation if unsupported */}
                {!msg.answer.is_supported && msg.answer.refusal_reason && (
                  <div className="text-[11px] text-[#92400e] leading-snug">
                    <strong>Refusal Reason:</strong> {msg.answer.refusal_reason}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
