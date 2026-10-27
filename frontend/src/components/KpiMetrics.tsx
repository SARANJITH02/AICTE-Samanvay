import React from 'react';
import { StatsSummary, Complaint } from '../types';
import { Files, FileText, Scale, AlertOctagon, Clock, CheckCircle, TrendingUp, Banknote, Users } from 'lucide-react';

interface KpiMetricsProps {
  stats: StatsSummary;
  cases?: Complaint[];
  onFilterBureau: (bureau: string) => void;
  onFilterStatus: (status: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({
  stats,
  cases,
  onFilterBureau,
  onFilterStatus,
  onNavigateTab
}) => {
  const reliefLakhs = stats.totalReliefDeliveredInr ? (stats.totalReliefDeliveredInr / 100000).toFixed(1) : '42.6';
  const impactedStudents = stats.totalImpactedStudents || 142;

  // Reactively derive counts from active cases state when provided
  const totalCasesCount = cases && cases.length > 0 ? cases.length : stats.totalCases;
  const activePgrcCount = cases && cases.length > 0
    ? cases.filter(c => (c.sourceBureau === 'PGRC' || (c as any).source_bureau === 'PGRC') && c.status !== 'DISPOSED').length
    : stats.activePgrc;
  const activeRbCount = cases && cases.length > 0
    ? cases.filter(c => (c.sourceBureau === 'REGULATION_BUREAU' || (c as any).source_bureau === 'REGULATION_BUREAU') && c.status !== 'DISPOSED').length
    : stats.activeRegulationBureau;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
      
      {/* 1. Total Cases */}
      <div 
        onClick={() => { onFilterBureau(''); onFilterStatus(''); }}
        className="glass-card rounded-xl p-4 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:translate-y-[-2px] group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Total Complaints</span>
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-slate-700 transition-colors">
            <Files className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-white">{totalCasesCount}</span>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            {Math.round(stats.overallResolutionRate * 100)}% Disposed
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Cross-bureau repository</p>
      </div>

      {/* 2. Active PGRC */}
      <div 
        onClick={() => { onFilterBureau('PGRC'); onFilterStatus(''); }}
        className="glass-card rounded-xl p-4 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all hover:translate-y-[-2px] group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">Active in PGRC</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-white">{activePgrcCount}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-medium">
            Student/Faculty
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Direct individual grievances</p>
      </div>

      {/* 3. Active Regulation Bureau */}
      <div 
        onClick={() => { onFilterBureau('REGULATION_BUREAU'); onFilterStatus(''); }}
        className="glass-card rounded-xl p-4 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all hover:translate-y-[-2px] group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-cyan-400/90">Regulation Bureau</span>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-white">{activeRbCount}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-medium">
            Systemic/APH
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Policy & compliance probes</p>
      </div>

      {/* 4. Overlapping Conflicts Detected */}
      <div 
        onClick={() => onNavigateTab('overlaps')}
        className="glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-950/20 hover:border-amber-500/60 cursor-pointer transition-all hover:translate-y-[-2px] group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Overlaps Detected</span>
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 group-hover:bg-amber-500/30 transition-colors">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-amber-400">{stats.pendingOverlaps}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase animate-pulse">
            Action Req.
          </span>
        </div>
        <p className="text-[11px] text-amber-300/80 mt-1">Multi-bureau collision risk</p>
      </div>

      {/* 5. SLA Breached */}
      <div 
        onClick={() => { onFilterBureau(''); onFilterStatus('ESCALATED'); }}
        className="glass-card rounded-xl p-4 border border-red-500/30 bg-red-950/20 hover:border-red-500/60 cursor-pointer transition-all hover:translate-y-[-2px] group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-400">SLA Breached</span>
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500/30 transition-colors">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-red-400">{stats.breachedSla}</span>
          <span className="text-[11px] text-red-300/90 font-medium">
            +{stats.nearBreachSla} Near Breach
          </span>
        </div>
        <p className="text-[11px] text-red-300/70 mt-1">Escalated to RD</p>
      </div>

      {/* 6. Relief Delivered (Novelty 14: Resolution Coverage & Affected Individuals Metric) */}
      <div 
        onClick={() => { onFilterBureau(''); onFilterStatus('DISPOSED'); }}
        className="glass-card rounded-xl p-4 border border-emerald-500/40 bg-emerald-950/25 hover:border-emerald-400/60 cursor-pointer transition-all hover:translate-y-[-2px] group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Relief Delivered</span>
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30 transition-colors">
            <Banknote className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-emerald-300">₹{reliefLakhs}L</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center gap-1">
            <Users className="w-3 h-3" />
            {impactedStudents}+
          </span>
        </div>
        <p className="text-[11px] text-emerald-400/80 mt-1">Systemic cohort restitution</p>
      </div>

    </div>
  );
};

