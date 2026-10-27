import React, { useState, useEffect } from 'react';
import { X, Plus, Shield, CheckCircle2, Building2, User, FileText, AlertTriangle, UploadCloud, Link as LinkIcon, Sparkles } from 'lucide-react';
import { api, sanitizePii } from '../services/api';
import { INITIAL_INSTITUTIONS } from '../services/seedData';
import { BureauType, Complaint, DuplicateWarning } from '../types';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCase?: Complaint) => void;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedInstPid, setSelectedInstPid] = useState(INITIAL_INSTITUTIONS[0].pid);
  const [bureau, setBureau] = useState<BureauType>('PGRC');
  const [complainantType, setComplainantType] = useState('Student');
  const [category, setCategory] = useState('Fee Dispute');
  const [governingPolicy, setGoverningPolicy] = useState('APH 2024-27 (Clause 13.4 - Fee Refund & Caution Deposit Restitution)');
  const [confidentialFromInstitution, setConfidentialFromInstitution] = useState(true);
  const [shareWithCoordinatingBureaus, setShareWithCoordinatingBureaus] = useState(true);
  const [subject, setSubject] = useState('');
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [ocrFileName, setOcrFileName] = useState<string | null>(null);
  const [ocrHash, setOcrHash] = useState<string | null>(null);

  // Debounced real-time duplicate check (400ms)
  useEffect(() => {
    if (rawText.trim().length < 15) {
      setDuplicateWarnings([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        const warnings = await api.checkDuplicateFiling(rawText, category, selectedInstPid);
        setDuplicateWarnings(warnings);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [rawText, category, selectedInstPid]);

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingOcr(true);
    try {
      const res = await api.extractOcr(file);
      setOcrFileName(file.name);
      setOcrHash(res.sha256);
      if (res.extracted_text) {
        setRawText(prev => prev ? `${prev}\n\n[ATTACHMENT EXTRACT: ${file.name}]\n${res.extracted_text}` : res.extracted_text);
      }
    } finally {
      setIsExtractingOcr(false);
    }
  };

  const CATEGORY_TO_POLICY: Record<string, string> = {
    'Fee Dispute': 'APH 2024-27 (Clause 13.4 - Fee Refund & Caution Deposit Restitution)',
    'Document Withholding': 'APH 2024-27 (Clause 14.1 - Retention of Certificates Prohibited)',
    'Infrastructure': 'APH 2024-27 (Clause 6.3 - Essential Infrastructure & Lab Standards)',
    'Admission Anomaly': 'APH 2024-27 (Clause 8.2 - Approved Intake & Supernumerary Limits)'
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (CATEGORY_TO_POLICY[newCat]) {
      setGoverningPolicy(CATEGORY_TO_POLICY[newCat]);
    }
  };

  if (!isOpen) return null;

  const currentInst = INITIAL_INSTITUTIONS.find(i => i.pid === selectedInstPid) || INITIAL_INSTITUTIONS[0];
  const liveSanitized = sanitizePii(rawText);
  const piiDetected = liveSanitized !== rawText;

  // Clean bureau code abbreviation: RO, RB, PGRC
  const getBureauAbbr = (b: BureauType) => {
    if (b === 'REGIONAL_OFFICE') return 'RO';
    if (b === 'REGULATION_BUREAU') return 'RB';
    return 'PGRC';
  };

  const isSubjectValid = subject.trim().length >= 6;
  const isNarrativeValid = rawText.trim().length >= 15;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubjectValid || !isNarrativeValid) return;

    setIsSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const seq = Math.floor(100 + Math.random() * 900);
      const generatedCleanId = `CMP-${year}-${getBureauAbbr(bureau)}-${seq}`;

      const newCase = await api.createCase({
        id: generatedCleanId,
        institutionPid: currentInst.pid,
        institutionName: currentInst.name,
        sourceBureau: bureau,
        complainantType,
        category,
        subject,
        complaintText: rawText,
        region: currentInst.region,
        confidentialFromInstitution,
        shareWithCoordinatingBureaus,
        governingPolicyVersion: governingPolicy.split(' (')[0],
        governingPolicyClause: governingPolicy.includes('Clause') ? governingPolicy.split('(')[1].replace(')', '') : 'Clause 13.4'
      } as any);

      onSuccess(newCase);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Register New Grievance / Regulatory Case</h3>
              <p className="text-xs text-slate-400">
                Air-gapped automatic PII sanitization &amp; Genesis SHA-256 block creation.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar max-h-[calc(90vh-130px)]">
          
          {/* Institution Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Registered AICTE Institution:</label>
            <select
              value={selectedInstPid}
              onChange={(e) => setSelectedInstPid(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              {INITIAL_INSTITUTIONS.map((inst) => (
                <option key={inst.pid} value={inst.pid}>
                  {inst.name} (PID: {inst.pid} - {inst.region})
                </option>
              ))}
            </select>
          </div>

          {/* Bureau & Origin Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Bureau:</label>
              <select
                value={bureau}
                onChange={(e) => setBureau(e.target.value as BureauType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="PGRC">PGRC</option>
                <option value="REGULATION_BUREAU">Regulation Bureau</option>
                <option value="REGIONAL_OFFICE">Regional Office</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Complainant Type:</label>
              <select
                value={complainantType}
                onChange={(e) => setComplainantType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
                <option value="Parent">Parent</option>
                <option value="Public">Public</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category:</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Fee Dispute">Fee Dispute</option>
                <option value="Document Withholding">Document Withholding</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Admission Anomaly">Admission Anomaly</option>
              </select>
            </div>
          </div>

          {/* Novelty 8: Policy-Version-Aware Handbook Edition */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Governing AICTE Approval Process Handbook (APH) Version:</label>
            <select
              value={governingPolicy}
              onChange={(e) => setGoverningPolicy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="APH 2024-27 (Clause 13.4 - Fee Refund & Caution Deposit Restitution)">APH 2024-27 (Clause 13.4 - Fee Refund &amp; Caution Deposit Restitution)</option>
              <option value="APH 2024-27 (Clause 14.1 - Retention of Certificates Prohibited)">APH 2024-27 (Clause 14.1 - Retention of Certificates Prohibited)</option>
              <option value="APH 2024-27 (Clause 6.3 - Essential Infrastructure & Lab Standards)">APH 2024-27 (Clause 6.3 - Essential Infrastructure &amp; Lab Standards)</option>
              <option value="APH 2024-27 (Clause 8.2 - Approved Intake & Supernumerary Limits)">APH 2024-27 (Clause 8.2 - Approved Intake &amp; Supernumerary Limits)</option>
            </select>
          </div>


          {/* Novelty 9: Complainant-Controlled Identity Disclosure */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Complainant Identity Confidentiality Toggles
            </label>
            
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={confidentialFromInstitution}
                onChange={(e) => setConfidentialFromInstitution(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Keep identity strictly confidential from Institution (Redact name/phone to prevent victimization)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shareWithCoordinatingBureaus}
                onChange={(e) => setShareWithCoordinatingBureaus(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Authorize identity sharing with coordinating AICTE Bureaus during Joint Inquiry</span>
            </label>
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Subject / Summary:</label>
              <span className={`text-[10px] font-mono ${isSubjectValid ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {subject.trim().length} / 6 min chars
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Fee Refund Refusal for 2025-26 Academic Year"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            {subject.trim().length > 0 && !isSubjectValid && (
              <p className="text-[10px] text-amber-400 mt-1">Minimum 6 characters required (prevent single-word summaries like &ldquo;test&rdquo;).</p>
            )}
          </div>

          {/* Complaint Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Detailed Complaint Narrative:</label>
              <div className="flex items-center gap-2">
                {piiDetected && (
                  <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Live PII Redactor Active
                  </span>
                )}
                <span className={`text-[10px] font-mono ${isNarrativeValid ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  {rawText.trim().length} / 15 min chars
                </span>
              </div>
            </div>
            <textarea
              required
              rows={3}
              placeholder="Describe full complaint details (Phone numbers, Aadhaar IDs, and emails will be automatically sanitized)..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-sans"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Provide sufficient factual narrative for local NLP embedding and PII masking.
            </p>
            {rawText.trim().length > 0 && !isNarrativeValid && (
              <p className="text-[10px] text-amber-400 mt-0.5">Need at least 15 characters to enable local air-gapped similarity indexing.</p>
            )}
          </div>

          {/* Live Sanitization Preview */}
          {rawText.trim().length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Air-Gapped Sanitized Text Preview:</p>
              <div className="max-h-24 overflow-y-auto text-slate-300 font-mono text-[11px] leading-relaxed break-words custom-scrollbar pr-1">
                {liveSanitized}
              </div>
            </div>
          )}

          {/* Item 14: Real-Time Duplicate Warning Banner */}
          {duplicateWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{duplicateWarnings.length} Potential Cross-Bureau Duplicate{duplicateWarnings.length > 1 ? 's' : ''} Detected</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded">
                  Max Match: {duplicateWarnings[0].similarityPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Review existing active cases to avoid redundant registrations across coordinating bureaus:
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {duplicateWarnings.map(dw => (
                  <div key={dw.caseId} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{dw.caseId}</span>
                      <span className="text-slate-300 font-medium truncate max-w-[200px]">{dw.title}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{dw.bureau}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 shrink-0">{dw.similarityPercent}% match</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item 17: OCR Attachment Upload */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                Upload Grievance Attachment / Evidence (PDF / Image)
              </label>
              {isExtractingOcr && (
                <span className="text-[10px] text-blue-400 font-mono animate-pulse">Running Air-Gapped OCR...</span>
              )}
            </div>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleOcrUpload}
              className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
            />
            {ocrFileName && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 pt-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Extracted: {ocrFileName} &bull; SHA-256: {ocrHash?.slice(0, 16)}...</span>
              </div>
            )}
          </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-800 bg-slate-900 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isSubjectValid || !isNarrativeValid}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/25 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Case & Sign Genesis Block'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
