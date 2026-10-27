import React, { useState, useEffect } from 'react';
import { AuditLog, AuditVerificationResult } from '../types';
import { api } from '../services/api';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, ArrowDown, RefreshCw, KeyRound, Clock, User, FileText, AlertTriangle, Download, BookmarkCheck } from 'lucide-react';

interface AuditChainViewerProps {
  caseId: string;
  onClose?: () => void;
}

export const AuditChainViewer: React.FC<AuditChainViewerProps> = ({ caseId, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [verification, setVerification] = useState<AuditVerificationResult | null>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTampering, setIsTampering] = useState(false);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchLogsAndCheckpoints = async () => {
    setIsLoading(true);
    try {
      const [logsData, chkData] = await Promise.all([
        api.getAuditLogs(caseId),
        api.getCheckpoints(caseId)
      ]);
      setLogs(logsData);
      setCheckpoints(chkData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setVerification(null);
    setActionNotice(null);
    fetchLogsAndCheckpoints();
  }, [caseId]);

  const handleValidateChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyChain(caseId);
      setVerification(res);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAnchorCheckpoint = async () => {
    setIsAnchoring(true);
    try {
      const chk = await api.createCheckpoint(caseId);
      setActionNotice(`Anchor Success: Merkle Checkpoint ${chk.checkpointId || 'Created'} recorded with National Witness signature.`);
      await fetchLogsAndCheckpoints();
      await handleValidateChain();
    } catch (e: any) {
      setActionNotice(`Checkpoint Error: ${e.message}`);
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleSimulateTamper = async () => {
    setIsTampering(true);
    try {
      await api.simulateTamper(caseId);
      setActionNotice(`Demo Tamper Injected: Unauthorized row alteration written to DB. Re-validating cryptographic chain...`);
      await fetchLogsAndCheckpoints();
      // Immediately run verification to show the visible failure
      const res = await api.verifyChain(caseId);
      setVerification(res);
    } catch (e: any) {
      setActionNotice(`Tamper simulation error: ${e.message}`);
    } finally {
      setIsTampering(false);
    }
  };

  const handleRepairTamper = async () => {
    setIsTampering(true);
    try {
      await api.repairTamper(caseId);
      setActionNotice(`Integrity Restored: Cryptographic hash chain recomputed and re-signed with authorized Ed25519 officer keys.`);
      await fetchLogsAndCheckpoints();
      const res = await api.verifyChain(caseId);
      setVerification(res);
    } catch (e: any) {
      setActionNotice(`Repair error: ${e.message}`);
    } finally {
      setIsTampering(false);
    }
  };

  const handleDownloadProof = async (checkpointId: string) => {
    try {
      const exportData = await api.exportCheckpointWitness(checkpointId);
      const blob = new Blob([exportData.printableProof || JSON.stringify(exportData, null, 2)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Witness_Anchor_${checkpointId}_BSA63.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Cryptographic Audit Trail (SHA-256 + Ed25519)</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                {caseId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tamper-evident chain with per-officer Ed25519 digital signatures and Merkle checkpoint anchoring.
              (Evidentiary support pursuant to Section 63 BSA, 2023).
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleValidateChain}
            disabled={isVerifying || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-all disabled:opacity-50"
            title="Perform live mathematical hash and signature verification"
          >
            {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>Verify Chain</span>
          </button>

          <button
            onClick={handleAnchorCheckpoint}
            disabled={isAnchoring || logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold text-xs transition-all disabled:opacity-50"
            title="Compute Merkle root and anchor with Apex National Witness key"
          >
            {isAnchoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookmarkCheck className="w-3.5 h-3.5" />}
            <span>Anchor Checkpoint</span>
          </button>
        </div>
      </div>

      {/* Action Notification Strip */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-amber-300 font-mono flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white ml-2 text-xs">✕</button>
        </div>
      )}

      {/* Verification Status Summary Banner */}
      {verification && (() => {
        const isValidChain = Boolean(
          (verification.chainValid ?? (verification as any).chain_valid) &&
          (verification.isValid ?? (verification as any).is_valid)
        );

        return (
          <div className={`p-4 rounded-xl border transition-all animate-in fade-in duration-200 ${isValidChain ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-red-950/60 border-red-500/60 text-red-200 ring-2 ring-red-500/30'}`}>
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isValidChain ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
                )}
                <div>
                  <p className="text-sm font-bold text-white">
                    {isValidChain
                      ? 'Cryptographic Chain Integrity Verified: 100% Valid & Non-Repudiated'
                      : 'CRITICAL SECURITY BREACH: Chain Integrity Divergence / Tampering Detected!'}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Verified {verification.totalBlocks} sequential cryptographic blocks against genesis anchor.
                    {verification.tamperAlertMessage && (
                      <span className="block mt-1 font-mono font-bold text-red-300 bg-red-950/80 p-2 rounded border border-red-500/40">
                        {verification.tamperAlertMessage}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase border shrink-0 ${isValidChain ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/30 text-red-200 border-red-500/60'}`}>
                {isValidChain ? 'INTEGRITY VERIFIED' : 'TAMPER DETECTED'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Anchored Merkle Checkpoints Strip */}
      {checkpoints.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-blue-400" />
              Anchored Merkle Checkpoints ({checkpoints.length}):
            </span>
            <span className="text-[10px] text-slate-400 font-mono">National Witness: Ed25519 Sealed</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {checkpoints.map(chk => (
              <div key={chk.checkpointId} className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="text-amber-400 font-bold">{chk.checkpointId}</span>
                <span className="text-slate-400 text-[10px]">(Seq #{chk.fromSeq}-#{chk.toSeq})</span>
                <button
                  onClick={() => handleDownloadProof(chk.checkpointId)}
                  className="p-1 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition-colors"
                  title="Download Section 63 BSA Witness Anchor Certificate"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chain Blocks Timeline */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs">Loading cryptographic chain...</div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">No audit records found for this case.</div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          
          {logs.map((log) => {
            const detail = verification?.verificationDetails?.find(d => Number(d.sequenceNum || (d as any).sequence_num) === Number(log.sequenceNum));
            const isGenesis = Number(log.sequenceNum) === 1;
            const isBlockValid = detail ? Boolean(detail.blockValid ?? (detail as any).block_valid) : null;
            const isSigValid = detail ? Boolean(detail.signatureValid ?? (detail as any).signature_valid ?? true) : true;
            const chkStatus = (detail as any)?.checkpointStatus || (detail as any)?.checkpoint_status;

            return (
              <div key={log.sequenceNum} className="relative group">
                
                {/* Timeline node marker */}
                <div className={`absolute -left-[30px] top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${detail ? (isBlockValid ? 'bg-emerald-500 border-slate-900 text-slate-950' : 'bg-red-500 border-slate-900 text-white animate-bounce') : 'bg-slate-700 border-slate-900 text-slate-300'}`}>
                  {log.sequenceNum}
                </div>

                {/* Block Card */}
                <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${detail && !isBlockValid ? 'bg-red-950/30 border-red-500/60 ring-1 ring-red-500/40' : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'}`}>
                  
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide border ${isGenesis ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'}`}>
                        {isGenesis ? 'GENESIS BLOCK #1' : `BLOCK #${log.sequenceNum}`}
                      </span>
                      <span className="text-xs font-bold text-white">{log.action}</span>
                      {chkStatus && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-500/30">
                          {chkStatus}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.officerId}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      {detail && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${detail.blockValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                          {detail.blockValid ? '✓ Hash Valid' : '✗ Hash Divergence'}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <KeyRound className="w-3 h-3" />
                        {isSigValid ? 'Ed25519 Signed ✓' : 'Ed25519 Forgery ✗'}
                      </span>
                    </div>
                  </div>

                  {log.remarks && (
                    <p className={`text-xs leading-relaxed font-sans p-2.5 rounded-lg border ${detail && !isBlockValid ? 'bg-red-950/60 border-red-500/40 text-red-200 font-semibold' : 'bg-slate-900/60 border-slate-800 text-slate-300'}`}>
                      {log.remarks}
                    </p>
                  )}

                  {/* Cryptographic Hashes Pill Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                    <div className="p-2 rounded bg-slate-950/80 border border-slate-800 truncate">
                      <span className="text-slate-500 uppercase mr-1">Prev Hash:</span>
                      <span className={isGenesis ? 'text-amber-400/80' : 'text-slate-300'}>{log.prevHash}</span>
                    </div>
                    <div className={`p-2 rounded border truncate ${detail && !isBlockValid ? 'bg-red-950/60 border-red-500/60 text-red-300 font-bold' : 'bg-slate-950/80 border-slate-800 text-emerald-400 font-semibold'}`}>
                      <span className="text-slate-500 uppercase mr-1">Current Hash:</span>
                      <span>{log.currentHash}</span>
                    </div>
                  </div>

                  {/* Tampered divergence alert if invalid */}
                  {detail && !isBlockValid && detail.recomputedCurrentHash && (
                    <div className="p-2 rounded bg-red-950/80 border border-red-500/50 text-[10px] font-mono text-red-200">
                      <div className="font-bold text-red-400">CRYPTOGRAPHIC MISMATCH DETECTED:</div>
                      <div>Expected Hash:   {detail.recomputedCurrentHash}</div>
                      <div>Recorded in DB:  {detail.recordedCurrentHash}</div>
                    </div>
                  )}

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};
