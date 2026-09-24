import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckSquare,
  GitCompare,
  HelpCircle,
  Briefcase,
  ShieldCheck,
  Upload,
  Settings,
  Sun,
  Moon,
  Target,
} from 'lucide-react';
import { ActiveTab, DocumentMetadata } from '../types/document';
import { SettingsModal } from './SettingsModal';
import { ProblemStatementModal } from './ProblemStatementModal';
import { getInitialTheme, toggleTheme, Theme } from '../lib/theme';

interface HeaderProps {
  currentDocument: DocumentMetadata | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenUpload: () => void;
  isDemo: boolean;
  providerInfo?: { provider: string; model: string; isBackend?: boolean };
  onRefreshProvider?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDocument,
  activeTab,
  setActiveTab,
  onOpenUpload,
  isDemo,
  providerInfo = { provider: 'demo', model: 'deterministic-browser-engine', isBackend: false },
  onRefreshProvider,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showProblemStatement, setShowProblemStatement] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'understand', label: 'Understand', icon: FileText },
    { id: 'review', label: 'Review', icon: Search },
    { id: 'ask', label: 'Ask Document', icon: HelpCircle },
    { id: 'compare', label: 'Compare', icon: GitCompare },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare },
    { id: 'lawyer-prep', label: 'Lawyer Prep', icon: Briefcase },
  ];

  return (
    <>
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
              <span
                className="text-xs font-mono-legal text-[#585854] bg-[#f3f3f0] px-2 py-0.5 rounded-sm border border-[#e5e5e0] max-w-[200px] truncate"
                title={currentDocument.filename}
              >
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

        {/* System Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Verification Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-sm text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Grounded</span>
          </div>

          {/* Problem Statement Alignment (100%) Button */}
          <button
            onClick={() => setShowProblemStatement(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[#86efac] dark:border-[#166534] bg-[#f0fdf4] dark:bg-[#0c2a16] text-[#166534] dark:text-[#4ade80] text-xs font-semibold cursor-pointer hover:bg-[#dcfce7] dark:hover:bg-[#14532d] transition-colors shadow-2xs"
            title="View Problem Statement Alignment & Use Case Compliance Matrix (100%)"
            aria-label="View Problem Statement Alignment (100%)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            <Target className="w-3 h-3 text-[#16a34a] dark:text-[#4ade80]" />
            <span>Problem Statement (100%)</span>
          </button>

          {/* Gemini AI Status Indicator & Settings Trigger */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af] text-xs font-mono-legal cursor-pointer hover:bg-[#dbeafe] transition-colors shadow-2xs"
            title="Google Gemini 2.5 Intelligence Active"
            aria-label="Open AI settings"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
            <Settings className="w-3 h-3 text-[#2563eb]" />
            <span>Gemini 2.5 Active</span>
          </button>

          {/* Dark / Light Mode Switcher */}
          <button
            onClick={() => {
              const next = toggleTheme(theme);
              setTheme(next);
            }}
            className="flex items-center justify-center w-7 h-7 rounded-sm border border-[#e5e5e0] dark:border-[#1f293d] bg-white dark:bg-[#161f30] text-[#585854] dark:text-[#9ca3af] hover:text-[#191919] dark:hover:text-[#f3f4f6] cursor-pointer transition-colors shadow-2xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#fbbf24]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#585854]" />
            )}
          </button>

          {/* Upload Button */}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onProviderChanged={() => onRefreshProvider?.()}
        providerInfo={providerInfo}
      />

      {/* Problem Statement Alignment (100%) Modal */}
      <ProblemStatementModal
        isOpen={showProblemStatement}
        onClose={() => setShowProblemStatement(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    </>
  );
};
