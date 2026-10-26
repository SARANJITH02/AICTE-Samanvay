import React, { useState, useEffect } from 'react';
import { SharedEvidencePackage } from '../types';
import { api } from '../services/api';
import { FolderCheck, FileText, CheckCircle2, ShieldCheck, Download, ExternalLink, X, Building2, KeyRound } from 'lucide-react';

interface EvidenceRepositoryModalProps {
  institutionPid: string;
  institutionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceRepositoryModal: React.FC<EvidenceRepositoryModalProps> = ({
  institutionPid,
  institutionName,
  isOpen,
  onClose
}) => {
  const [evidenceList, setEvidenceList] = useState<SharedEvidencePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadEvidence();
    }
  }, [isOpen, institutionPid]);

  const loadEvidence = async () => {
    setIsLoading(true);
    try {
      const data = await api.getEvidencePackages(institutionPid);
      setEvidenceList(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Reusable Verified Evidence Repository</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  PID: {institutionPid}
                </span>
              </div>
              <p className="text-xs text-slate-400">{institutionName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
            <p>
              Pre-verified institutional evidence packages shared across AICTE Bureaus. Officers can cite these verified documents directly to resolve grievances without burdening the institution with redundant document submission requests.
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading verified evidence packages...</div>
          ) : evidenceList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No shared evidence packages registered for this institution yet.</div>
          ) : (
            <div className="space-y-3">
              {evidenceList.map((pkg) => (
                <div
                  key={pkg.id || pkg.title}
                  className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-700">
                        <FileText className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{pkg.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="font-semibold text-emerald-400 uppercase">Verified by {pkg.verifiedByBureau}</span>
                          <span>&bull;</span>
                          <span>{new Date(pkg.verifiedDate).toLocaleDateString()}</span>
                          {pkg.caseId && <span>&bull; Source Case: {pkg.caseId}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => alert(`Access granted to verified document: ${pkg.title}\nSource Hash: ${pkg.fileHash}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Reuse Package</span>
                    </button>
                  </div>

                  {pkg.sourceProvenance && (
                    <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                      <strong>Source Provenance:</strong> {pkg.sourceProvenance}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 truncate">
                    <KeyRound className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-slate-500">SHA-256:</span>
                    <span className="truncate text-slate-300">{pkg.fileHash}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Digital Source Tracking &amp; Evidence Reuse System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
