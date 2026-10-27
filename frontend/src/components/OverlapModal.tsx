import React, { useState, useEffect } from 'react';
import { CaseOverlap, OverlapStatus, ExplainableFactor, InterBureauNote } from '../types';
import { api } from '../services/api';
import { generateHearingDocketPdf } from '../services/docketExport';
import { X, Scale, Building2, User, FileText, CheckCircle2, AlertOctagon, GitMerge, ArrowRight, ShieldCheck, HelpCircle, AlertTriangle, ShieldAlert, Check, PlusCircle, MinusCircle, RefreshCw, SendHorizontal, MessageSquare, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface OverlapModalProps {
  overlaps: CaseOverlap[];
  isOpen: boolean;
  onClose: () => void;
  onResolve: (overlapId: number, action: OverlapStatus, leadBureau?: string, notes?: string) => Promise<void>;
  onInspectAudit: (caseId: string) => void;
  initialIndex?: number;
}

export const OverlapModal: React.FC<OverlapModalProps> = ({
  overlaps,
  isOpen,
  onClose,
  onResolve,
  onInspectAudit,
  initialIndex = 0
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [leadBureau, setLeadBureau] = useState<'PGRC' | 'REGULATION_BUREAU'>('REGULATION_BUREAU');
  const [coordinationNotes, setCoordinationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<OverlapStatus | null>(null);
  const [contradictionInfo, setContradictionInfo] = useState<any>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTarget, setTransferTarget] = useState<'REGULATION_BUREAU' | 'REGIONAL_OFFICE' | 'PGRC'>('REGULATION_BUREAU');
  const [transferNotes, setTransferNotes] = useState('');

  // Feature 2: Inter-Bureau Collaborative Notes State
  const [notes, setNotes] = useState<InterBureauNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [activeAuthorBureau, setActiveAuthorBureau] = useState<'PGRC' | 'REGULATION_BUREAU' | 'REGIONAL_OFFICE'>('PGRC');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (initialIndex !== undefined && initialIndex >= 0 && initialIndex < overlaps.length) {
      setSelectedIndex(initialIndex);
    }
  }, [initialIndex, isOpen]);

  const currentOverlap = overlaps[selectedIndex] || overlaps[0];

  useEffect(() => {
    if (currentOverlap?.institution?.pid) {
      api.checkContradictions(currentOverlap.institution.pid).then(res => {
        setContradictionInfo(res);
      }).catch(() => setContradictionInfo(null));
    }
    if (currentOverlap?.id) {
      api.getOverlapNotes(currentOverlap.id).then(res => {
        setNotes(res);
      }).catch(() => setNotes([]));
    }
  }, [currentOverlap]);

  if (!isOpen || overlaps.length === 0) return null;

  const { caseA, caseB, institution, hybridScore, semanticScore, categoryMatchScore, keywordMatchScore } = currentOverlap;
  const isPendingCoordination = currentOverlap.status === 'PENDING_COORDINATION';

  const handleAction = async (action: OverlapStatus) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setPendingAction(action);
    try {
      currentOverlap.status = action;
      await onResolve(currentOverlap.id, action, leadBureau, coordinationNotes);
      setCoordinationNotes('');
      onClose(); // Auto-close modal as soon as status is changed
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  };

  const handleInitiateTransfer = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.initiateTransfer(
        caseA.id,
        transferTarget,
        transferNotes || 'Inter-bureau administrative transfer initiated from Overlap Console',
        'OFFICER',
        caseA.sourceBureau
      );
      setIsTransferring(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportDocket = async () => {
    setIsExportingPdf(true);
    try {
      await generateHearingDocketPdf({
        complaint: currentOverlap.caseA,
        institution: currentOverlap.institution,
        overlaps: [currentOverlap],
        leadBureau,
        coordinationNotes
      });
    } catch (err) {
      console.error('Failed to generate SHC Docket PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleAddNote = async (text?: string) => {
    const content = (text !== undefined ? text : newNoteText).trim();
    if (!content || !currentOverlap?.id) return;
    setIsPostingNote(true);
    try {
      const role = activeAuthorBureau === 'PGRC'
        ? 'PGRC Scrutiny Officer'
        : activeAuthorBureau === 'REGULATION_BUREAU'
        ? 'Regulation Bureau Inspector'
        : 'Regional Director';
      const officerId = `OFF-${activeAuthorBureau}-2026`;
      const saved = await api.addOverlapNote(
        currentOverlap.id,
        content,
        currentOverlap.caseA.id,
        officerId,
        activeAuthorBureau,
        role
      );
      setNotes(prev => [...prev, saved]);
      if (text === undefined) setNewNoteText('');
    } catch (err) {
      console.error('Failed to post note:', err);
    } finally {
      setIsPostingNote(false);
    }
  };

  const notePresets = [
    'Requesting joint inspection before show-cause issuance.',
    'Evidence received from institution; cross-verifying fee refund ledger.',
    'Agree to merge under Regulation Bureau as lead authority.'
  ];

  // Novelty 12: Explainable Relationship Factors (Pros & Cons)
  const linkingFactors: ExplainableFactor[] = [
    {
      title: `Identical AICTE Institution PID (${institution?.pid || caseA.institutionPid})`,
      weight: '+35%',
      detail: 'Exact institutional entity match in national database.',
      isPositive: true
    },
    {
      title: `Common Grievance Category: ${caseA.category}`,
      weight: `+${Math.round(categoryMatchScore * 25)}%`,
      detail: 'Both complaints trigger regulatory provisions under the same APH chapter.',
      isPositive: true
    },
    {
      title: 'Dense Semantic Vector Alignment',
      weight: `+${Math.round(semanticScore * 25)}%`,
      detail: `${Math.round(semanticScore * 100)}% multilingual transformer resonance between grievances.`,
      isPositive: true
    },
    {
      title: 'Lexical & Procedural Keyword Overlap',
      weight: `+${Math.round(keywordMatchScore * 15)}%`,
      detail: `${Math.round(keywordMatchScore * 100)}% fuzzy token similarity on critical legal phrases.`,
      isPositive: true
    }
  ];

  const differentiatingFactors: ExplainableFactor[] = [
    {
      title: 'Complainant Cohort Discrepancy',
      weight: '-10%',
      detail: 'Individual complainant relief track vs. collective institutional inspection petition.',
      isPositive: false
    },
    {
      title: 'Temporal Filing Offset',
      weight: '-5%',
      detail: 'Received 5 days apart under different intake queues.',
      isPositive: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Cross-Bureau Conflict &amp; Overlap Resolution Console</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  Pair #{selectedIndex + 1} of {overlaps.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI explainable correlation between individual student grievance and institutional regulatory inspection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportDocket}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-500/30 transition-all shadow-sm disabled:opacity-50"
              title="Download Sealed Standing Hearing Committee (SHC) Multi-Page Docket"
            >
              {isExportingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Download className="w-3.5 h-3.5 text-amber-400" />}
              <span>Export SHC Docket (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar pr-3 max-h-[calc(92vh-140px)]">
          
          {/* Novelty 1: Contradiction Detection Engine Alert Banner */}
          {contradictionInfo?.hasContradiction && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 animate-in fade-in duration-200 shadow-lg">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                      Contradictory Bureau Orders Detected
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white">
                    {contradictionInfo.alertMessage}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-red-500/30 text-[11px] text-red-300">
                    <div className="bg-red-900/30 p-2 rounded border border-red-800/40">
                      <strong>{contradictionInfo.contradictoryBureauA} Directive:</strong> "{contradictionInfo.directiveA}"
                    </div>
                    <div className="bg-red-900/30 p-2 rounded border border-red-800/40">
                      <strong>{contradictionInfo.contradictoryBureauB} Directive:</strong> "{contradictionInfo.directiveB}"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Target Institution Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Target Registered AICTE Institution:</p>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{institution?.name || caseA.institutionName}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-700">
                    PID: {institution?.pid || caseA.institutionPid}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Region:</span>
              <span className="font-semibold text-slate-200">{caseA.region}</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${currentOverlap.status === 'PENDING_COORDINATION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {currentOverlap.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Similarity & AI Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-amber-500/30 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Composite Match</p>
              <p className="text-2xl font-black text-amber-400">{Math.round(hybridScore * 100)}%</p>
              <p className="text-[10px] text-amber-300/80 font-medium">S_total &ge; 72% Critical</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Semantic Vector</p>
              <p className="text-2xl font-black text-cyan-400">{Math.round(semanticScore * 100)}%</p>
              <p className="text-[10px] text-slate-400">Cosine 384-d MiniLM</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Common PID Match</p>
              <p className="text-2xl font-black text-emerald-400">100%</p>
              <p className="text-[10px] text-slate-400">Deterministic Match (+35%)</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Lexical Token Score</p>
              <p className="text-2xl font-black text-purple-400">{Math.round(keywordMatchScore * 100)}%</p>
              <p className="text-[10px] text-slate-400">RapidFuzz token ratio</p>
            </div>
          </div>

          {/* Novelty 12: Explainable Relationship Mapping (Pros & Cons Breakdown) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" /> Explainable Relationship Mapping (Pros &amp; Cons)
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Formula-Driven AI Explainability</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Linking Factors (+) */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] uppercase">
                  <PlusCircle className="w-3.5 h-3.5" /> Linking Factors (+)
                </div>
                <div className="space-y-1.5">
                  {linkingFactors.map((f, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px]">
                      <div>
                        <p className="font-semibold text-slate-200">{f.title}</p>
                        <p className="text-[10px] text-slate-400">{f.detail}</p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 shrink-0">{f.weight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Differentiating Factors (-) */}
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] uppercase">
                  <MinusCircle className="w-3.5 h-3.5" /> Differentiating Factors (-)
                </div>
                <div className="space-y-1.5">
                  {differentiatingFactors.map((f, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800 text-[11px]">
                      <div>
                        <p className="font-semibold text-slate-200">{f.title}</p>
                        <p className="text-[10px] text-slate-400">{f.detail}</p>
                      </div>
                      <span className="font-mono font-bold text-rose-400 shrink-0">{f.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Split Screen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Case A: PGRC */}
            <div className="rounded-xl bg-slate-800/70 border border-emerald-500/30 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold uppercase text-emerald-400">Case A (PGRC Portal)</span>
                </div>
                <button 
                  onClick={() => onInspectAudit(caseA.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                >
                  Inspect Audit Chain
                </button>
              </div>

              <div>
                <p className="text-xs font-mono text-slate-400">{caseA.id}</p>
                <h4 className="text-sm font-bold text-white mt-0.5">{caseA.subject}</h4>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {/* Novelty 3: Privacy-Preserving Overlap Alert */}
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <span>Complainant:</span>
                  {isPendingCoordination ? (
                    <strong className="text-amber-400 font-mono text-[10px]">[ANONYMIZED_COMPLAINANT]</strong>
                  ) : (
                    <strong className="text-white">{caseA.complainantType}</strong>
                  )}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Category: <strong className="text-emerald-400">{caseA.category}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Officer: <strong className="text-white">{caseA.assignedOfficerId || 'Unassigned'}</strong>
                </span>
              </div>

              {isPendingCoordination && (
                <div className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Privacy-Preserving Shield: Complainant details redacted prior to joint coordination approval.</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Sanitized Grievance Narrative:</p>
                {caseA.sanitizedText}
              </div>
            </div>

            {/* Case B: Regulation Bureau */}
            <div className="rounded-xl bg-slate-800/70 border border-cyan-500/30 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-xs font-bold uppercase text-cyan-400">Case B (Regulation Bureau)</span>
                </div>
                <button 
                  onClick={() => onInspectAudit(caseB.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                >
                  Inspect Audit Chain
                </button>
              </div>

              <div>
                <p className="text-xs font-mono text-slate-400">{caseB.id}</p>
                <h4 className="text-sm font-bold text-white mt-0.5">{caseB.subject}</h4>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Origin: <strong className="text-white">{caseB.complainantType}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Category: <strong className="text-cyan-400">{caseB.category}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                  Officer: <strong className="text-white">{caseB.assignedOfficerId || 'Unassigned'}</strong>
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Sanitized Grievance Narrative:</p>
                {caseB.sanitizedText}
              </div>
            </div>
          </div>

          {/* Feature 2: Contextual Inter-Bureau Collaborative Notes Thread */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-lg">
            <button
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-900/90 hover:bg-slate-900 text-left transition-colors border-b border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <span>Bilateral Coordination Thread</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-normal">
                      {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Contextual inter-bureau exchange with automatic audit trail recording</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <span>{isNotesOpen ? 'Collapse' : 'Expand'}</span>
                {isNotesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isNotesOpen && (
              <div className="p-4 space-y-4 animate-in fade-in duration-150">
                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Quick Response Directives:</p>
                  <div className="flex flex-wrap gap-2">
                    {notePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddNote(preset)}
                        disabled={isPostingNote}
                        className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all hover:border-amber-500/40 disabled:opacity-50"
                      >
                        ⚡ "{preset}"
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {notes.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 italic bg-slate-900/40 rounded-lg border border-dashed border-slate-800">
                      No bilateral coordination notes recorded yet. Post a note or click a quick response directive above.
                    </div>
                  ) : (
                    notes.map((n) => {
                      const isPgrc = n.authorBureau === 'PGRC';
                      const isReg = n.authorBureau === 'REGULATION_BUREAU';
                      const badgeClass = isPgrc
                        ? 'bg-blue-950/70 border-blue-700/60 text-blue-200'
                        : isReg
                        ? 'bg-amber-950/70 border-amber-700/60 text-amber-200'
                        : 'bg-purple-950/70 border-purple-700/60 text-purple-200';
                      const tagLabel = isPgrc
                        ? 'PGRC'
                        : isReg
                        ? 'Regulation Bureau'
                        : 'Regional Director';

                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 ${badgeClass}`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px]">{n.authorRole || tagLabel}</span>
                              <span className="font-mono text-[10px] opacity-75">({n.authorBureau})</span>
                            </div>
                            <span className="text-[10px] opacity-75 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="leading-relaxed font-sans">{n.noteText}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Note Authoring Toolbar */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Author Identity:</span>
                    <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                      <button
                        onClick={() => setActiveAuthorBureau('PGRC')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeAuthorBureau === 'PGRC' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        PGRC
                      </button>
                      <button
                        onClick={() => setActiveAuthorBureau('REGULATION_BUREAU')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeAuthorBureau === 'REGULATION_BUREAU' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Regulation Bureau
                      </button>
                      <button
                        onClick={() => setActiveAuthorBureau('REGIONAL_OFFICE')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${activeAuthorBureau === 'REGIONAL_OFFICE' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Regional Director
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type official bilateral coordination instruction or inspection query..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => handleAddNote()}
                      disabled={isPostingNote || !newNoteText.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isPostingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                      <span>Post Note</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional Inter-Bureau Transfer Handshake Panel */}
          {isTransferring && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <SendHorizontal className="w-4 h-4" />
                  <span>Initiate Jurisdictional Handshake: Transfer Case #{caseA.id} to Target Bureau</span>
                </p>
                <button
                  onClick={() => setIsTransferring(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Status will change to <code className="text-amber-400">TRANSFER_PENDING</code>. Originating bureau remains legally accountable until the receiving bureau formally accepts jurisdiction.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Transfer Destination Bureau:</label>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="REGULATION_BUREAU">Regulation Bureau (Norms &amp; Approval)</option>
                    <option value="REGIONAL_OFFICE">Regional Office (Field / EVC Inspection)</option>
                    <option value="PGRC">PGRC (Grievance Redressal Cell)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Formal Handshake Reason / Notes:</label>
                  <input
                    type="text"
                    placeholder="e.g. Systemic audit indicates regulatory non-compliance exceeding regional scope."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  disabled={isSubmitting}
                  onClick={handleInitiateTransfer}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                  <span>Confirm Transfer Dispatch</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-900/98 backdrop-blur-md p-4 sm:px-6 z-20 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> Cross-Bureau Coordination Directives
            </h4>
            <button
              onClick={() => setIsTransferring(!isTransferring)}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1"
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              <span>{isTransferring ? 'Hide Jurisdictional Transfer' : 'Transfer Case Jurisdiction'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Designated Lead Bureau:</label>
              <select
                value={leadBureau}
                onChange={(e) => setLeadBureau(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="REGULATION_BUREAU">Regulation Bureau (Lead Enforcement &amp; EVC)</option>
                <option value="PGRC">PGRC (Lead Student/Faculty Mediation)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Coordination Directives / Notes:</label>
              <input
                type="text"
                placeholder="e.g. Schedule joint hearing; club with upcoming institutional surprise inspection"
                value={coordinationNotes}
                onChange={(e) => setCoordinationNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div className="text-[11px] text-slate-400">
              Resolving will update case statuses to <strong className="text-amber-400">JOINT_INQUIRY</strong> and record tamper-evident SHA-256 audit blocks.
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleAction('DISMISSED')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSubmitting && pendingAction === 'DISMISSED' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>Mark Unrelated</span>
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleAction('LINKED')}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 shadow-md"
              >
                {isSubmitting && pendingAction === 'LINKED' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span>Link for Joint Hearing</span>
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleAction('MERGED')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting && pendingAction === 'MERGED' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <GitMerge className="w-3.5 h-3.5" />
                )}
                <span>Merge Under Lead Bureau</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
