import React, { useState } from 'react';
import {
  X, ChevronRight, ChevronLeft, Sparkles, AlertTriangle, ShieldCheck,
  Scale, FileText, Lock, QrCode, SearchCheck, CheckCircle2, PlayCircle,
  ExternalLink, ShieldAlert
} from 'lucide-react';

interface GuidedDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOverlaps: () => void;
  onOpenAudit: (caseId: string) => void;
  onOpenTracking: () => void;
  onOpenCaseDetail: (caseId: string) => void;
}

interface DemoStep {
  step: number;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  summary: string;
  details: string[];
  actionLabel: string;
  onAction: () => void;
}

export const GuidedDemoModal: React.FC<GuidedDemoModalProps> = ({
  isOpen,
  onClose,
  onOpenOverlaps,
  onOpenAudit,
  onOpenTracking,
  onOpenCaseDetail
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const steps: DemoStep[] = [
    {
      step: 1,
      title: 'Simultaneous Grievance Filing (PGRC vs. Regulation Bureau)',
      badge: 'Step 1: Intake Discrepancy',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: <FileText className="w-5 h-5 text-blue-400" />,
      summary: 'Two uncoordinated grievances are filed against Madras Institute of Technology (INST-SOU-001): one by a student seeking capitation fee refund, and another by the Regulation Bureau freezing institutional disbursements.',
      details: [
        'PGRC Case #CMP-2026-PGRC-001: Student withdrawal within stipulated window; demands refund of ₹1,85,000.',
        'Regulation Bureau #CMP-2026-REG-002: Vigilance audit discovers 42 unapproved admissions; freezes disbursements.',
        'Historically, uncoordinated bureaus act independently, creating conflicting compliance directives.'
      ],
      actionLabel: 'View Case #CMP-2026-PGRC-001 Details',
      onAction: () => onOpenCaseDetail('CMP-2026-PGRC-001')
    },
    {
      step: 2,
      title: 'Real-Time Cross-Bureau Overlap Alert (92% Score)',
      badge: 'Step 2: AI Overlap Engine',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      summary: 'The air-gapped AI Engine runs RapidFuzz token matching + Multilingual 384-dimensional pgvector cosine similarity to automatically flag a 92% cross-bureau overlap before conflicting orders are dispatched.',
      details: [
        'Weights: w1 (PID Match: 0.35) + w2 (Semantic Cosine: 0.35) + w3 (Fuzzy Ratio: 0.15) + w4 (Category Match: 0.15).',
        'Evaluated on 150 benchmark complaint pairs (F1 score: 0.941).',
        'Immediate high-priority visual alert generated for both Bureau Officers and Apex Admin.'
      ],
      actionLabel: 'Open Cross-Bureau Overlap Console',
      onAction: onOpenOverlaps
    },
    {
      step: 3,
      title: 'Contradiction Flag: 2-Layer Directive Matrix Conflict',
      badge: 'Step 3: Statutory Safeguard',
      badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
      icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
      summary: 'The contradiction detection service analyzes the directive types and flags an irreconcilable conflict: PGRC has ordered RELEASE of student funds while Regulation Bureau has ordered WITHHOLD of institutional accounts.',
      details: [
        'Layer 1: Structured Conflict Matrix flags (RELEASE vs. WITHHOLD) as an administrative contradiction.',
        'Layer 2: Free-text regulatory keyword check verifies contradictory intent.',
        'UI highlights the exact conflicting phrases, preventing legal embarrassment for AICTE.'
      ],
      actionLabel: 'Inspect Conflict in Overlap Modal',
      onAction: onOpenOverlaps
    },
    {
      step: 4,
      title: 'Joint Inquiry Resolution & Lead Bureau Assignment',
      badge: 'Step 4: Harmonized Workflow',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: <Scale className="w-5 h-5 text-purple-400" />,
      summary: 'Apex Administration steps in, assigns Apex HQ as the Lead Bureau, schedules a joint Standing Hearing Committee (SHC) session, and consolidates the conflicting directives into a harmonized regulatory docket.',
      details: [
        'Prevents institution from playing bureaus against each other.',
        'Saves administrative hearing costs by holding one unified inquiry.',
        'Coordinates relief for 42 affected students under APH Chapter VI.'
      ],
      actionLabel: 'Examine Resolution Matrix',
      onAction: onOpenOverlaps
    },
    {
      step: 5,
      title: 'Cryptographic Audit Chain & Tamper Proof Simulation',
      badge: 'Step 5: Zero-Trust Integrity',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: <Lock className="w-5 h-5 text-emerald-400" />,
      summary: 'Every action is sealed in an append-only SHA-256 hash chain with Ed25519 officer digital signatures and periodic Merkle root checkpoints. A live "Simulate Tamper" button proves that modified records are immediately caught.',
      details: [
        'Ed25519 per-officer keypairs guarantee non-repudiation of all regulatory decisions.',
        'Merkle tree root computed over every 5 entries and signed with National Witness Key.',
        'Tamper simulator modifies a DB record to demonstrate visible verification failure and one-click cryptographic recovery.'
      ],
      actionLabel: 'Open Audit Chain & Test Tamper Verification',
      onAction: () => onOpenAudit('CMP-2026-PGRC-001')
    },
    {
      step: 6,
      title: 'Cryptographic QR-Sealed PDF Dossier & Section 63 BSA Certificate',
      badge: 'Step 6: Evidentiary Export',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: <QrCode className="w-5 h-5 text-amber-400" />,
      summary: 'The hearing docket export produces a sealed Standing Hearing Committee (SHC) dossier featuring a cryptographic QR code seal, chain verification status, and an official Section 63 Bharatiya Sakshya Adhiniyam (BSA), 2023 certificate.',
      details: [
        'Compliant with modern Indian evidentiary law (replaces Section 65B of former Evidence Act).',
        'Cryptographic QR code encodes SHA-256 hash payload for air-gapped offline document validation.',
        'Tamper-evident legal certificate signed by the designated AICTE Authorized Officer.'
      ],
      actionLabel: 'Inspect Case to Export SHC Docket (PDF)',
      onAction: () => onOpenCaseDetail('CMP-2026-PGRC-001')
    },
    {
      step: 7,
      title: 'Air-Gapped Complainant Tracking Portal (Citizen Access)',
      badge: 'Step 7: Transparent Redressal',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      icon: <SearchCheck className="w-5 h-5 text-cyan-400" />,
      summary: 'Citizens track their grievance status in real-time at /track using air-gapped simulated SMS OTP verification. The public view reveals SLA milestone timelines while strictly isolating internal risk scores and officer remarks.',
      details: [
        'Secure rate-limited OTP verification logged to air-gapped dispatch outbox.',
        'Public 4-stage timeline: Intake -> Joint Scrutiny -> Hearing -> Restitution.',
        'Zero leakage: Internal risk scores (0.78), officer IDs, and sensitive remarks are hidden from the public.'
      ],
      actionLabel: 'Launch Public Complainant Tracking Portal',
      onAction: onOpenTracking
    }
  ];

  const currentStep = steps[currentStepIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md transition-opacity duration-200 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AICTE Samanvay Guided Demo Mode</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SIH 2024
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-end 7-step scenario demonstration of air-gapped cross-bureau grievance harmonization
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300">Demo Scenario Progress</span>
            <span className="font-mono text-amber-400 font-bold">Step {currentStep.step} of {steps.length}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStepIdx(idx)}
                className={`h-2 rounded-full transition-all ${idx === currentStepIdx ? 'bg-amber-400 shadow-md shadow-amber-400/30' : idx < currentStepIdx ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                title={`Jump to Step ${s.step}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold border ${currentStep.badgeColor}`}>
                {currentStep.icon}
                <span>{currentStep.badge}</span>
              </span>
              <h4 className="text-lg font-bold text-white pt-1">
                {currentStep.title}
              </h4>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {currentStep.summary}
          </p>

          <div className="space-y-2">
            <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Technical &amp; Statutory Highlights:
            </p>
            <div className="space-y-2">
              {currentStep.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger for Current Step */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                currentStep.onAction();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>{currentStep.actionLabel}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
            disabled={currentStepIdx === 0}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>

          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            SIH Problem Statement 26264
          </span>

          <button
            onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}
            disabled={currentStepIdx === steps.length - 1}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
