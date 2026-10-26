import React from 'react';
import { MapPin, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert, Building2 } from 'lucide-react';
import { Institution, Complaint, CaseOverlap } from '../types';

interface RegionalRiskHeatmapCardProps {
  institutions: Institution[];
  complaints: Complaint[];
  overlaps: CaseOverlap[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

interface RegionStat {
  region: string;
  avgCii: number;
  grade: 'A' | 'B' | 'C' | 'D';
  activeCases: number;
  overlapCount: number;
  dominantViolation: string;
  riskStatus: 'STABLE' | 'MODERATE WATCH' | 'ELEVATED ALERT' | 'CRITICAL RISK';
  institutionCount: number;
}

export const RegionalRiskHeatmapCard: React.FC<RegionalRiskHeatmapCardProps> = ({
  institutions,
  complaints,
  overlaps,
  selectedRegion,
  onSelectRegion
}) => {
  const REGIONS = ['Northern', 'Southern', 'Western', 'Eastern', 'South-Western', 'South-Central'];

  const regionalStats: RegionStat[] = REGIONS.map(reg => {
    const isMatch = (itemRegion: string) => {
      const r = itemRegion.toLowerCase();
      const target = reg.toLowerCase();
      if (target === 'south-central') return r === 'south-central' || r === 'central';
      return r === target;
    };

    const regInsts = institutions.filter(i => isMatch(i.region));
    const regComplaints = complaints.filter(c => isMatch(c.region));
    const regOverlaps = overlaps.filter(o => isMatch(o.caseA.region));

    const avgCii = regInsts.length > 0
      ? Math.round(regInsts.reduce((acc, curr) => acc + (curr.ciiScore || 750), 0) / regInsts.length)
      : 760;

    const grade: 'A' | 'B' | 'C' | 'D' =
      avgCii >= 800 ? 'A' : avgCii >= 650 ? 'B' : avgCii >= 500 ? 'C' : 'D';

    // Calculate dominant category
    const catCounts: Record<string, number> = {};
    regComplaints.forEach(c => {
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    });
    let dominantViolation = 'General Inquiry';
    let maxCount = 0;
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantViolation = cat;
      }
    });

    let riskStatus: 'STABLE' | 'MODERATE WATCH' | 'ELEVATED ALERT' | 'CRITICAL RISK' = 'STABLE';
    if (grade === 'D' || regOverlaps.length >= 3) {
      riskStatus = 'CRITICAL RISK';
    } else if (grade === 'C' || regOverlaps.length >= 2) {
      riskStatus = 'ELEVATED ALERT';
    } else if (grade === 'B') {
      riskStatus = 'MODERATE WATCH';
    }

    return {
      region: reg,
      avgCii,
      grade,
      activeCases: regComplaints.length,
      overlapCount: regOverlaps.length,
      dominantViolation,
      riskStatus,
      institutionCount: regInsts.length
    };
  });

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Regional Regulatory Risk Heatmap Matrix
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 font-mono">
                CII Weighted
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Cross-bureau institutional integrity index &amp; complaint density across 6 AICTE administrative regions
            </p>
          </div>
        </div>

        {selectedRegion !== 'All Regions' && (
          <button
            onClick={() => onSelectRegion('All Regions')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
          >
            Reset Filter (Show All Regions)
          </button>
        )}
      </div>

      {/* Grid of Regions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {regionalStats.map(stat => {
          const isSelected = selectedRegion.toLowerCase() === stat.region.toLowerCase();
          const gradeColor =
            stat.grade === 'A'
              ? 'text-emerald-400'
              : stat.grade === 'B'
              ? 'text-amber-400'
              : stat.grade === 'C'
              ? 'text-orange-400'
              : 'text-red-400';

          const gradeBadge =
            stat.grade === 'A'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : stat.grade === 'B'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : stat.grade === 'C'
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
              : 'bg-red-500/20 text-red-300 border-red-500/40';

          const statusBadge =
            stat.riskStatus === 'STABLE'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              : stat.riskStatus === 'MODERATE WATCH'
              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
              : stat.riskStatus === 'ELEVATED ALERT'
              ? 'bg-orange-950/60 text-orange-300 border-orange-800'
              : 'bg-red-950/80 text-red-300 border-red-600 animate-pulse';

          const ciiPercent = Math.min(100, Math.max(10, Math.round((stat.avgCii / 1000) * 100)));

          return (
            <div
              key={stat.region}
              onClick={() => onSelectRegion(isSelected ? 'All Regions' : stat.region)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              {/* Region Title & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{stat.region} Region</span>
                  {isSelected && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                  {stat.riskStatus}
                </span>
              </div>

              {/* CII Progress Meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Average Composite Integrity:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono font-black ${gradeColor}`}>
                      {stat.avgCii}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${gradeBadge}`}>
                      Grade {stat.grade}
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stat.grade === 'A'
                        ? 'bg-emerald-500'
                        : stat.grade === 'B'
                        ? 'bg-amber-500'
                        : stat.grade === 'C'
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${ciiPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Active Grievances</span>
                  <span className="font-mono font-bold text-slate-200 text-xs">
                    {stat.activeCases} Cases
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Cross-Bureau Overlaps</span>
                  <span className={`font-mono font-bold text-xs ${stat.overlapCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {stat.overlapCount} Collisions
                  </span>
                </div>
              </div>

              {/* Dominant Violation */}
              <div className="text-[11px] flex items-center justify-between text-slate-400 pt-0.5">
                <span>Top Violation Vector:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[140px]" title={stat.dominantViolation}>
                  {stat.dominantViolation}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
