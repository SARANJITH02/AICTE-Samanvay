import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Complaint, InstitutionalCorrectiveAction, Institution } from '../types';
import { Building2, ClipboardCheck, FileCheck, ShieldAlert, CheckCircle2, Clock, UploadCloud, AlertCircle, ArrowRight, FileText } from 'lucide-react';

interface InstitutionPortalViewProps {
  institutionPid?: string;
  institutionName?: string;
  onInspectAudit?: (caseId: string) => void;
}

export const InstitutionPortalView: React.FC<InstitutionPortalViewProps> = ({
  institutionPid = 'INST-SOU-001',
  institutionName,
  onInspectAudit
}) => {
  const [cases, setCases] = useState<Complaint[]>([]);
  const [capaList, setCapaList] = useState<InstitutionalCorrectiveAction[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [undertakingText, setUndertakingText] = useState('');
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [evidenceReference, setEvidenceReference] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    loadPortalData();
  }, [institutionPid]);

  const loadPortalData = async () => {
    setIsLoading(true);
    try {
      const [allCases, capas] = await Promise.all([
        api.getCases({}),
        api.getCorrectiveActions(institutionPid)
      ]);
      // Strict Institutional Scoping: Only cases for this institution, hiding confidential
      const instCases = allCases.filter(
        c => c.institutionPid === institutionPid && !c.confidentialFromInstitution
      );
      setCases(instCases);
      setCapaList(capas);
      if (instCases.length > 0 && !selectedCaseId) {
        setSelectedCaseId(instCases[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !undertakingText.trim()) {
      setErrorNotice('Please select a case and enter a formal undertaking statement.');
      return;
    }

    setIsSubmitting(true);
    setErrorNotice(null);
    try {
      const newCapa = await api.submitCapa({
        institutionPid,
        caseId: selectedCaseId,
        undertakingText: undertakingText.trim(),
        targetDate: new Date(targetDate).toISOString(),
        evidenceReference: evidenceReference.trim() || undefined
      });
      setCapaList([newCapa, ...capaList]);
      setSuccessNotice(`CAPA Undertaking successfully recorded for Case ${selectedCaseId}. Status: PENDING_VERIFICATION.`);
      setUndertakingText('');
      setEvidenceReference('');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to submit CAPA undertaking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Institution Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white">Sri Krishna College of Engineering & Technology</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-amber-400 border border-slate-700">
                  PID: {institutionPid}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 font-bold">
                  Nodal Officer Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Coimbatore, Tamil Nadu &bull; Southern Regional Jurisdiction &bull; Cumulative Institutional Index (CII): Grade A (Score: 850)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right sm:border-r border-slate-800 sm:pr-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Cases Under Ingestion</p>
              <p className="text-lg font-mono font-bold text-white">{cases.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Active Undertakings</p>
              <p className="text-lg font-mono font-bold text-teal-400">{capaList.length}</p>
            </div>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Grid: Cases and CAPA Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Cases requiring institutional response */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Grievances Pertaining to Your Institution</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {cases.length}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500">Zero Risk-Score Exposure</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading institutional grievances...</div>
          ) : cases.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-900 border border-slate-800">
              No active grievances registered against your institution PID at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border transition-all space-y-2.5 cursor-pointer ${
                    selectedCaseId === c.id
                      ? 'bg-slate-900 border-teal-500/50 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => setSelectedCaseId(c.id)}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {c.id}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {c.category}
                      </span>
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded">
                        {c.sourceBureau}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>SLA: {c.daysRemainingSla ?? 30} days</span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-200">{c.subject}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{c.sanitizedText}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-500">Filed by: {c.complainantType}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCaseId(c.id);
                      }}
                      className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 transition-colors"
                    >
                      <span>Draft CAPA for this Case</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Submit Formal CAPA Undertaking */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Submit Corrective Action Plan (CAPA)</h3>
                <p className="text-[11px] text-slate-400">Formal regulatory undertaking to AICTE Bureaus</p>
              </div>
            </div>

            <form onSubmit={handleSubmitCapa} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Selected Case ID</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Target Compliance Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Evidence Reference / Bank Transaction ID</label>
                <input
                  type="text"
                  value={evidenceReference}
                  onChange={(e) => setEvidenceReference(e.target.value)}
                  placeholder="e.g. RTGS-REF-84920492 / Circular No. 44"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Institutional Undertaking Statement</label>
                <textarea
                  value={undertakingText}
                  onChange={(e) => setUndertakingText(e.target.value)}
                  rows={4}
                  required
                  placeholder="Formal undertaking by Head of Institution: Full refund of withheld caution deposit / Release of original marksheets executed. Evidence documented."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs leading-relaxed focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Statutory Notice:</p>
                <p>
                  All CAPA submissions are committed directly to the cryptographic audit chain and remain in <span className="text-amber-400 font-bold">PENDING_VERIFICATION</span> until validated by an AICTE bureau officer.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedCaseId}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Recording Undertaking in Audit Chain...</span>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Submit Formal CAPA Undertaking</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Submitted CAPA Log */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center justify-between">
              <span>Active Institutional Undertakings</span>
              <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                {capaList.length} Recorded
              </span>
            </h4>

            {capaList.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No CAPA undertakings submitted yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {capaList.map((item) => (
                  <div
                    key={item.id || item.undertakingText}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-amber-400 font-bold">{item.caseId}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                        item.status === 'COMPLIED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-200 text-[11px] leading-relaxed font-medium">{item.undertakingText}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Target: {new Date(item.targetDate).toLocaleDateString()}</span>
                      {item.evidenceReference && <span>Ref: {item.evidenceReference}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
