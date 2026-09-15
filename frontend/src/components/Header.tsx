import React from 'react';
import {
  FileText,
  Search,
  CheckSquare,
  GitCompare,
  HelpCircle,
  Briefcase,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { ActiveTab, DocumentMetadata } from '../types/document';

interface HeaderProps {
  currentDocument: DocumentMetadata | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  isDemo: boolean;
  providerInfo?: { provider: string; model: string };
}

export const Header: React.FC<HeaderProps> = ({
  currentDocument,
  activeTab,
  setActiveTab,
  onOpenUpload,
  isDemo,
  providerInfo,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'understand', label: 'Understand', icon: FileText },
    { id: 'review', label: 'Review', icon: Search },
    { id: 'ask', label: 'Ask Document', icon: HelpCircle },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'lawyer-prep', label: 'Lawyer Prep', icon: Briefcase },
  ];

  return (
    <header className="bg-white border-b border-[#e5e5e0] px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 select-none no-print">
      {/* Brand & Document Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1d3557] text-white flex items-center justify-center font-serif font-bold text-lg rounded-sm shadow-xs">
            §
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[#191919] m-0 leading-tight">
              Legal Clarity
            </h1>
            <p className="text-xs text-[#82827c] m-0">Evidence-Grounded Document Companion</p>
          </div>
        </div>

        {currentDocument && (
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#e5e5e0]">
            <span className="text-xs font-mono-legal text-[#585854] bg-[#f3f3f0] px-2 py-0.5 rounded-sm border border-[#e5e5e0] max-w-[200px] truncate" title={currentDocument.filename}>
              {currentDocument.filename}
            </span>
            <span className="text-xs text-[#82827c]">
              {currentDocument.page_count} {currentDocument.page_count === 1 ? 'page' : 'pages'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      {currentDocument && (
        <nav
          role="tablist"
          aria-label="Document views"
          className="flex items-center gap-1 bg-[#f3f3f0] p-1 rounded-sm border border-[#e5e5e0]"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#191919] shadow-xs font-semibold'
                    : 'text-[#585854] hover:text-[#191919] hover:bg-[#eaeae6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* System Status & Upload Action */}
      <div className="flex items-center gap-3">
        {/* Verification Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-sm text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Grounded</span>
        </div>

        {/* Demo Mode or Gemini badge */}
        <div
          className={`px-2 py-1 rounded-sm border text-xs font-mono-legal ${
            isDemo
              ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
              : 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]'
          }`}
          title={isDemo ? 'Offline deterministic mode enabled' : `Active model: ${providerInfo?.model || 'Gemini'}`}
        >
          {isDemo ? 'Demo Mode' : (providerInfo?.model || 'Gemini 2.0')}
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d3557] hover:bg-[#14263f] text-white text-xs font-medium rounded-sm cursor-pointer shadow-xs transition-colors"
          aria-label="Upload document"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
      </div>
    </header>
  );
};
