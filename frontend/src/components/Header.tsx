import React, { useState } from 'react';
import { Persona } from '../types';
import { INITIAL_PERSONAS } from '../services/seedData';
import { Shield, Bell, ChevronDown, Plus, Upload, Globe, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

interface HeaderProps {
  currentPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  breachedCount: number;
  overlapCount: number;
  onOpenCreateCase: () => void;
  onOpenBulkImport: () => void;
  onOpenLoginModal: () => void;
  onNavigateTab: (tab: string) => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  onSelectPersona,
  selectedRegion,
  onSelectRegion,
  breachedCount,
  overlapCount,
  onOpenCreateCase,
  onOpenBulkImport,
  onOpenLoginModal,
  onNavigateTab,
  onRefreshData
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const regions = [
    'All Regions',
    'Northern',
    'Southern',
    'Western',
    'Eastern',
    'South-Western',
    'South-Central'
  ];

  const totalAlerts = breachedCount + overlapCount;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold text-lg border border-amber-300/30">
              <Shield className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  AICTE <span className="text-amber-400">SAMANVAY</span>
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  समन्वय 2.0
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  AIR-GAPPED
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Integrated Cross-Bureau Grievance & Regulatory Intelligence Framework
              </p>
            </div>
          </div>

          <button 
            onClick={onRefreshData}
            title="Refresh State"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors md:hidden"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Region Selector */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
            <Globe className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
            <select
              value={selectedRegion}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer pr-1 text-xs"
            >
              {regions.map((reg) => (
                <option key={reg} value={reg} className="bg-slate-900 text-slate-200">
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Officer Enterprise Login Trigger */}
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all shadow-sm"
            title="Real enterprise login using BCrypt credentials, short-lived JWT, and RFC 6238 TOTP MFA"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Officer Login (MFA)</span>
          </button>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
            >
              <span className={`w-2 h-2 rounded-full ${currentPersona.role === 'ROLE_APEX_ADMIN' ? 'bg-amber-400' : currentPersona.role === 'ROLE_PGRC_OFFICER' ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
              <span className="hidden sm:inline font-mono text-slate-400">Persona:</span>
              <span className="text-white font-semibold">{currentPersona.name.split(' ')[0]}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded border ${currentPersona.badgeColor}`}>
                {currentPersona.bureau}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hidden md:inline">
                DEMO
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Switch Role Persona (RBAC)</p>
                </div>
                {INITIAL_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPersona(p);
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors ${currentPersona.id === p.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0 mt-0.5">
                      {p.avatarText}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
                        {currentPersona.id === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1 py-0.2 rounded text-[9px] border ${p.badgeColor}`}>{p.bureau}</span>
                        <span>{p.defaultRegion}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              className="relative p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {totalAlerts}
                </span>
              )}
            </button>

            {showNotificationMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-400" /> Real-time System Alerts
                  </span>
                  <span className="text-[10px] text-slate-400">{totalAlerts} Active</span>
                </div>

                <div className="py-2 space-y-2">
                  {overlapCount > 0 && (
                    <div 
                      onClick={() => {
                        onNavigateTab('overlaps');
                        setShowNotificationMenu(false);
                      }}
                      className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{overlapCount} Cross-Bureau Overlaps Pending</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        High correlation detected between PGRC and Regulation Bureau cases. Coordination hearing required.
                      </p>
                    </div>
                  )}

                  {breachedCount > 0 && (
                    <div 
                      onClick={() => {
                        onNavigateTab('cases');
                        setShowNotificationMenu(false);
                      }}
                      className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 text-red-400 font-semibold text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{breachedCount} Complaints Exceeded SLA Deadline</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Auto-escalated to Regional Director. Immediate inquiry intervention required.
                      </p>
                    </div>
                  )}

                  {totalAlerts === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No critical SLA breaches or uncoordinated overlaps detected.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action: Bulk Import */}
          <button
            onClick={onOpenBulkImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Bulk Import</span>
          </button>

          {/* Quick Action: New Case */}
          <button
            onClick={onOpenCreateCase}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Case</span>
          </button>

          <button 
            onClick={onRefreshData}
            title="Refresh All Data"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors hidden md:block"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
