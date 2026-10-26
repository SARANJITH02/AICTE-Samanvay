import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';
import { AuditChainViewer } from './AuditChainViewer';
import { SubTaskTracker } from './SubTaskTracker';
import { CorrectiveActionPanel } from './CorrectiveActionPanel';
import { EvidenceRepositoryModal } from './EvidenceRepositoryModal';
import {
  X, Building2, User, Clock, ShieldAlert, FileText, Lock, CheckCircle2,
  ChevronRight, AlertTriangle, ShieldCheck, Scale, Users, Banknote,
  FolderCheck, BookOpen, AlertCircle, RefreshCw, FileDown, Printer, QrCode
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
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'AUDIT'>('DETAILS');
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

  if (!isOpen || !complaint) return null;

  const currentStatus = (complaint.status || 'RECEIVED').toUpperCase();
  const isDisposed = currentStatus === 'DISPOSED';

  React.useEffect(() => {
    if (isDisposed && complaint) {
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
  }, [isDisposed, complaint]);

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
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${activeTab === 'DETAILS' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Grievance Details
                </button>
                <button
                  onClick={() => setActiveTab('AUDIT')}
                  className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${activeTab === 'AUDIT' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Audit Chain</span>
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
            {activeTab === 'AUDIT' ? (
              <AuditChainViewer caseId={complaint.id} onClose={onClose} />
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

