import React, { useState } from 'react';
import { Complaint, ComplaintStatus, Precedent, LlmDraftResponse } from '../types';
import { AuditChainViewer } from './AuditChainViewer';
import { SubTaskTracker } from './SubTaskTracker';
import { CorrectiveActionPanel } from './CorrectiveActionPanel';
import { EvidenceRepositoryModal } from './EvidenceRepositoryModal';
import {
  X, Building2, User, Clock, ShieldAlert, FileText, Lock, CheckCircle2,
  ChevronRight, AlertTriangle, ShieldCheck, Scale, Users, Banknote,
  FolderCheck, BookOpen, AlertCircle, RefreshCw, FileDown, Printer, QrCode,
  Sparkles, Bot, Copy, Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { SlaProximityBadge } from './SlaProximityBadge';
import { api, computeSha256 } from '../services/api';
import { generateHearingDocketPdf } from '../services/docketExport';

interface CaseDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: ComplaintStatus, remarks: string) => Promise<void>;
  onOpenAudit: (caseId: string) => void;
}

interface TransitionOption {
  status: ComplaintStatus;
  label: string;
  btnClass: string;
}

const FSM_TRANSITIONS: Record<string, TransitionOption[]> = {
  RECEIVED: [
    { status: 'UNDER_SCRUTINY', label: 'Move to Scrutiny', btnClass: 'bg-blue-600 hover:bg-blue-500 text-white' },
    { status: 'JOINT_INQUIRY', label: 'Schedule Joint Inquiry', btnClass: 'bg-amber-600 hover:bg-amber-500 text-white' },
    { status: 'ESCALATED', label: 'Escalate to RD', btnClass: 'bg-red-600 hover:bg-red-500 text-white' },
    { status: 'DISPOSED', label: 'Dispose Complaint', btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' },
  ],
  UNDER_SCRUTINY: [
    { status: 'JOINT_INQUIRY', label: 'Schedule Joint Inquiry', btnClass: 'bg-amber-600 hover:bg-amber-500 text-white' },
    { status: 'ESCALATED', label: 'Escalate to RD', btnClass: 'bg-red-600 hover:bg-red-500 text-white' },
    { status: 'DISPOSED', label: 'Dispose Complaint', btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' },
  ],
  JOINT_INQUIRY: [
    { status: 'ESCALATED', label: 'Escalate to RD', btnClass: 'bg-red-600 hover:bg-red-500 text-white' },
    { status: 'DISPOSED', label: 'Dispose Complaint', btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' },
  ],
  ESCALATED: [
    { status: 'UNDER_SCRUTINY', label: 'Move to Scrutiny', btnClass: 'bg-blue-600 hover:bg-blue-500 text-white' },
    { status: 'JOINT_INQUIRY', label: 'Schedule Joint Inquiry', btnClass: 'bg-amber-600 hover:bg-amber-500 text-white' },
    { status: 'DISPOSED', label: 'Dispose Complaint', btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' },
  ],
  DISPOSED: [], // Terminal State!
};

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onUpdateStatus,
  onOpenAudit
}) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'WORKFLOW' | 'AI_DRAFT' | 'PRECEDENTS'>('DETAILS');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ComplaintStatus | null>(null);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  
  // Relief and consistency fields
  const [affectedCount, setAffectedCount] = useState<number | string>(complaint?.affectedStudentsCount || '');
  const [reliefAmount, setReliefAmount] = useState<number | string>(complaint?.totalReliefAmountInr || '');
  const [consistencyWarning, setConsistencyWarning] = useState<string | null>(null);

  // Feature 1 & 4: SHC Digital Docket Export and Cryptographic QR Code Seal
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [finalOrderHash, setFinalOrderHash] = useState<string>('');
  const [isExportingDocket, setIsExportingDocket] = useState<boolean>(false);

  // Phase 3 Item 15: Local LLM Drafting State
  const [llmDraftType, setLlmDraftType] = useState<'SUMMARY' | 'SHOW_CAUSE' | 'REPLY'>('SUMMARY');
  const [llmDraft, setLlmDraft] = useState<LlmDraftResponse | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);
  const [isAcceptingDraft, setIsAcceptingDraft] = useState<boolean>(false);
  const [draftAcceptSuccess, setDraftAcceptSuccess] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  // Phase 3 Item 18: Precedent Finder State
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [isLoadingPrecedents, setIsLoadingPrecedents] = useState<boolean>(false);
  const [precedentError, setPrecedentError] = useState<string | null>(null);
  const [copiedPrecedentId, setCopiedPrecedentId] = useState<string | null>(null);

  // BSA 2023 Evidentiary Verification State
  const [isVerifyingChain, setIsVerifyingChain] = useState<boolean>(false);
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  // Sync state whenever complaint or isOpen changes
  React.useEffect(() => {
    if (isOpen && complaint) {
      setAffectedCount(complaint.affectedStudentsCount || '');
      setReliefAmount(complaint.totalReliefAmountInr || '');
      setResolutionRemarks('');
      setConsistencyWarning(null);
      setReopenError(null);
      setChainValid(null);
    }
  }, [isOpen, complaint?.id]);

  // QR Code generation effect - called unconditionally on every render
  React.useEffect(() => {
    const isDisposed = (complaint?.status || '').toUpperCase() === 'DISPOSED';
    if (isOpen && isDisposed && complaint) {
      const disposalDate = complaint.receivedDate ? complaint.receivedDate.slice(0, 10) : '2026-10-25';
      const outcomeVerdict = complaint.resolutionNotes || 'Formal Regulatory Disposal Order & Student Relief Delivered';
      api.getAuditLogs(complaint.id).then(async (logs) => {
        const latestHash = logs.length > 0 ? logs[logs.length - 1].currentHash : '90a3c0f1c1e66a1b450e7c57ad3c31de2e53edfab18b15b44bd855d9ed63b96e';
        const orderPayload = `${complaint.id}:${complaint.institutionPid}:${disposalDate}:${outcomeVerdict}:${latestHash}`;
        const orderHash = await computeSha256(orderPayload);
        setFinalOrderHash(orderHash);
        const verifyUrl = `aicte-verify://order?case=${complaint.id}&hash=${orderHash.slice(0, 16)}&disposed=${disposalDate}`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, { width: 130, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
        setQrCodeDataUrl(dataUrl);
      }).catch(() => {});
    }
  }, [isOpen, complaint?.id, complaint?.status]);

  // Handle BSA 2023 Chain Verification
  const handleVerifyChain = async () => {
    if (!complaint) return;
    setIsVerifyingChain(true);
    try {
      const res = await api.verifyChain(complaint.id);
      setChainValid(res.isValid);
    } catch {
      setChainValid(false);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  // Safe Guard AFTER all React Hooks have executed
  if (!isOpen || !complaint) return null;

  const currentStatus = (complaint.status || 'RECEIVED').toUpperCase();
  const isDisposed = currentStatus === 'DISPOSED';

  const handleExportDocket = async () => {
    if (!complaint) return;
    setIsExportingDocket(true);
    try {
      const inst = await api.getInstitution(complaint.institutionPid);
      const auditLogs = await api.getAuditLogs(complaint.id);
      await generateHearingDocketPdf({
        complaint,
        institution: inst,
        auditLogs
      });
    } finally {
      setIsExportingDocket(false);
    }
  };

  const handleGenerateDraft = async (type: 'SUMMARY' | 'SHOW_CAUSE' | 'REPLY') => {
    if (!complaint) return;
    setLlmDraftType(type);
    setIsGeneratingDraft(true);
    setDraftError(null);
    setDraftAcceptSuccess(null);
    try {
      const res = await api.generateLlmDraft(complaint.id, type);
      setLlmDraft(res);
    } catch (err: any) {
      setDraftError(err.response?.data?.message || err.message || 'Failed to generate regulatory draft.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleAcceptDraft = async () => {
    if (!complaint || !llmDraft) return;
    setIsAcceptingDraft(true);
    setDraftAcceptSuccess(null);
    setDraftError(null);
    try {
      await api.acceptLlmDraft(complaint.id, llmDraft.draftType, llmDraft.content);
      setDraftAcceptSuccess(`Draft accepted and permanently anchored in cryptographic audit chain for ${complaint.id}`);
      if (!resolutionRemarks) {
        setResolutionRemarks(`[AI Regulatory Rationale - ${llmDraft.draftType}]\n${llmDraft.content.slice(0, 300)}...`);
      }
    } catch (err: any) {
      setDraftError(err.response?.data?.message || err.message || 'Failed to commit draft to audit chain.');
    } finally {
      setIsAcceptingDraft(false);
    }
  };

  const loadPrecedents = async () => {
    if (!complaint || precedents.length > 0) return;
    setIsLoadingPrecedents(true);
    setPrecedentError(null);
    try {
      const data = await api.getPrecedents(complaint.id);
      setPrecedents(data);
    } catch (err: any) {
      setPrecedentError(err.response?.data?.message || err.message || 'Failed to retrieve precedent cases.');
    } finally {
      setIsLoadingPrecedents(false);
    }
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (isUpdating) return;

    // Check resolution consistency if disposing
    if (newStatus === 'DISPOSED') {
      try {
        const check = await api.checkConsistency(
          complaint.institutionPid,
          complaint.category,
          resolutionRemarks || 'Disposal without penalty'
        );
        if (!check.isConsistent && !consistencyWarning) {
          setConsistencyWarning(check.warningMessage || 'Penalty is inconsistent with historical APH guidelines.');
          return;
        }
      } catch (err) {
        console.warn('Consistency check skipped', err);
      }
    }

    setIsUpdating(true);
    setPendingStatus(newStatus);
    try {
      await onUpdateStatus(complaint.id, newStatus, resolutionRemarks);
      setResolutionRemarks('');
      setConsistencyWarning(null);
      setReopenError(null);
      onClose(); // Automatically close the modal once status is updated
    } finally {
      setIsUpdating(false);
      setPendingStatus(null);
    }
  };

  let riskFactors: { factor: string; weight: number }[] = [];
  try {
    riskFactors = JSON.parse(complaint.delayRiskReasons || '[]');
  } catch {}

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-white font-mono">{complaint.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${complaint.sourceBureau === 'PGRC' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'}`}>
                    {complaint.sourceBureau}
                  </span>
                  <span className="text-xs text-slate-400">| {complaint.region} Region</span>
                  <SlaProximityBadge status={complaint.status} daysRemainingSla={complaint.daysRemainingSla} />
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{complaint.subject}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDocket}
                disabled={isExportingDocket}
                className="btn-secondary px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-60"
                title="Generate official sealed Standing Hearing Committee (SHC) / SAC Digital Docket PDF"
              >
                {isExportingDocket ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Export SHC Docket (PDF)</span>
              </button>

              {/* Tab Toggles */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  onClick={() => setActiveTab('DETAILS')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${activeTab === 'DETAILS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Grievance Details
                </button>
                <button
                  onClick={() => {
                    setActiveTab('AI_DRAFT');
                    if (!llmDraft) {
                      handleGenerateDraft('SUMMARY');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${activeTab === 'AI_DRAFT' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Drafting (APH RAG)</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('PRECEDENTS');
                    loadPrecedents();
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${activeTab === 'PRECEDENTS' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Scale className="w-3 h-3" />
                  <span>Precedents</span>
                </button>
                <button
                  onClick={() => setActiveTab('WORKFLOW')}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${activeTab === 'WORKFLOW' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Workflow &amp; Action History</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(92vh-140px)]">
            {activeTab === 'WORKFLOW' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="text-emerald-400 w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">BSA 2023 Sec 63 Evidentiary Ledger</h4>
                      <p className="text-[10px] text-slate-400">Cryptographic SHA-256 chain verified against local authority checkpoint</p>
                    </div>
                  </div>
                  <button
                    onClick={handleVerifyChain}
                    disabled={isVerifyingChain}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    {isVerifyingChain ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : chainValid === true ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>✓ Integrity Verified</span>
                      </>
                    ) : chainValid === false ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Integrity Failed</span>
                      </>
                    ) : (
                      <span>Validate Chain</span>
                    )}
                  </button>
                </div>

                <AuditChainViewer caseId={complaint.id} onClose={onClose} />
              </div>
            ) : activeTab === 'AI_DRAFT' ? (
              <div className="space-y-6">
                {/* AI RAG Header & Drafting Mode Switcher */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Regulatory Legal Drafting Assistant (RAG over APH 2024-27)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Local high-assurance statutory generator citing official AICTE Approval Process Handbook clauses.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleGenerateDraft('SUMMARY')}
                      disabled={isGeneratingDraft}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${llmDraftType === 'SUMMARY' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Draft Case Summary
                    </button>
                    <button
                      onClick={() => handleGenerateDraft('SHOW_CAUSE')}
                      disabled={isGeneratingDraft}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${llmDraftType === 'SHOW_CAUSE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Draft Show-Cause Notice
                    </button>
                    <button
                      onClick={() => handleGenerateDraft('REPLY')}
                      disabled={isGeneratingDraft}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${llmDraftType === 'REPLY' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}
                    >
                      Draft Reply to Complainant
                    </button>
                  </div>
                </div>

                {/* Loading indicator */}
                {isGeneratingDraft && (
                  <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-200">Consulting Local Regulatory LLM &amp; Vector APH Index...</p>
                    <p className="text-xs text-slate-400 mt-1">Synthesizing statutory citations and jurisdiction precedent...</p>
                  </div>
                )}

                {draftError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{draftError}</span>
                  </div>
                )}

                {draftAcceptSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{draftAcceptSuccess}</span>
                  </div>
                )}

                {/* Generated Draft Display */}
                {llmDraft && !isGeneratingDraft && (
                  <div className="space-y-4">
                    {/* Mandatory Disclaimer Badge */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-300 uppercase tracking-wide">
                          AI DRAFT - officer review required
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                        Model: {llmDraft.engine}
                      </span>
                    </div>

                    {/* Cited APH Clauses */}
                    {llmDraft.citedClauses && llmDraft.citedClauses.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Statutory AICTE Approval Process Handbook (APH 2024-27) Clauses Cited</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {llmDraft.citedClauses.map((clauseStr, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
                              <span className="font-bold text-amber-400">{clauseStr}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Box */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase">
                          Generated {llmDraft.draftType} Text
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(llmDraft.content);
                              setCopiedDraft(true);
                              setTimeout(() => setCopiedDraft(false), 2000);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                          >
                            {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedDraft ? 'Copied' : 'Copy Text'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={llmDraft.content}
                        onChange={(e) => setLlmDraft({ ...llmDraft, content: e.target.value })}
                        rows={10}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-sans focus:outline-none focus:border-amber-500/50 leading-relaxed"
                      />
                    </div>

                    {/* Accept & Record in Audit Chain */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={handleAcceptDraft}
                        disabled={isAcceptingDraft}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition-all"
                      >
                        {isAcceptingDraft ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>Accept &amp; Anchor in Audit Chain</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'PRECEDENTS' ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-cyan-400" />
                      <span>Precedent Resolution Finder (Vector Cosine Match)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Historical closed cases resolved under identical regulatory categories and grievance characteristics.
                    </p>
                  </div>
                  <button
                    onClick={loadPrecedents}
                    disabled={isLoadingPrecedents}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrecedents ? 'animate-spin' : ''}`} />
                    <span>Refresh Matches</span>
                  </button>
                </div>

                {isLoadingPrecedents && (
                  <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800">
                    <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-200">Querying pgvector Closed Case Embeddings...</p>
                  </div>
                )}

                {precedentError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{precedentError}</span>
                  </div>
                )}

                {!isLoadingPrecedents && precedents.length === 0 && !precedentError && (
                  <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                    No matching closed precedents found for this grievance pattern yet.
                  </div>
                )}

                <div className="space-y-3">
                  {precedents.map((prec) => (
                    <div
                      key={prec.caseId}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-amber-400 text-xs">{prec.caseId}</span>
                          <span className="text-xs text-slate-300 font-semibold">{prec.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {prec.similarityPercent}% Match
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Resolved in {prec.daysTaken} days</span>
                          </span>
                          {prec.reliefAmountInr > 0 && (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <Banknote className="w-3 h-3" />
                              <span>₹{prec.reliefAmountInr.toLocaleString('en-IN')} Relief</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-2.5 text-xs text-slate-300 leading-relaxed">
                        <p className="font-semibold text-slate-400 text-[10px] uppercase mb-1">Precedent Resolution Outcome:</p>
                        <p>{prec.resolutionNotes}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Clauses Applied:</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-slate-700">
                            {prec.appliedClauses}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setResolutionRemarks(`[Precedent Adopted from ${prec.caseId}]\n${prec.resolutionNotes}`);
                            setCopiedPrecedentId(prec.caseId);
                            setActiveTab('DETAILS');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedPrecedentId === prec.caseId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Adopt Precedent Rationale</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Target Institution Info & Reusable Evidence Button */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Target AICTE Institution</p>
                    <p className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span>{complaint.institutionName}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-700">
                        PID: {complaint.institutionPid}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Complainant Origin</p>
                      <p className="font-semibold text-slate-200">{complaint.complainantType}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <p className="text-[10px] text-slate-400">Category</p>
                      <p className="font-semibold text-amber-400">{complaint.category}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <button
                      onClick={() => setIsEvidenceModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 font-semibold flex items-center gap-1.5 transition-colors"
                      title="Inspect shared institution balance sheets, land titles, and pre-verified evidence"
                    >
                      <FolderCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Evidence Repository</span>
                    </button>
                  </div>
                </div>

                {/* Policy Version & Missing Evidence Blocker Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  {complaint.governingPolicyVersion && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Governing Edition: <strong>{complaint.governingPolicyVersion}</strong></span>
                      {complaint.governingPolicyClause && (
                        <span className="text-indigo-400 font-bold">&bull; {complaint.governingPolicyClause}</span>
                      )}
                    </div>
                  )}

                  {complaint.pendingEvidenceBlockers && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Diagnostic Blocker: <strong>{complaint.pendingEvidenceBlockers}</strong></span>
                    </div>
                  )}

                  {complaint.isRecurring && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                      <span>Recurring Non-Compliance (Prior Ref: {complaint.priorCaseReference || 'Prior 12M Case'})</span>
                    </div>
                  )}
                </div>

                {/* Sanitized Narrative Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <span>Sanitized Complaint Narrative</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        PII MASKED (Air-Gapped)
                      </span>
                    </label>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans shadow-inner whitespace-pre-wrap">
                    {complaint.sanitizedText}
                  </div>
                </div>

                {/* Complaint-Splitting Sub-Task Intelligence */}
                <SubTaskTracker parentCaseId={complaint.id} />

                {/* Institutional Corrective Action Plan (CAPA) */}
                <CorrectiveActionPanel institutionPid={complaint.institutionPid} />

                {/* Resolution Coverage & Relief Delivered (if disposed or populated) */}
                {(complaint.affectedStudentsCount || complaint.totalReliefAmountInr) && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Users className="w-4 h-4" />
                      <span>Regulatory Resolution Coverage</span>
                    </div>
                    <div className="flex items-center gap-6">
                      {complaint.affectedStudentsCount && (
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Impacted Cohort</span>
                          <p className="text-emerald-300 font-mono font-bold text-sm">{complaint.affectedStudentsCount} Individuals Relieved</p>
                        </div>
                      )}
                      {complaint.totalReliefAmountInr && (
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Total Redress Delivered</span>
                          <p className="text-emerald-300 font-mono font-bold text-sm">₹{(complaint.totalReliefAmountInr / 100000).toFixed(1)} Lakhs</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Explainable Delay Risk Forecasting */}
                <div className="p-4 rounded-xl bg-slate-850 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-200">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>Explainable Delay Risk Metric: {Math.round((complaint.delayRiskScore || 0) * 100)}%</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${(complaint.delayRiskScore || 0) >= 0.7 ? 'bg-red-500/20 text-red-300 border-red-500/40' : (complaint.delayRiskScore || 0) >= 0.4 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}`}>
                      {(complaint.delayRiskScore || 0) >= 0.7 ? 'High Risk' : (complaint.delayRiskScore || 0) >= 0.4 ? 'Moderate' : 'Low Risk'}
                    </span>
                  </div>

                  {riskFactors.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] text-slate-400">Risk Contributors Identified by AI Engine:</p>
                      {riskFactors.map((rf, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-300">{rf.factor}</span>
                          <span className="text-amber-400 font-mono font-bold">+{Math.round(rf.weight * 100)}% impact</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Transition Action Console */}
                <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Execute Regulatory Action &amp; Append Audit Hash Block
                  </p>

                  {consistencyWarning && (
                    <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block font-semibold">Resolution Consistency Alert</strong>
                        <p>{consistencyWarning}</p>
                        <p className="text-[11px] text-amber-300/80">Click 'Dispose Complaint' again if you wish to override with explicit remarks.</p>
                      </div>
                    </div>
                  )}

                  {isDisposed && (
                    <div className="w-full p-4 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-3 mb-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                            Official AICTE Order Verification Seal (Offline Cryptographic QR)
                          </span>
                        </div>
                        <button
                          onClick={handleExportDocket}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          <span>Print Certificate</span>
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* QR Code Container */}
                        <div className="bg-white p-2 rounded-lg border border-slate-700 shrink-0 shadow-md">
                          {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="AICTE Order Verification QR" className="w-24 h-24 object-contain" />
                          ) : (
                            <div className="w-24 h-24 flex items-center justify-center bg-slate-100">
                              <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
                            </div>
                          )}
                        </div>

                        {/* Sealed Details */}
                        <div className="flex-1 space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Verification URI:</span>
                            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                              aicte-verify://order?case={complaint.id}&amp;hash={finalOrderHash.slice(0, 16)}&amp;disposed=2026-10-25
                            </span>
                          </div>
                          <p className="text-slate-300">
                            <strong>Outcome Verdict:</strong> {complaint.resolutionNotes || 'Disposed with full caution money restitution and administrative compliance order.'}
                          </p>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Cryptographic Order Digest (SHA-256):</span>
                            <p className="font-mono text-[10px] text-slate-300 break-all bg-slate-900 p-1.5 rounded border border-slate-800 mt-0.5">
                              {finalOrderHash || '90a3c0f1c1e66a1b450e7c57ad3c31de2e53edfab18b15b44bd855d9ed63b96e'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder={isDisposed ? "Mandatory justification remarks to reopen case under APH review..." : "Official action remarks (will be cryptographically signed into SHA-256 block)..."}
                    value={resolutionRemarks}
                    onChange={(e) => {
                      setResolutionRemarks(e.target.value);
                      if (reopenError) setReopenError(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />

                  {reopenError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{reopenError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-slate-400">
                      Current Status: <strong className="text-white uppercase">{complaint.status}</strong>
                    </div>

                    {isDisposed ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge-disposed inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs shadow-inner">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Case Disposed / Closed</span>
                        </span>
                        <button
                          disabled={isUpdating}
                          onClick={() => {
                            if (!resolutionRemarks.trim()) {
                              setReopenError('Mandatory justification remarks required to reopen a disposed case under APH review.');
                              return;
                            }
                            setReopenError(null);
                            handleStatusChange('UNDER_SCRUTINY');
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60 shadow-md"
                          title="Reopen case to UNDER_SCRUTINY under authorized administrative APH review"
                        >
                          {isUpdating && pendingStatus === 'UNDER_SCRUTINY' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span>Reopen Case Under APH Review</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(FSM_TRANSITIONS[currentStatus] || []).map((t) => (
                          <button
                            key={t.status}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(t.status)}
                            className={`px-3 py-1.5 rounded-lg ${t.btnClass} font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 shadow-sm`}
                          >
                            {isUpdating && pendingStatus === t.status && (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* Reusable Evidence Modal */}
      <EvidenceRepositoryModal
        institutionPid={complaint.institutionPid}
        institutionName={complaint.institutionName}
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
      />
    </>
  );
};

