import React, { useState } from 'react';
import { api } from '../services/api';
import { PublicCaseTimeline } from '../types';
import { Search, ShieldCheck, CheckCircle2, Clock, Phone, AlertCircle, ArrowLeft, Send, Sparkles, Building2, FileText, Lock, X } from 'lucide-react';

interface ComplainantTrackingPortalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onBackToApp?: () => void;
  defaultCaseId?: string;
}

export const ComplainantTrackingPortal: React.FC<ComplainantTrackingPortalProps> = ({
  isOpen,
  onClose,
  onBackToApp,
  defaultCaseId = 'CMP-2026-PGRC-001'
}) => {
  const [caseId, setCaseId] = useState(defaultCaseId);
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<PublicCaseTimeline | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId.trim() || !mobileNumber.trim()) {
      setError('Please provide both your Case ID and registered mobile number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.requestTrackingOtp(caseId.trim(), mobileNumber.trim());
      setIsOtpSent(true);
      if (res.simulatedOtp) {
        setSimulatedOtpNotice(`[AIR-GAPPED SMS SIMULATOR] One-Time Password: ${res.simulatedOtp}`);
        setOtp(res.simulatedOtp); // Pre-fill for instant demo testing
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch verification OTP. Ensure the Case ID is valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.verifyTrackingOtp(caseId.trim(), mobileNumber.trim(), otp.trim());
      setTimelineData(data);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTimelineData(null);
    setIsOtpSent(false);
    setOtp('');
    setSimulatedOtpNotice(null);
    setError(null);
  };

  if (isOpen !== undefined && !isOpen) return null;

  const content = (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 max-w-4xl mx-auto w-full animate-fadeIn">
      {/* Top Header Card */}
      <div className="w-full text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Public Citizen Redressal Portal &bull; Air-Gapped High-Assurance</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Grievance Status & Redressal Tracker
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Track statutory milestone progression in real time without disclosing confidential investigator notes or internal bureau risk calculations.
        </p>
      </div>

      {/* Main Container */}
      {!timelineData ? (
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {simulatedOtpNotice && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono font-bold">{simulatedOtpNotice}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">Demo Auto-Fill</span>
            </div>
          )}

          {!isOtpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Grievance Case Identifier (Case ID)
                </label>
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="e.g. CMP-2026-PGRC-001"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-[11px] text-slate-500">Provided in your registration SMS / receipt.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Generating Verification OTP...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Verification OTP</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Enter 6-Digit Verification Code</span>
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Change Case ID
                  </button>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full text-center tracking-widest text-xl px-4 py-3 rounded-xl bg-slate-950 border border-blue-500/50 text-white font-mono font-bold focus:outline-none focus:border-blue-400 transition-colors"
                />
                <p className="text-[11px] text-slate-400 text-center">
                  Dispatched to {mobileNumber.slice(0, 3)}****{mobileNumber.slice(-3)} &bull; Valid for 10 minutes
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verifying Cryptographic OTP...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Track Grievance</span>
                  </>
                )}
              </button>
            </form>
          )}

          {onBackToApp && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onBackToApp}
                className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Enterprise Platform Dashboard</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Verified Timeline Status Card */
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-fadeIn space-y-6 p-6 sm:p-8">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                  {timelineData.caseId}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {timelineData.category}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg uppercase font-bold border ${
                  timelineData.status === 'DISPOSED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                  {timelineData.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white pt-1">{timelineData.subject}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{timelineData.institutionName}</span>
              </p>
            </div>

            {/* SLA Gauge Card */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Statutory Resolution SLA:</span>
              </div>
              <div className="text-sm font-bold font-mono text-white">
                {timelineData.status === 'DISPOSED' ? (
                  <span className="text-emerald-400">DISPOSED & RESOLVED</span>
                ) : (
                  <span className={timelineData.slaDaysRemaining <= 5 ? 'text-amber-400' : 'text-blue-400'}>
                    {timelineData.slaDaysRemaining} Days Remaining
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">Target: {timelineData.slaDeadline}</span>
            </div>
          </div>

          {/* Sanitized Public Fact Matrix */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Sanitized Grievance Statement (Public Record)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {timelineData.publicSummary}
            </p>
          </div>

          {/* 4-Step Milestone Progression */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Statutory Redressal Timeline & Milestone Verification
            </h4>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {timelineData.milestones.map((m) => {
                const isDone = m.status === 'COMPLETED';
                const isCurrent = m.status === 'IN_PROGRESS';

                return (
                  <div key={m.step} className="relative flex items-start gap-3">
                    {/* Milestone indicator */}
                    <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : isCurrent
                        ? 'bg-blue-500 text-slate-950 border-blue-400 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isDone ? '✓' : m.step}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{m.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {m.date}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isCurrent
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                          {m.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Guarantee */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Sanitized under Section 63 Bharatiya Sakshya Adhiniyam, 2023 &bull; AICTE Samanvay Air-Gapped Verification</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              >
                Track Another Case
              </button>
              {onBackToApp && (
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-y-auto p-4 sm:p-6">
          <button
            onClick={onClose || onBackToApp}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
            aria-label="Close Tracking Portal"
          >
            <X className="w-5 h-5" />
          </button>
          {content}
        </div>
      </div>
    );
  }

  return content;
};
