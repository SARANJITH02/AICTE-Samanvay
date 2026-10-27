import React, { useState } from 'react';
import { Persona } from '../types';
import { INITIAL_PERSONAS } from '../services/seedData';
import { SupportedLanguage, t } from '../services/i18n';
import {
  Shield, Bell, ChevronDown, Plus, Upload, Globe, CheckCircle2,
  AlertTriangle, AlertCircle, RefreshCw, KeyRound, SearchCheck, Send,
  Languages, Type, Sparkles, LogOut, User
} from 'lucide-react';

interface HeaderProps {
  currentPersona: Persona;
  currentUser?: any;
  onLogout: () => void;
  onSelectPersona?: (persona: Persona) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  breachedCount: number;
  overlapCount: number;
  onOpenCreateCase: () => void;
  onOpenBulkImport: () => void;
  onNavigateTab: (tab: string) => void;
  onRefreshData: () => void;
  language?: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
  fontSize?: 'sm' | 'md' | 'lg';
  onSelectFontSize?: (size: 'sm' | 'md' | 'lg') => void;
  onOpenTrackingPortal?: () => void;
  onOpenOutboxSimulator?: () => void;
  onOpenGuidedDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  currentUser,
  onLogout,
  onSelectPersona,
  selectedRegion,
  onSelectRegion,
  breachedCount,
  overlapCount,
  onOpenCreateCase,
  onOpenBulkImport,
  onNavigateTab,
  onRefreshData,
  language = 'en',
  onSelectLanguage = () => {},
  fontSize = 'md',
  onSelectFontSize = () => {},
  onOpenTrackingPortal = () => {},
  onOpenOutboxSimulator = () => {},
  onOpenGuidedDemo = () => {}
}) => {
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
          
          {/* Language Switcher (Item 16) */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-200" role="group" aria-label="Language Selector">
            <button
              onClick={() => onSelectLanguage('en')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              title="English"
              aria-pressed={language === 'en'}
            >
              EN
            </button>
            <button
              onClick={() => onSelectLanguage('hi')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'hi' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              title="हिन्दी (Hindi)"
              aria-pressed={language === 'hi'}
            >
              हिन्दी
            </button>
            <button
              onClick={() => onSelectLanguage('ta')}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'ta' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              title="தமிழ் (Tamil)"
              aria-pressed={language === 'ta'}
            >
              தமிழ்
            </button>
          </div>

          {/* Text-Size Accessibility Toggle (Item 21 - GIGW Standard) */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-200" role="group" aria-label="Text Size Accessibility">
            <button
              onClick={() => onSelectFontSize('sm')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${fontSize === 'sm' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white'}`}
              title="Standard Font Size"
              aria-label="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={() => onSelectFontSize('md')}
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${fontSize === 'md' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white'}`}
              title="Default Font Size"
              aria-label="Default font size"
            >
              A
            </button>
            <button
              onClick={() => onSelectFontSize('lg')}
              className={`px-1.5 py-0.5 rounded text-sm font-bold ${fontSize === 'lg' ? 'bg-slate-700 text-amber-400' : 'text-slate-400 hover:text-white'}`}
              title="Enlarged Font Size (Accessible)"
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Region Selector */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
            <Globe className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
            <select
              value={selectedRegion}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer pr-1 text-xs"
              aria-label="Filter cases by regional jurisdiction"
            >
              {regions.map((reg) => (
                <option key={reg} value={reg} className="bg-slate-900 text-slate-200">
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Public Complainant Tracking Portal Trigger (Item 13) */}
          <button
            onClick={onOpenTrackingPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
            title="Public Complainant Case Tracking & OTP Verification Portal"
            aria-label="Open Public Complainant Tracking Portal"
          >
            <SearchCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Track Grievance</span>
          </button>

          {/* Logged In Officer Profile Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0">
              {currentUser?.fullName ? currentUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : (currentPersona?.avatarText || 'OF')}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-white font-bold leading-tight truncate max-w-[140px]">
                {currentUser?.fullName || currentPersona.name}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {currentUser?.bureau || currentPersona.bureau} &bull; {selectedRegion}
              </span>
            </div>
          </div>

          {/* Explicit Officer Log Out Action */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition-all shadow-sm"
            title="Sign out of officer portal session"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Log Out</span>
          </button>

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

                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowNotificationMenu(false);
                      onOpenOutboxSimulator();
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-semibold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      <span>SMS / Email Dispatch Simulator</span>
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-300 font-mono">Air-Gapped</span>
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* Guided Demo Launcher */}
          <button
            onClick={onOpenGuidedDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm"
            title="Launch Interactive 7-Step SIH Guided Demo Walkthrough"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Guided Demo</span>
          </button>

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
