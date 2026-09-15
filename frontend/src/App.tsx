import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { DocumentNav } from './components/DocumentNav';
import { DocumentCanvas } from './components/DocumentCanvas';
import { DocumentUpload } from './components/DocumentUpload';
import { EvidenceModal } from './components/EvidenceModal';
import { UnderstandPanel } from './components/panels/UnderstandPanel';
import { ReviewPanel } from './components/panels/ReviewPanel';
import { AskPanel } from './components/panels/AskPanel';
import { ComparePanel } from './components/panels/ComparePanel';
import { ChecklistPanel } from './components/panels/ChecklistPanel';
import { LawyerPrepPanel } from './components/panels/LawyerPrepPanel';
import {
  checkReadiness,
  getChecklist,
  getLawyerPrep,
  getReview,
  getUnderstanding,
  listDocuments,
  getDocument,
} from './lib/api';
import {
  ActiveTab,
  Document,
  DocumentChecklist,
  DocumentReviewResponse,
  DocumentUnderstanding,
  Evidence,
  LawyerPrepResponse,
} from './types/document';

export const App: React.FC = () => {
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('understand');
  const [activePage, setActivePage] = useState<number>(1);
  const [highlightedEvidence, setHighlightedEvidence] = useState<Evidence | null>(null);
  const [selectedEvidenceModal, setSelectedEvidenceModal] = useState<Evidence | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string; isBackend?: boolean }>({
    provider: 'demo',
    model: 'deterministic-browser-engine',
    isBackend: false,
  });

  // Cached analysis state
  const [understanding, setUnderstanding] = useState<DocumentUnderstanding | null>(null);
  const [review, setReview] = useState<DocumentReviewResponse | null>(null);
  const [checklist, setChecklist] = useState<DocumentChecklist | null>(null);
  const [lawyerPrep, setLawyerPrep] = useState<LawyerPrepResponse | null>(null);

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);

  const loadProviderInfo = () => {
    checkReadiness()
      .then((ready) => {
        setProviderInfo({ provider: ready.provider, model: ready.model, isBackend: ready.isBackend });
      })
      .catch(() => {});
  };

  // Initialize readiness
  useEffect(() => {
    loadProviderInfo();

    // Try to load any existing document in memory
    listDocuments().then(async (docs) => {
      if (docs.length > 0) {
        try {
          const doc = await getDocument(docs[0].document_id);
          setCurrentDocument(doc);
        } catch {
          // Document not in store
        }
      }
    });
  }, []);

  // Fetch analysis when document or tab changes
  useEffect(() => {
    if (!currentDocument) return;

    const docId = currentDocument.metadata.document_id;
    setIsLoadingAnalysis(true);

    if (activeTab === 'understand' && !understanding) {
      getUnderstanding(docId)
        .then(setUnderstanding)
        .finally(() => setIsLoadingAnalysis(false));
    } else if (activeTab === 'review' && !review) {
      getReview(docId)
        .then(setReview)
        .finally(() => setIsLoadingAnalysis(false));
    } else if (activeTab === 'checklist' && !checklist) {
      getChecklist(docId)
        .then(setChecklist)
        .finally(() => setIsLoadingAnalysis(false));
    } else if (activeTab === 'lawyer-prep' && !lawyerPrep) {
      getLawyerPrep(docId)
        .then(setLawyerPrep)
        .finally(() => setIsLoadingAnalysis(false));
    } else {
      setIsLoadingAnalysis(false);
    }
  }, [currentDocument, activeTab, understanding, review, checklist, lawyerPrep]);

  const handleDocumentLoaded = (doc: Document) => {
    setCurrentDocument(doc);
    setActivePage(1);
    setHighlightedEvidence(null);
    setUnderstanding(null);
    setReview(null);
    setChecklist(null);
    setLawyerPrep(null);
    setShowUploadModal(false);
    setActiveTab('understand');
  };

  const handleSelectEvidence = (ev: Evidence) => {
    setHighlightedEvidence(ev);
    setSelectedEvidenceModal(ev);
    setActivePage(ev.page);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8f8f6] text-[#191919]">
      {/* Header */}
      <Header
        currentDocument={currentDocument ? currentDocument.metadata : null}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setShowUploadModal(true)}
        isDemo={providerInfo.provider === 'demo'}
        providerInfo={providerInfo}
        onRefreshProvider={loadProviderInfo}
      />

      {/* Main Content Area */}
      {!currentDocument ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <DocumentUpload onSuccess={handleDocumentLoaded} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Rail: Document Navigator & Outline */}
          <DocumentNav
            document={currentDocument}
            activePage={activePage}
            onSelectPage={setActivePage}
            onSelectClause={() => {}}
          />

          {/* Center Canvas: Paper Document Viewer */}
          <DocumentCanvas
            document={currentDocument}
            activePage={activePage}
            highlightedEvidence={highlightedEvidence}
            onClearHighlight={() => setHighlightedEvidence(null)}
          />

          {/* Right Panel: Contextual Analysis Tools */}
          <aside
            className="w-96 lg:w-[440px] bg-[#f8f8f6] border-l border-[#e5e5e0] flex flex-col h-full overflow-hidden select-text"
            role="region"
            aria-label="Document Analysis Panel"
          >
            {activeTab === 'understand' && (
              <UnderstandPanel
                understanding={understanding}
                isLoading={isLoadingAnalysis}
                onSelectEvidence={handleSelectEvidence}
              />
            )}

            {activeTab === 'review' && (
              <ReviewPanel
                reviewData={review}
                isLoading={isLoadingAnalysis}
                onSelectEvidence={handleSelectEvidence}
              />
            )}

            {activeTab === 'ask' && (
              <AskPanel
                documentId={currentDocument.metadata.document_id}
                onSelectEvidence={handleSelectEvidence}
              />
            )}

            {activeTab === 'compare' && (
              <ComparePanel
                currentDocId={currentDocument.metadata.document_id}
                onSelectEvidence={handleSelectEvidence}
              />
            )}

            {activeTab === 'checklist' && (
              <ChecklistPanel
                checklist={checklist}
                isLoading={isLoadingAnalysis}
                onSelectEvidence={handleSelectEvidence}
              />
            )}

            {activeTab === 'lawyer-prep' && (
              <LawyerPrepPanel
                prepData={lawyerPrep}
                isLoading={isLoadingAnalysis}
                onSelectEvidence={handleSelectEvidence}
              />
            )}
          </aside>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        >
          <DocumentUpload
            onSuccess={handleDocumentLoaded}
            onCancel={() => setShowUploadModal(false)}
            isModal={true}
          />
        </div>
      )}

      {/* Evidence Inspection Modal */}
      <EvidenceModal
        evidence={selectedEvidenceModal}
        onClose={() => setSelectedEvidenceModal(null)}
        onJumpToPage={(p) => setActivePage(p)}
      />
    </div>
  );
};
export default App;
