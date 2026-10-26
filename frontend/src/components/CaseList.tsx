import React, { useState } from 'react';
import { Complaint } from '../types';
import { Search, Filter, AlertTriangle, Shield, Clock, ExternalLink, Building2, User, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SlaProximityBadge } from './SlaProximityBadge';

interface CaseListProps {
  cases: Complaint[];
  onSelectCase: (caseId: string) => void;
  onOpenAudit: (caseId: string) => void;
  selectedBureau: string;
  onSelectBureau: (bureau: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedRegion?: string;
  onSelectRegion?: (region: string) => void;
}

export const CaseList: React.FC<CaseListProps> = ({
  cases,
  onSelectCase,
  onOpenAudit,
  selectedBureau,
  onSelectBureau,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  selectedRegion,
  onSelectRegion
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const categories = [
    'All Categories',
    'Fee Dispute',
    'Document Withholding',
    'Infrastructure',
    'Admission Anomaly'
  ];

  const filteredCases = cases.filter(c => {
    if (selectedCategory && selectedCategory !== 'All Categories' && c.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      
      {/* Search & Filter Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Case ID, Subject, Registered Institution Name or PID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Bureau Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs shrink-0">
            {['', 'PGRC', 'REGULATION_BUREAU', 'REGIONAL_OFFICE'].map((b) => (
              <button
                key={b}
                onClick={() => onSelectBureau(b)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 text-xs ${selectedBureau === b ? 'bg-slate-800 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {b === '' ? 'All Bureaus' : b === 'REGULATION_BUREAU' ? 'Regulation' : b === 'REGIONAL_OFFICE' ? 'Regional' : b}
              </button>
            ))}
          </div>

        </div>

        {/* Status & Category Sub-filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filters:
            </span>

            {/* Category dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => onSelectStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="UNDER_SCRUTINY">Under Scrutiny</option>
              <option value="JOINT_INQUIRY">Joint Inquiry</option>
              <option value="ESCALATED">Escalated</option>
              <option value="DISPOSED">Disposed</option>
            </select>

            {/* Active Regional Filter Pill */}
            {selectedRegion && selectedRegion !== 'All Regions' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                <span>Region Scope: <strong>{selectedRegion}</strong></span>
                {onSelectRegion && (
                  <button
                    onClick={() => onSelectRegion('All Regions')}
                    className="hover:text-white ml-0.5 font-bold"
                    title="Clear region scope filter"
                  >
                    &times;
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="text-slate-400 text-xs font-mono">
            Showing <strong className="text-white">{filteredCases.length}</strong> of {cases.length} cases
          </div>
        </div>
      </div>

      {/* High-Density Case Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Case ID &amp; Source</th>
              <th className="py-3 px-4">AICTE Institution</th>
              <th className="py-3 px-4">Category &amp; Subject</th>
              <th className="py-3 px-4">SLA Proximity</th>
              <th className="py-3 px-4">Delay Risk</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredCases.map((c) => {
              const isBreached = (c.daysRemainingSla || 0) < 0;
              const isNearBreach = (c.daysRemainingSla || 0) >= 0 && (c.daysRemainingSla || 0) <= 3;
              const isJointInquiry = c.status?.toUpperCase() === 'JOINT_INQUIRY';
              const isDisposed = c.status?.toUpperCase() === 'DISPOSED';
              const isEscalated = c.status?.toUpperCase() === 'ESCALATED';

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  {/* 1. Case ID & Bureau */}
                  <td className="py-3 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                        {c.id}
                      </span>
                      {c.hasOverlap && (
                        <span 
                          title="Cross-Bureau Overlap Flagged"
                          className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/40 flex items-center gap-0.5"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> OVERLAP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${c.sourceBureau === 'PGRC' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : c.sourceBureau === 'REGULATION_BUREAU' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'}`}>
                        {c.sourceBureau}
                      </span>
                      <span className="text-[10px] text-slate-400">{c.region}</span>
                    </div>
                  </td>

                  {/* 2. Institution */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200 line-clamp-1 max-w-[220px]">
                      {c.institutionName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      <span>PID: {c.institutionPid}</span>
                    </div>
                  </td>

                  {/* 3. Category & Subject */}
                  <td className="py-3 px-4 max-w-[300px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                        {c.category}
                      </span>
                      {c.isRecurring && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold uppercase tracking-tight">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-200 mt-1 line-clamp-1">
                      {c.subject}
                    </p>
                    {c.pendingEvidenceBlockers && c.pendingEvidenceBlockers.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-400 font-mono">
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
                          {c.pendingEvidenceBlockers[0]}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 4. SLA Countdown Pill (Frozen on DISPOSED) */}
                  <td className="py-3 px-4">
                    <SlaProximityBadge status={c.status} daysRemainingSla={c.daysRemainingSla} />
                  </td>

                  {/* 5. Delay Risk Meter */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(c.delayRiskScore || 0) >= 0.7 ? 'bg-red-500' : (c.delayRiskScore || 0) >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.round((c.delayRiskScore || 0) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {Math.round((c.delayRiskScore || 0) * 100)}%
                      </span>
                    </div>
                  </td>

                  {/* 6. Status Badge */}
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${isJointInquiry ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' : isEscalated ? 'bg-red-500/20 text-red-400 border-red-500/40' : isDisposed ? 'badge-disposed bg-slate-800 text-slate-400 border-slate-700' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* 7. Action */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenAudit(c.id)}
                        title="Verify Hash Chain Audit"
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
                      >
                        Audit
                      </button>
                      <button
                        onClick={() => onSelectCase(c.id)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
