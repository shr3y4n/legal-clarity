import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, X, Shield, Lock } from 'lucide-react';
import { uploadDocument } from '../lib/api';
import { Document } from '../types/document';

interface DocumentUploadProps {
  onSuccess: (doc: Document) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onSuccess,
  onCancel,
  isModal = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    const validExtensions = ['.pdf', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      setError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum allowed upload size of 15MB.');
      return;
    }

    if (file.size === 0) {
      setError('The selected file is completely empty.');
      return;
    }

    setIsUploading(true);
    try {
      const doc = await uploadDocument(file);
      onSuccess(doc);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and parse document. Please ensure the file is not corrupted.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const loadPreset = (presetName: string) => {
    let content = '';
    let filename = '';

    if (presetName === 'lease') {
      filename = 'residential_lease_agreement.txt';
      content = `RESIDENTIAL LEASE AGREEMENT
Oakridge Properties LLC (Landlord) and Alex Mercer (Tenant). Dated June 1, 2025.

SECTION 1.0 PREMISES AND TERM
Landlord hereby leases to Tenant the premises at 742 Evergreen Terrace, Unit 4B. The term shall be twelve (12) months starting July 1, 2025.

SECTION 2.0 RENT PAYMENT AND SECURITY DEPOSIT
Monthly rent shall be $2,400.00, payable on the first day of each calendar month. A refundable security deposit of $2,400.00 is due upon signing.

SECTION 3.0 NOTICE AND TERMINATION
Either party may elect not to renew by providing at least thirty (30) days prior written notice. Early termination without cause incurs liquidated damages equal to two (2) months rent.

SECTION 4.0 PET RESTRICTIONS AND INDEMNITY
No pets of any kind are permitted without written landlord approval. Tenant agrees to indemnify and hold harmless the Landlord from all claims arising on the premises.

SECTION 5.0 GOVERNING LAW
Governed by the laws of the State of Illinois.`;
    } else if (presetName === 'nda') {
      filename = 'mutual_non_disclosure_agreement.txt';
      content = `MUTUAL NON-DISCLOSURE AGREEMENT
Entered into between Apex Labs Inc. and Beacon Ventures LLC. Dated January 10, 2025.

SECTION 1.0 CONFIDENTIAL INFORMATION
Confidential Information includes all proprietary software code, customer lists, and financial projections.

SECTION 2.0 TERM OF OBLIGATION
Confidentiality obligations shall continue in effect for a period of two (2) years following the date of disclosure.

SECTION 3.0 RETURN AND DESTRUCTION
Recipient shall return or certified-destroy all materials within fourteen (14) days of receiving written notice.

SECTION 4.0 LIQUIDATED DAMAGES AND REMEDIES
Breach of this agreement shall result in immediate irreparable harm entitling Discloser to preliminary injunctive relief without bond.

SECTION 5.0 JURISDICTION
Governed by the laws of Delaware.`;
    }

    const file = new File([content], filename, { type: 'text/plain' });
    processFile(file);
  };

  return (
    <div className={`bg-white border border-[#e5e5e0] rounded-sm p-6 max-w-xl mx-auto ${isModal ? 'shadow-lg' : 'shadow-xs'}`}>
      <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e0] mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#191919] m-0">Upload Legal Document</h2>
          <p className="text-xs text-[#82827c] m-0">Supported formats: PDF, DOCX, TXT · Max size: 15MB</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[#82827c] hover:text-[#191919] p-1 cursor-pointer rounded-xs"
            aria-label="Close upload dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-sm text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-tight">{error}</div>
        </div>
      )}

      {/* Drag & Drop Surface */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Click or drag file to upload"
        className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors outline-hidden ${
          isDragging
            ? 'border-[#1d3557] bg-[#f0f4f8]'
            : 'border-[#c8c8c0] hover:border-[#82827c] bg-[#fafaf8]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#f3f3f0] flex items-center justify-center text-[#585854]">
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-[#1d3557] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <div className="text-sm font-medium text-[#191919]">
            {isUploading ? 'Extracting & Grounding Structure...' : 'Choose a file or drag & drop here'}
          </div>
          <div className="text-xs text-[#82827c]">PDF, DOCX, or TXT up to 15MB</div>
        </div>
      </div>

      {/* Presets for quick evaluation */}
      <div className="mt-4 pt-4 border-t border-[#e5e5e0]">
        <div className="text-xs font-semibold text-[#585854] mb-2 uppercase tracking-wider">
          Quick Test Sample Agreements
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadPreset('lease')}
            disabled={isUploading}
            className="flex-1 px-3 py-2 text-xs border border-[#e5e5e0] hover:border-[#1d3557] bg-[#f9f9fb] hover:bg-white text-[#191919] rounded-sm text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FileText className="w-4 h-4 text-[#1d3557]" />
            <div>
              <div className="font-medium">Residential Lease</div>
              <div className="text-[11px] text-[#82827c]">Rent, deposit, termination</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => loadPreset('nda')}
            disabled={isUploading}
            className="flex-1 px-3 py-2 text-xs border border-[#e5e5e0] hover:border-[#1d3557] bg-[#f9f9fb] hover:bg-white text-[#191919] rounded-sm text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FileText className="w-4 h-4 text-[#1d3557]" />
            <div>
              <div className="font-medium">Mutual NDA</div>
              <div className="text-[11px] text-[#82827c]">2-year term, return clause</div>
            </div>
          </button>
        </div>
      </div>

      {/* Security & Privacy Notice */}
      <div className="mt-4 p-3 bg-[#f3f3f0] border border-[#e5e5e0] rounded-sm text-xs text-[#585854] flex items-start gap-2">
        <Lock className="w-4 h-4 text-[#1d3557] shrink-0 mt-0.5" />
        <div className="leading-tight">
          <span className="font-semibold text-[#191919]">Privacy Guarantee:</span> Uploaded documents are processed ephemerally in volatile memory. No raw document text is permanently written to disk or recorded in logs.
        </div>
      </div>
    </div>
  );
};
