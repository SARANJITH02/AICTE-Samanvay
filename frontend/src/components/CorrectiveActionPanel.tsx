import React, { useState, useEffect } from 'react';
import { InstitutionalCorrectiveAction } from '../types';
import { api } from '../services/api';
import { ClipboardCheck, CheckCircle2, AlertCircle, Clock, FileCheck, ShieldCheck, User } from 'lucide-react';

interface CorrectiveActionPanelProps {
  institutionPid: string;
}

export const CorrectiveActionPanel: React.FC<CorrectiveActionPanelProps> = ({ institutionPid }) => {
  const [actions, setActions] = useState<InstitutionalCorrectiveAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCapa();
  }, [institutionPid]);

  const loadCapa = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCorrectiveActions(institutionPid);
      setActions(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-3 text-xs text-slate-400 text-center">Loading institutional CAPA records...</div>;
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              Institutional Corrective Action Plan (CAPA)
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Post-Disposal Compliance
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Active regulatory monitoring of formal institutional undertakings beyond complainant relief.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {actions.map((act) => {
          const isPending = act.status === 'PENDING_VERIFICATION';
          const isComplied = act.status === 'COMPLIED';

          return (
            <div
              key={act.id || act.undertakingText}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    isComplied
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isPending
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {act.status.replace('_', ' ')}
                  </span>
                  {act.evidenceReference && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Ref: {act.evidenceReference}
                    </span>
                  )}
                </div>
                <p className="text-slate-200 font-medium leading-relaxed">
                  {act.undertakingText}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center gap-1 text-slate-300 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Target: {new Date(act.targetDate).toLocaleDateString()}</span>
                </div>
                {act.verifiedByOfficer && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>{act.verifiedByOfficer}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
