import React, { useState, useEffect } from 'react';
import { AuditLog, AuditVerificationResult } from '../types';
import { api } from '../services/api';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, ArrowDown, RefreshCw, KeyRound, Clock, User, FileText } from 'lucide-react';

interface AuditChainViewerProps {
  caseId: string;
  onClose?: () => void;
}

export const AuditChainViewer: React.FC<AuditChainViewerProps> = ({ caseId, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [verification, setVerification] = useState<AuditVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(caseId);
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setVerification(null);
    fetchLogs();
  }, [caseId]);

  const handleValidateChain = async () => {
    setIsVerifying(true);
    try {
      // Runs live cryptographic verification of the SHA-256 chain
      const res = await api.verifyChain(caseId);
      setVerification(res);
    } finally {
      setIsVerifying(false);
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
              <h3 className="text-base font-bold text-white">Cryptographic Audit Trail (SHA-256 Chain)</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                {caseId}
              </span>
            </div>
              Row-locked, tamper-evident audit chain guaranteeing regulatory non-repudiation from Genesis block.
              (Designed to support evidentiary verification under Section 63 BSA 2023).
          </div>
        </div>

        <button
          onClick={handleValidateChain}
          disabled={isVerifying || logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 shrink-0 disabled:opacity-60"
        >
          {isVerifying ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>Validate Chain Integrity</span>
        </button>
      </div>

      {/* Verification Status Summary Banner (After clicking validate) */}
      {verification && (() => {
        const isValidChain = Boolean(verification.chainValid || (verification as any).chain_valid || (verification as any).isValid || (verification as any).is_valid);
        return (
          <div className={`p-4 rounded-xl border transition-all animate-in fade-in duration-200 ${isValidChain ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-red-950/40 border-red-500/40 text-red-200'}`}>
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isValidChain ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-bold text-white">
                    {isValidChain
                      ? 'Cryptographic Chain Integrity Verified: 100% Valid & Untampered'
                      : 'CRITICAL SECURITY ALERT: Chain Integrity Violated / Tampering Detected'}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Verified {verification.totalBlocks} sequential cryptographic blocks against genesis hash.
                    {verification.tamperAlertMessage && ` ${verification.tamperAlertMessage}`}
                  </p>
                </div>
              </div>

              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full uppercase border shrink-0 ${isValidChain ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                {isValidChain ? 'CHAIN VALID' : 'BROKEN LINK'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Chain Blocks Timeline */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs">Loading cryptographic chain...</div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">No audit records found for this case.</div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          
          {logs.map((log, index) => {
            const detail = verification?.verificationDetails?.find(d => Number(d.sequenceNum || (d as any).sequence_num) === Number(log.sequenceNum));
            const isGenesis = Number(log.sequenceNum) === 1;
            const isBlockValid = detail ? Boolean(detail.blockValid ?? (detail as any).block_valid) : null;

            return (
              <div key={log.sequenceNum} className="relative group">
                
                {/* Timeline node marker */}
                <div className={`absolute -left-[30px] top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${detail ? (isBlockValid ? 'bg-emerald-500 border-slate-900 text-slate-950' : 'bg-red-500 border-slate-900 text-white') : 'bg-slate-700 border-slate-900 text-slate-300'}`}>
                  {log.sequenceNum}
                </div>

                {/* Block Card */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all space-y-2.5">
                  
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide border ${isGenesis ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'}`}>
                        {isGenesis ? 'GENESIS BLOCK #1' : `BLOCK #${log.sequenceNum}`}
                      </span>
                      <span className="text-xs font-bold text-white">{log.action}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.officerId}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      {detail && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${detail.blockValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {detail.blockValid ? '✓ Verified' : '✗ Invalid'}
                        </span>
                      )}
                    </div>
                  </div>

                  {log.remarks && (
                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      {log.remarks}
                    </p>
                  )}

                  {/* Cryptographic Hashes Pill Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                    <div className="p-2 rounded bg-slate-950/80 border border-slate-800 truncate">
                      <span className="text-slate-500 uppercase mr-1">Prev Hash:</span>
                      <span className={isGenesis ? 'text-amber-400/80' : 'text-slate-300'}>{log.prevHash}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/80 border border-slate-800 truncate">
                      <span className="text-slate-500 uppercase mr-1">Current Hash:</span>
                      <span className="text-emerald-400 font-semibold">{log.currentHash}</span>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};
