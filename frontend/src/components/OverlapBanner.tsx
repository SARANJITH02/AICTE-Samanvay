import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

interface OverlapBannerProps {
  pendingCount: number;
  onOpenResolution: () => void;
}

export const OverlapBanner: React.FC<OverlapBannerProps> = ({
  pendingCount,
  onOpenResolution
}) => {
  if (pendingCount <= 0) return null;

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/70 border-2 border-amber-500/50 p-4 sm:p-5 shadow-2xl shadow-amber-950/40 relative overflow-hidden">
      {/* Decorative pulse element */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
        
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ⚠️ Potential Overlapping Cases — Coordination Required
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black uppercase tracking-wider">
                {pendingCount} Flagged
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-amber-200/80 mt-1">
              AI Hybrid Similarity Engine detected concurrent PGRC student grievances &amp; Regulation Bureau systemic probes filed against the same AICTE institution PID (<code className="text-amber-300 font-mono">1-48920194</code>).
            </p>
          </div>
        </div>

        <button
          onClick={onOpenResolution}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 shrink-0 group"
        >
          <Sparkles className="w-4 h-4" />
          <span>Resolve Overlaps &amp; Lead Bureau</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>

      </div>
    </div>
  );
};
