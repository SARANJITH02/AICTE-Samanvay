import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
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
import { ComplainantTrackingPortal } from './components/ComplainantTrackingPortal';
import { SmsEmailSimulatorModal } from './components/SmsEmailSimulatorModal';
import { GuidedDemoModal } from './components/GuidedDemoModal';
import { RootCauseAnalyticsCard } from './components/RootCauseAnalyticsCard';
import { SeasonalForecastChart } from './components/SeasonalForecastChart';
import { ModelEvaluationCard } from './components/ModelEvaluationCard';
import { api, onBackendStatusChange } from './services/api';
import { INITIAL_PERSONAS } from './services/seedData';
import { SupportedLanguage } from './services/i18n';
import { Complaint, CaseOverlap, StatsSummary, GraphData, Persona, OverlapStatus, ComplaintStatus, Institution } from './types';
import { LayoutDashboard, Network, Scale, RefreshCw, AlertTriangle, X, WifiOff, FileText, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ModalErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Modal Render Crash Caught by ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl p-6 max-w-md text-center shadow-2xl">
            <h3 className="text-lg font-bold text-rose-300 mb-2">Modal Rendering Error</h3>
            <p className="text-xs text-slate-400 mb-4">{this.state.error?.message || 'Component failed to render.'}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg transition-colors"
            >
              Close &amp; Recover
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  // Authentication State: persist in localStorage for real prototype session management
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('samanvay_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentPersona, setCurrentPersona] = useState<Persona>(() => {
    if (currentUser) {
      const match = INITIAL_PERSONAS.find(p => p.role === currentUser.role || p.bureau === currentUser.bureau);
      if (match) return match;
    }
    return INITIAL_PERSONAS[3]; // Default Apex Admin
  });

  const [selectedRegion, setSelectedRegion] = useState<string>('All Regions');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overlaps' | 'graph' | 'analytics'>('dashboard');
  const [isGuidedDemoOpen, setIsGuidedDemoOpen] = useState(false);
  const [selectedOverlapIndex, setSelectedOverlapIndex] = useState<number>(0);
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
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<Complaint | null>(null);
  const [auditCaseId, setAuditCaseId] = useState<string>('CMP-2026-PGRC-001');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTrackingPortalOpen, setIsTrackingPortalOpen] = useState(false);
  const [isSmsSimulatorOpen, setIsSmsSimulatorOpen] = useState(false);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  // Subscribe to backend connectivity events
  useEffect(() => {
    return onBackendStatusChange((online) => {
      setIsBackendOnline(online);
    });
  }, []);

  // Load all platform data
  const loadPlatformData = async () => {
    setIsLoading(true);
    try {
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

  // Reactively handle new case creation and update state immutably
  const handleCaseCreated = (newCase?: Complaint) => {
    if (newCase) {
      setCases(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)]);
      setAllCases(prev => [newCase, ...prev.filter(c => c.id !== newCase.id)]);
      setStats(prev => {
        if (!prev) return null;
        const isPgrc = newCase.sourceBureau === 'PGRC' || (newCase as any).source_bureau === 'PGRC';
        const isRb = newCase.sourceBureau === 'REGULATION_BUREAU' || (newCase as any).source_bureau === 'REGULATION_BUREAU';
        return {
          ...prev,
          totalCases: prev.totalCases + 1,
          activePgrc: isPgrc ? prev.activePgrc + 1 : prev.activePgrc,
          activeRegulationBureau: isRb ? prev.activeRegulationBureau + 1 : prev.activeRegulationBureau
        };
      });
    }
    loadPlatformData();
  };

  useEffect(() => {
    if (currentUser) {
      loadPlatformData();
    }
  }, [selectedRegion, currentPersona, selectedBureau, selectedStatus, searchQuery, currentUser]);

  // Login handler
  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('samanvay_auth_user', JSON.stringify(user));
    } catch {}
    const match = INITIAL_PERSONAS.find(p => p.role === user.role || p.bureau === user.bureau) || INITIAL_PERSONAS[3];
    setCurrentPersona(match);
    if (user.region && user.region !== 'All Regions') {
      setSelectedRegion(user.region);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('samanvay_auth_user');
    } catch {}
  };

  // Overlap resolution handler
  const handleResolveOverlap = async (
    overlapId: number,
    action: OverlapStatus,
    leadBureau?: string,
    notes?: string
  ) => {
    // 1. Instantly update the parent card's status badge in local state
    setOverlaps(prev => prev.map(o => o.id === overlapId ? { ...o, status: action, leadBureau: (leadBureau as any) || o.leadBureau } : o));

    // 2. Show immediate green toast
    setGlobalToast("Coordination Directives Dispatched: Lead Bureau Assigned & Audit Block Chained.");
    setTimeout(() => setGlobalToast(null), 5000);

    // 3. Persist and refresh
    await api.resolveOverlap(overlapId, action, leadBureau, notes, currentUser?.fullName || currentPersona.name);
    await loadPlatformData();
    setIsOverlapModalOpen(false);
  };

  // Case status update handler
  const handleUpdateCaseStatus = async (id: string, newStatus: ComplaintStatus, remarks: string) => {
    await api.updateStatus(id, newStatus, remarks, currentUser?.fullName || currentPersona.name);
    await loadPlatformData();
    setSelectedCaseDetail(null);
  };

  // 1. GATE: If not logged in, render dedicated full-page Login Portal
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenTracking={() => setIsTrackingPortalOpen(true)}
        />
        <ComplainantTrackingPortal
          isOpen={isTrackingPortalOpen}
          onClose={() => setIsTrackingPortalOpen(false)}
        />
      </>
    );
  }

  const pendingOverlaps = overlaps.filter(o => o.status === 'PENDING_COORDINATION');
  const breachedCount = stats?.breachedSla || 0;

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'}`}>
      
      {/* 1. Header with Authenticated Officer Profile and Real Logout */}
      <Header
        currentPersona={currentPersona}
        currentUser={currentUser}
        onLogout={handleLogout}
        selectedRegion={selectedRegion}
        onSelectRegion={setSelectedRegion}
        breachedCount={breachedCount}
        overlapCount={pendingOverlaps.length}
        onOpenCreateCase={() => setIsCreateCaseOpen(true)}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
        onNavigateTab={(tab) => {
          if (tab === 'overlaps') {
            setSelectedOverlapIndex(0);
            setIsOverlapModalOpen(true);
          } else if (tab === 'dashboard' || tab === 'graph' || tab === 'analytics') {
            setActiveTab(tab);
          }
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
                <span className="font-bold text-amber-200">AIR-GAPPED HIGH-ASSURANCE MODE:</span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  The application is operating in self-contained air-gapped mode. All verification algorithms, audit validations, and ML correlations run fully offline.
                </p>
              </div>
            </div>
            <button
              onClick={loadPlatformData}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
            >
              Verify Connection
            </button>
          </div>
        )}

        {/* Streamlined Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Global Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('overlaps')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'overlaps' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Scale className="w-4 h-4" />
              <span>Cross-Bureau Conflicts</span>
              {pendingOverlaps.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-[10px] text-white font-black animate-pulse">
                  {pendingOverlaps.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'graph' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Network className="w-4 h-4" />
              <span>Institution Topology</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Analytics &amp; Forecasts</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>AICTE Samanvay 2.0 &bull; Regulatory Harmonization</span>
          </div>
        </div>

        {/* TAB 1: Global Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            {stats && (
              <KpiMetrics
                stats={stats}
                cases={selectedRegion && selectedRegion !== 'All Regions' ? cases : (allCases.length >= cases.length ? allCases : cases)}
                onFilterBureau={setSelectedBureau}
                onFilterStatus={setSelectedStatus}
                onNavigateTab={(tab) => {
                  if (tab === 'overlaps') {
                    setSelectedOverlapIndex(0);
                    setIsOverlapModalOpen(true);
                  } else if (tab === 'dashboard' || tab === 'graph') {
                    setActiveTab(tab);
                  }
                }}
              />
            )}

            {/* High-Visibility Overlap Alert Banner */}
            <OverlapBanner
              pendingCount={pendingOverlaps.length}
              onOpenResolution={() => {
                setSelectedOverlapIndex(0);
                setIsOverlapModalOpen(true);
              }}
            />

            {/* Regional Regulatory Risk Heatmap Card */}
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

        {/* TAB 2: Cross-Bureau Conflicts Dedicated Screen */}
        {activeTab === 'overlaps' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  Active Cross-Bureau Grievance &amp; Regulatory Conflicts
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated correlation engine detecting contradictory directives between Public Grievances (PGRC) and Institutional Inspections (Regulation Bureau).
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedOverlapIndex(0);
                  setIsOverlapModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
              >
                <Scale className="w-4 h-4 text-slate-950" />
                <span>Open Side-by-Side Resolution Console</span>
              </button>
            </div>

            {overlaps.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Unresolved Bureau Conflicts</h3>
                <p className="text-xs text-slate-400">All cross-bureau grievances and regulatory inquiries are currently aligned.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {overlaps.map((o, idx) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setSelectedOverlapIndex(idx);
                      setIsOverlapModalOpen(true);
                    }}
                    className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-amber-500/60 cursor-pointer transition-all hover:translate-y-[-2px] space-y-4 relative overflow-hidden group"
                  >
                    {/* Top Row: Institution & Score */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                          PID: {o.institution?.pid || o.caseA.institutionPid} &bull; {o.institution?.region || o.caseA.region} Region
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mt-0.5">
                          {o.institution?.name || o.caseA.institutionName}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-amber-400">
                          {Math.round(o.hybridScore * 100)}%
                        </span>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Match Score</p>
                      </div>
                    </div>

                    {/* Contradiction Alert Badge */}
                    <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-300">CONTRADICTORY DIRECTIVE RISK:</span>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {o.caseA.sourceBureau} issued order regarding <span className="font-semibold text-white">"{o.caseA.subject.slice(0, 45)}..."</span> while {o.caseB.sourceBureau} has active proceeding <span className="font-semibold text-white">"{o.caseB.subject.slice(0, 45)}..."</span>.
                        </p>
                      </div>
                    </div>

                    {/* Cases Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-emerald-400">PGRC Case</span>
                          <span className="font-mono text-[10px] text-slate-400">{o.caseA.id}</span>
                        </div>
                        <p className="text-slate-200 font-medium text-xs line-clamp-2">{o.caseA.subject}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-cyan-400">Regulation Bureau</span>
                          <span className="font-mono text-[10px] text-slate-400">{o.caseB.id}</span>
                        </div>
                        <p className="text-slate-200 font-medium text-xs line-clamp-2">{o.caseB.subject}</p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.status === 'PENDING_COORDINATION'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : o.status === 'LINKED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : o.status === 'MERGED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                      }`}>
                        {o.status === 'LINKED' ? 'JOINT INQUIRY' : o.status.replace(/_/g, ' ')}
                      </span>

                      <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 group-hover:underline">
                        <span>Resolve in Split Screen Console</span>
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Cytoscape Relationship Graph */}
        {activeTab === 'graph' && graphData && (
          <InstitutionGraph
            data={graphData}
            onSelectCase={(id) => {
              const found = cases.find(c => c.id === id);
              if (found) setSelectedCaseDetail(found);
            }}
            onFilterInstitution={(pid) => {
              setSearchQuery(pid);
              setActiveTab('dashboard');
            }}
            selectedRegion={selectedRegion}
          />
        )}

        {/* TAB 4: Advanced Predictive Regulatory AI Analytics & Forecasts */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn pt-2 pb-6">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Advanced Predictive Regulatory Analytics &amp; Anomaly Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Continuous statistical surveillance combining Institutional Composite Integrity Index, 3&sigma; NLP Root-Cause Anomalies, Academic Influx Forecasting, and Model Evaluation.
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

      </main>

      {/* 3. Global Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-4 px-4 lg:px-8 text-center text-xs text-slate-400 space-y-1">
        <p>
          AICTE Samanvay 2.0 &bull; National Regulatory &amp; Grievance Harmonization Platform &bull; 100% Air-Gapped High-Assurance Architecture
        </p>
        <p className="text-[11px] text-slate-500">
          Governed under the All India Council for Technical Education Act, 1987 &bull; Supporting statutory compliance pursuant to Section 63 BSA, 2023
        </p>
      </footer>

      {/* MODALS WRAPPED IN ERROR BOUNDARY */}
      <ModalErrorBoundary>
        {/* 1. Overlap Split Resolution Console */}
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
          initialIndex={selectedOverlapIndex}
        />

        {/* 2. Case Details / Regulatory Action Drawer */}
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
          onSuccess={handleCaseCreated}
        />

        {/* 5. Direct Case Audit Chain Modal (from Case Detail) */}
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

        {/* 6. Public Citizen Grievance Tracking Portal with OTP */}
        <ComplainantTrackingPortal
          isOpen={isTrackingPortalOpen}
          onClose={() => setIsTrackingPortalOpen(false)}
        />

        {/* 7. Air-Gapped Outbox SMS / Email Simulator */}
        <SmsEmailSimulatorModal
          isOpen={isSmsSimulatorOpen}
          onClose={() => setIsSmsSimulatorOpen(false)}
        />

        {/* 8. Interactive Guided Demo Walkthrough (SIH Canonical Scenario) */}
        <GuidedDemoModal
          isOpen={isGuidedDemoOpen}
          onClose={() => setIsGuidedDemoOpen(false)}
          onOpenOverlaps={() => {
            setActiveTab('overlaps');
            setIsGuidedDemoOpen(false);
          }}
          onOpenAudit={(caseId) => {
            setAuditCaseId(caseId);
            setIsAuditModalOpen(true);
            setIsGuidedDemoOpen(false);
          }}
          onOpenTracking={() => {
            setIsTrackingPortalOpen(true);
            setIsGuidedDemoOpen(false);
          }}
          onOpenCaseDetail={(caseId) => {
            const foundCase = cases.find(c => c.id === caseId) || allCases.find(c => c.id === caseId);
            if (foundCase) {
              setSelectedCaseDetail(foundCase);
            }
          }}
        />
      </ModalErrorBoundary>

      {/* Global Action Toast Banner */}
      {globalToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{globalToast}</span>
        </div>
      )}

    </div>
  );
};
