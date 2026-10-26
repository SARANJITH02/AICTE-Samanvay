import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KpiMetrics } from './components/KpiMetrics';
import { OverlapBanner } from './components/OverlapBanner';
import { CaseList } from './components/CaseList';
import { OverlapModal } from './components/OverlapModal';
import { InstitutionGraph } from './components/InstitutionGraph';
import { AuditChainViewer } from './components/AuditChainViewer';
import { CaseDetailModal } from './components/CaseDetailModal';
import { BulkImportModal } from './components/BulkImportModal';
import { CreateCaseModal } from './components/CreateCaseModal';
import { RegionalRiskHeatmapCard } from './components/RegionalRiskHeatmapCard';
import { RootCauseAnalyticsCard } from './components/RootCauseAnalyticsCard';
import { SeasonalForecastChart } from './components/SeasonalForecastChart';
import { ModelEvaluationCard } from './components/ModelEvaluationCard';
import { OfficerLoginModal } from './components/OfficerLoginModal';
import { ComplainantTrackingPortal } from './components/ComplainantTrackingPortal';
import { SmsEmailSimulatorModal } from './components/SmsEmailSimulatorModal';
import { InstitutionPortalView } from './components/InstitutionPortalView';
import { GuidedDemoModal } from './components/GuidedDemoModal';
import { api, onBackendStatusChange } from './services/api';
import { INITIAL_PERSONAS } from './services/seedData';
import { SupportedLanguage } from './services/i18n';
import { Complaint, CaseOverlap, StatsSummary, GraphData, Persona, OverlapStatus, ComplaintStatus, Institution } from './types';
import { LayoutDashboard, Network, Scale, Lock, RefreshCw, AlertTriangle, X, Sparkles, BarChart3, WifiOff, Building } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPersona, setCurrentPersona] = useState<Persona>(INITIAL_PERSONAS[3]); // Default Apex Admin
  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'graph' | 'overlaps' | 'audit' | 'analytics' | 'institution'>('dashboard');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Core Data State
  const [cases, setCases] = useState<Complaint[]>([]);
  const [allCases, setAllCases] = useState<Complaint[]>([]);
  const [overlaps, setOverlaps] = useState<CaseOverlap[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedBureau, setSelectedBureau] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isOverlapModalOpen, setIsOverlapModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<Complaint | null>(null);
  const [auditCaseId, setAuditCaseId] = useState<string>('CMP-2026-PGRC-001');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTrackingPortalOpen, setIsTrackingPortalOpen] = useState(false);
  const [isSmsSimulatorOpen, setIsSmsSimulatorOpen] = useState(false);
  const [isGuidedDemoOpen, setIsGuidedDemoOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);

  // Subscribe to backend connectivity events
  useEffect(() => {
    return onBackendStatusChange((online) => {
      setIsBackendOnline(online);
    });
  }, []);

  // Load all data
  const loadPlatformData = async () => {
    setIsLoading(true);
    try {
      // Use selectedRegion as the active filter; if "All Regions" is chosen, pass undefined to fetch all
      const activeRegionFilter = selectedRegion && selectedRegion !== 'All Regions' ? selectedRegion : undefined;

      const [casesData, allCasesData, overlapsData, statsData, gData, instsData] = await Promise.all([
        api.getCases({
          region: activeRegionFilter,
          bureau: selectedBureau || undefined,
          status: selectedStatus || undefined,
          search: searchQuery || undefined
        }),
        api.getCases({}),
        api.getOverlaps(),
        api.getStats(activeRegionFilter),
        api.getGraphData(),
        api.getInstitutions()
      ]);

      setCases(casesData);
      setAllCases(allCasesData);
      setOverlaps(overlapsData);
      setStats(statsData);
      setGraphData(gData);
      setInstitutions(instsData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, [selectedRegion, currentPersona, selectedBureau, selectedStatus, searchQuery]);

  // Persona switch handler: sets persona and synchronizes default jurisdiction region
  const handleSelectPersona = (p: Persona) => {
    setCurrentPersona(p);
    setSelectedRegion(p.defaultRegion || 'All Regions');
    if (p.role === 'ROLE_INSTITUTION_NODAL') {
      setActiveTab('institution');
    } else if (activeTab === 'institution') {
      setActiveTab('dashboard');
    }
  };

  // Overlap resolution handler
  const handleResolveOverlap = async (
    overlapId: number,
    action: OverlapStatus,
    leadBureau?: string,
    notes?: string
  ) => {
    await api.resolveOverlap(overlapId, action, leadBureau, notes, currentPersona.name);
    await loadPlatformData();
    setIsOverlapModalOpen(false); // Auto-close modal as soon as status is changed
  };

  // Case status update handler: saves status and auto-closes the modal
  const handleUpdateCaseStatus = async (id: string, newStatus: ComplaintStatus, remarks: string) => {
    await api.updateStatus(id, newStatus, remarks, currentPersona.name);
    await loadPlatformData();
    setSelectedCaseDetail(null); // Auto close modal upon status update
  };

  const pendingOverlaps = overlaps.filter(o => o.status === 'PENDING_COORDINATION');
  const breachedCount = stats?.breachedSla || 0;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'}`}>
      
      {/* 1. Header / Persona Switcher / Region / Global Actions */}
      <Header
        currentPersona={currentPersona}
        onSelectPersona={handleSelectPersona}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
        breachedCount={breachedCount}
        overlapCount={pendingOverlaps.length}
        onOpenCreateCase={() => setIsCreateCaseOpen(true)}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onNavigateTab={(tab) => {
          if (tab === 'overlaps') setIsOverlapModalOpen(true);
          else setActiveTab(tab as any);
        }}
        onRefreshData={loadPlatformData}
        language={language}
        onSelectLanguage={setLanguage}
        fontSize={fontSize}
        onSelectFontSize={setFontSize}
        onOpenTrackingPortal={() => setIsTrackingPortalOpen(true)}
        onOpenOutboxSimulator={() => setIsSmsSimulatorOpen(true)}
        onOpenGuidedDemo={() => setIsGuidedDemoOpen(true)}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        
        {/* Backend Connectivity Status Alert Banner */}
        {!isBackendOnline && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="font-bold text-amber-200">BACKEND DISCONNECTED (OFFLINE CACHE ACTIVE):</span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Spring Boot API service is unreachable. The application is operating in air-gapped cached state. Live mutations will queue locally until reconnection.
                </p>
              </div>
            </div>
            <button
              onClick={loadPlatformData}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
            >
              Retry Reconnection
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Global Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'graph' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Institution Topology (Cytoscape)</span>
            </button>

            <button
              onClick={() => setActiveTab('overlaps')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'overlaps' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Cross-Bureau Conflicts</span>
              {pendingOverlaps.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Audit Hash Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Analytics &amp; Forecasts</span>
            </button>

            <button
              onClick={() => setActiveTab('institution')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'institution' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Institution Portal</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono hidden md:block">
            SIH Problem Statement 26264 &bull; AICTE Samanvay
          </div>
        </div>

        {/* TAB 1: Global Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            {stats && (
              <KpiMetrics
                stats={stats}
                onFilterBureau={setSelectedBureau}
                onFilterStatus={setSelectedStatus}
                onNavigateTab={(tab) => {
                  if (tab === 'overlaps') setIsOverlapModalOpen(true);
                  else setActiveTab(tab as any);
                }}
              />
            )}

            {/* High-Visibility Overlap Alert Banner */}
            <OverlapBanner
              pendingCount={pendingOverlaps.length}
              onOpenResolution={() => setIsOverlapModalOpen(true)}
            />

            {/* Features 3 & 5: Regional Regulatory Risk Heatmap Card */}
            <RegionalRiskHeatmapCard
              institutions={institutions}
              complaints={allCases}
              overlaps={overlaps}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
            />

            {/* Filterable Case Table */}
            <CaseList
              cases={cases}
              onSelectCase={(id) => {
                const found = cases.find(c => c.id === id);
                if (found) setSelectedCaseDetail(found);
              }}
              onOpenAudit={(id) => {
                setAuditCaseId(id);
                setIsAuditModalOpen(true);
              }}
              selectedBureau={selectedBureau}
              onSelectBureau={setSelectedBureau}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
            />
          </div>
        )}

        {/* TAB 2: Cytoscape Relationship Graph */}
        {activeTab === 'graph' && graphData && (
          <InstitutionGraph
            data={graphData}
            onSelectCase={(id) => {
              const found = cases.find(c => c.id === id);
              if (found) setSelectedCaseDetail(found);
            }}
            selectedRegion={selectedRegion}
          />
        )}

        {/* TAB 3: Cross-Bureau Overlaps Dedicated Screen */}
        {activeTab === 'overlaps' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  Active Cross-Bureau Grievance &amp; Regulatory Overlaps
                </h2>
                <p className="text-xs text-slate-400">
                  AI-detected institutional correlations between individual grievances (PGRC) and systemic inspections (Regulation Bureau).
                </p>
              </div>

              <button
                onClick={() => setIsOverlapModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              >
                Open Side-by-Side Console
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overlaps.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setIsOverlapModalOpen(true)}
                  className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all hover:translate-y-[-2px] space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                        Target Institution PID: {o.institution?.pid || o.caseA.institutionPid}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">{o.institution?.name || o.caseA.institutionName}</h3>
                    </div>
                    <span className="text-xl font-black text-amber-400">
                      {Math.round(o.hybridScore * 100)}%
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-emerald-400">Case A ({o.caseA.sourceBureau}):</p>
                      <p className="text-slate-200 font-medium">{o.caseA.subject}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-cyan-400">Case B ({o.caseB.sourceBureau}):</p>
                      <p className="text-slate-200 font-medium">{o.caseB.subject}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${o.status === 'PENDING_COORDINATION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                    <span className="text-amber-400 font-semibold text-xs flex items-center gap-1">
                      Resolve in Split Screen &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Cryptographic Audit Explorer */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Cryptographic Hash Chain Inspector</h3>
                <p className="text-xs text-slate-400">
                  Select any complaint case to verify its sequential SHA-256 genesis hash chain live.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Target Case:</span>
                <select
                  value={auditCaseId}
                  onChange={(e) => setAuditCaseId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.institutionName.slice(0, 24)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <AuditChainViewer caseId={auditCaseId} />
          </div>
        )}

        {/* TAB 5: Advanced Regulatory AI Analytics & Forecasts */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-150 pt-2 pb-6">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Advanced Predictive Regulatory Analytics &amp; Anomaly Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Continuous statistical surveillance combining Institutional Composite Integrity Index (CII), 3&sigma; NLP Root-Cause Anomalies, and Academic Influx Forecasting.
              </p>
            </div>

            {/* Regional Risk Matrix */}
            <div className="pt-1">
              <RegionalRiskHeatmapCard
                institutions={institutions}
                complaints={allCases}
                overlaps={overlaps}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
              />
            </div>

            {/* Dual Analytics Grid: Statistical Root Causes & Seasonal Predictor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
              <RootCauseAnalyticsCard selectedRegion={selectedRegion} />
              <SeasonalForecastChart selectedRegion={selectedRegion} />
            </div>

            {/* AI Overlap Engine Model Evaluation Card */}
            <div className="pt-2">
              <ModelEvaluationCard />
            </div>
          </div>
        )}

        {/* TAB 6: Institution Response Portal (Item 20) */}
        {activeTab === 'institution' && (
          <InstitutionPortalView
            institutionPid="INST-SOU-001"
            institutionName="Madras Institute of Technology"
          />
        )}

      </main>

      {/* 3. Global Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-4 px-4 lg:px-8 text-center text-xs text-slate-400 space-y-1">
        <p>
          AICTE Samanvay Platform &bull; Smart India Hackathon Problem Statement 26264 &bull; 100% Air-Gapped High-Assurance Architecture
        </p>
        <p className="text-[11px] text-slate-500">
          Air-Gapped Mode &bull; Seed Data: Synthetic AICTE Regulatory Benchmark (db/seed.sql) &bull; Designed to support evidentiary verification pursuant to Section 63 BSA, 2023
        </p>
      </footer>

      {/* MODALS */}
      {/* 0. Enterprise Officer Login Modal */}
      <OfficerLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(u) => {
          handleSelectPersona({
            id: u.username,
            name: u.fullName || u.username,
            role: u.role,
            bureau: u.bureau,
            badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
            avatarText: (u.username || 'OF').slice(0, 2).toUpperCase(),
            defaultRegion: u.region || 'All Regions',
            description: u.role
          });
          loadPlatformData();
        }}
      />

      {/* 1. Overlap Split Console */}
      <OverlapModal
        overlaps={overlaps}
        isOpen={isOverlapModalOpen}
        onClose={() => setIsOverlapModalOpen(false)}
        onResolve={handleResolveOverlap}
        onInspectAudit={(id) => {
          setIsOverlapModalOpen(false);
          setAuditCaseId(id);
          setIsAuditModalOpen(true);
        }}
      />

      {/* 2. Case Details / Workspace Drawer */}
      <CaseDetailModal
        complaint={selectedCaseDetail}
        isOpen={selectedCaseDetail !== null}
        onClose={() => setSelectedCaseDetail(null)}
        onUpdateStatus={handleUpdateCaseStatus}
        onOpenAudit={(id) => {
          setSelectedCaseDetail(null);
          setAuditCaseId(id);
          setIsAuditModalOpen(true);
        }}
      />

      {/* 3. Bulk CSV Ingestion Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={loadPlatformData}
      />

      {/* 4. New Case Registration Modal */}
      <CreateCaseModal
        isOpen={isCreateCaseOpen}
        onClose={() => setIsCreateCaseOpen(false)}
        onSuccess={loadPlatformData}
      />

      {/* 5. Direct Case Audit Chain Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Cryptographic Audit Chain:</span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">{auditCaseId}</span>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-100px)]">
              <AuditChainViewer caseId={auditCaseId} onClose={() => setIsAuditModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* 6. Citizen Grievance Tracking Portal (Item 13) */}
      <ComplainantTrackingPortal
        isOpen={isTrackingPortalOpen}
        onClose={() => setIsTrackingPortalOpen(false)}
      />

      {/* 7. Air-Gapped Outbox SMS / Email Simulator (Item 19) */}
      <SmsEmailSimulatorModal
        isOpen={isSmsSimulatorOpen}
        onClose={() => setIsSmsSimulatorOpen(false)}
      />

      {/* 8. Interactive Guided Demo Walkthrough (Item 22) */}
      <GuidedDemoModal
        isOpen={isGuidedDemoOpen}
        onClose={() => setIsGuidedDemoOpen(false)}
        onOpenOverlaps={() => setIsOverlapModalOpen(true)}
        onOpenAudit={(caseId) => {
          setAuditCaseId(caseId);
          setIsAuditModalOpen(true);
        }}
        onOpenTracking={() => setIsTrackingPortalOpen(true)}
        onOpenCaseDetail={(caseId) => {
          const c = cases.find(x => x.id === caseId) || allCases.find(x => x.id === caseId);
          if (c) setSelectedCaseDetail(c);
        }}
      />

    </div>
  );
};
