import React, { useState } from 'react';
import { X, Key, ShieldCheck, Check, Trash2, Cpu } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChanged: () => void;
  providerInfo: { provider: string; model: string; isBackend?: boolean };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onProviderChanged,
}) => {
  const [apiKey, setApiKey] = useState(getStoredApiKey() || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(apiKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onProviderChanged();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setApiKey('');
    setStoredApiKey('');
    onProviderChanged();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-2xs"
    >
      <div className="bg-white border border-[#e5e5e0] rounded-sm p-6 max-w-md w-full shadow-xl text-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#1d3557]" />
            <h2 className="text-sm font-semibold text-[#191919] m-0">Intelligence Engine Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#82827c] hover:text-[#191919] p-1 cursor-pointer rounded-xs"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Engine Card */}
        <div className="p-3.5 bg-[#f8f8f6] border border-[#e5e5e0] rounded-sm space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#585854]">
            Active Intelligence Engine
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#191919]">
              Google Gemini 2.5 Flash-Lite
            </span>
            <span className="px-2 py-0.5 rounded-xs border text-[10px] font-semibold uppercase bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]">
              Active & Verified
            </span>
          </div>
          <div className="text-[11px] text-[#585854] leading-relaxed">
            A production Google Gemini API key is configured by the developer. All contract questions and analysis are actively grounded against document text.
          </div>
        </div>

        {/* Gemini API Key Override Configuration */}
        <div className="space-y-2">
          <label className="block font-semibold text-[#191919] text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#1d3557]" />
              Custom Gemini API Key (Optional Override)
            </span>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[#991b1b] hover:underline font-normal text-[11px] flex items-center gap-0.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Reset to Default
              </button>
            )}
          </label>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Default key active (or paste custom key)..."
            className="w-full px-3 py-2 bg-[#f8f8f6] border border-[#e5e5e0] rounded-sm text-xs text-[#191919] font-mono-legal focus:bg-white focus:outline-hidden focus:border-[#1d3557]"
          />

          <p className="text-[11px] text-[#82827c] m-0 leading-relaxed">
            Leave blank to use the developer-configured Gemini key. If you wish to use your own Google Cloud project quota, enter your key above.
          </p>
        </div>

        {/* Confidentiality & Security Notice */}
        <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-sm text-[11px] text-[#166534] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <strong>Client-Side Confidentiality:</strong> API calls and document queries are transmitted directly to Google's official Gemini endpoint. No contract content or keys are saved on intermediate servers.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e5e0]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#585854] hover:text-[#191919] border border-[#e5e5e0] rounded-sm cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-[#1d3557] hover:bg-[#14263f] text-white rounded-sm cursor-pointer flex items-center gap-1 transition-colors"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Saved!
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
