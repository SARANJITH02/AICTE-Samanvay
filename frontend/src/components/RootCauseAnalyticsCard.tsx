import React, { useEffect, useState } from 'react';
import { AlertOctagon, TrendingUp, Sparkles, Send, ShieldAlert, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { RootCauseResponse, RootCauseCluster } from '../types';
import { api } from '../services/api';

interface RootCauseAnalyticsCardProps {
  selectedRegion: string;
}

export const RootCauseAnalyticsCard: React.FC<RootCauseAnalyticsCardProps> = ({ selectedRegion }) => {
  const [data, setData] = useState<RootCauseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [circularSentCluster, setCircularSentCluster] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRootCauseAnalytics(selectedRegion === 'All Regions' ? 'Southern' : selectedRegion);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch root cause analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedRegion]);

  const handleInitiateCircular = (cluster: RootCauseCluster) => {
    setCircularSentCluster(cluster.phrase);
    setTimeout(() => {
      setCircularSentCluster(null);
    }, 4000);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Regional Root-Cause &amp; Systemic Violation Anomaly Detector
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                Statistical Control Chart (Z &ge; 3.0)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Poisson rate baseline &amp; statistical process control chart detecting systemic institutional non-compliance
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Refresh statistical clustering"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Critical Systemic 3-Sigma Anomaly Alert Banner */}
      {data?.systemic_anomaly_detected && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 animate-in fade-in duration-200 shadow-lg space-y-2">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  STATISTICAL SYSTEMIC SURGE DETECTED (Z &ge; 3.0)
                </span>
                <span className="text-[10px] font-mono text-red-300/80">Region: {data.region}</span>
              </div>
              <p className="text-xs font-semibold text-white">
                {data.anomaly_alert_summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Circular Confirmation Toast */}
      {circularSentCluster && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <strong>AICTE Administrative Advisory Circular Dispatched:</strong> Formal regulatory directive on &ldquo;{circularSentCluster}&rdquo; issued to all affiliated colleges under APH Clause 14.1.
          </div>
        </div>
      )}

      {/* Clusters List */}
      <div className="space-y-3">
        {data?.top_clusters.map((cluster, idx) => {
          const isHighAnomaly = cluster.is_systemic_anomaly;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                isHighAnomaly
                  ? 'bg-slate-950/80 border-amber-500/40 hover:border-amber-400 shadow-md'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-mono">#{idx + 1}</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-100">{cluster.phrase}</span>
                  {isHighAnomaly && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                      3&sigma; Anomaly (Z = {cluster.z_score.toFixed(2)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Frequency: <strong className="text-white font-mono">{cluster.frequency}</strong> ({cluster.percentage}%)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Institutions: <strong className="text-amber-400 font-mono">{cluster.colleges_affected}</strong>
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">Recommended AICTE Action:</span>
                  <span className="text-slate-300">{cluster.recommended_action}</span>
                </div>

                <button
                  onClick={() => handleInitiateCircular(cluster)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>Initiate Regional Circular</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
