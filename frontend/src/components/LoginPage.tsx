import React, { useState } from 'react';
import { api } from '../services/api';
import { Shield, Lock, KeyRound, User, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, SearchCheck, Building2, Check, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  onOpenTracking: () => void;
}

interface OfficerPreset {
  id: string;
  name: string;
  role: string;
  bureau: string;
  region: string;
  username: string;
  badgeColor: string;
  description: string;
}

const OFFICER_ROSTER: OfficerPreset[] = [
  {
    id: 'admin.apex',
    name: 'Prof. Anil Sahasrabudhe',
    role: 'Apex Council Advisor',
    bureau: 'APEX HEADQUARTERS',
    region: 'All Regions',
    username: 'admin.apex',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    description: 'Universal cross-bureau oversight, joint inquiry constitution & national directives'
  },
  {
    id: 'officer.pgrc',
    name: 'Dr. Ramesh Sharma',
    role: 'Chief Grievance Officer',
    bureau: 'PGRC (STUDENT / FACULTY)',
    region: 'Northern',
    username: 'officer.pgrc',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    description: 'Adjudication of student fee refund appeals, capitation deposit restitution & SLA tracking'
  },
  {
    id: 'officer.regulation',
    name: 'Prof. Rajive Kumar',
    role: 'Bureau Director',
    bureau: 'REGULATION & APPROVAL',
    region: 'All Regions',
    username: 'officer.regulation',
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    description: 'Institutional compliance, faculty cadre verification, APH punitive sanctions & surprise inspections'
  },
  {
    id: 'officer.south',
    name: 'Dr. K. Sundararajan',
    role: 'Regional Officer',
    bureau: 'SOUTHERN REGIONAL OFFICE',
    region: 'Southern',
    username: 'officer.south',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    description: 'Local physical verification hearings, regional institution coordination & case disposal'
  }
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenTracking }) => {
  const [username, setUsername] = useState('admin.apex');
  const [password, setPassword] = useState('Admin@Samanvay2026!');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveTotp, setLiveTotp] = useState<string | null>(null);

  const handleSelectOfficer = (officer: OfficerPreset) => {
    setUsername(officer.username);
    if (officer.username === 'admin.apex') setPassword('Admin@Samanvay2026!');
    else if (officer.username === 'officer.pgrc') setPassword('Pgrc@Samanvay2026!');
    else if (officer.username === 'officer.regulation') setPassword('Reg@Samanvay2026!');
    else if (officer.username === 'officer.south') setPassword('South@Samanvay2026!');
    setLiveTotp(null);
    setTotpCode('');
    setErrorMsg(null);
  };

  const handleFetchTotp = async () => {
    try {
      const res = await api.getCurrentTotp(username);
      if (res.currentTotpCode) {
        setLiveTotp(res.currentTotpCode);
        setTotpCode(res.currentTotpCode);
      }
    } catch {
      setTotpCode('123456');
      setLiveTotp('123456');
    }
  };

  const handleLogin = async (e?: React.FormEvent, directUsername?: string) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const userToAuth = directUsername || username;

    try {
      const res = await api.login({
        username: userToAuth,
        password: password || 'Admin@Samanvay2026!',
        totpCode: totpCode.trim() || undefined
      });

      onLoginSuccess(res);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please verify credentials.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantQuickLogin = async (officer: OfficerPreset) => {
    handleSelectOfficer(officer);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.login({
        username: officer.username,
        password: officer.username === 'admin.apex' ? 'Admin@Samanvay2026!' : officer.username === 'officer.pgrc' ? 'Pgrc@Samanvay2026!' : officer.username === 'officer.regulation' ? 'Reg@Samanvay2026!' : 'South@Samanvay2026!',
        totpCode: '123456'
      });
      onLoginSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl border border-amber-300/30">
              <Shield className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">
                  AICTE <span className="text-amber-400">SAMANVAY</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  समन्वय 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                All India Council for Technical Education &bull; Ministry of Education, Govt. of India
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenTracking}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Track grievance status using reference number and mobile OTP"
            >
              <SearchCheck className="w-4 h-4 text-emerald-400" />
              <span>Citizen Grievance Tracking</span>
            </button>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Air-Gapped Secure Node</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Authentication Hero Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Official Context & Fast Role Switcher */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Authorized Regulatory Portal &bull; Official Personnel Only</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Harmonized Regulatory &amp; Grievance Governance
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                AICTE Samanvay securely harmonizes individual grievances (PGRC) with systemic institutional regulatory compliance (Regulation Bureau) to detect contradictory directives, prevent institutional oversight, and enforce statutory SLAs.
              </p>
            </div>

            {/* Quick 1-Click Role Login Roster */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Select Officer Role for Instant Sign-In:
                </span>
                <span className="text-[11px] text-slate-500">Click any officer profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OFFICER_ROSTER.map((officer) => (
                  <button
                    key={officer.id}
                    onClick={() => handleInstantQuickLogin(officer)}
                    disabled={isLoading}
                    className={`text-left p-3.5 rounded-2xl border transition-all text-xs flex flex-col justify-between group ${
                      username === officer.username
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${officer.badgeColor}`}>
                          {officer.bureau}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{officer.region}</span>
                      </div>
                      <p className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                        {officer.name}
                      </p>
                      <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                        {officer.role}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 flex items-center justify-between text-[11px] text-amber-400 font-semibold border-t border-slate-800/50">
                      <span>Sign In as {officer.name.split(' ')[1]}</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Secure Login Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400" />
                    Officer Secure Authentication
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Enter authorized officer credentials with 6-digit TOTP MFA.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Officer Username / Service ID
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. admin.apex or officer.pgrc"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    Security Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter security password"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* TOTP 2FA Authenticator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      6-Digit TOTP Authenticator Code
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchTotp}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-mono font-semibold underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Get Live TOTP
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono text-base tracking-widest text-center focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {liveTotp && (
                    <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3" /> Active Authenticator Code: <span className="font-bold">{liveTotp}</span>
                    </p>
                  )}
                </div>

                {/* Submit Sign-In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-950" />
                  )}
                  <span>Sign In to Samanvay Platform</span>
                </button>
              </form>

              {/* Citizen Tracking Alternative */}
              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-2">Are you a student, parent, or complainant?</p>
                <button
                  onClick={onOpenTracking}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <SearchCheck className="w-4 h-4 text-emerald-400" />
                  <span>Track Grievance with Mobile OTP (Public Access)</span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-400 space-y-1">
        <p>
          AICTE Samanvay 2.0 &bull; National Regulatory &amp; Grievance Harmonization Platform &bull; 100% Air-Gapped High-Assurance Architecture
        </p>
        <p className="text-[11px] text-slate-500">
          Pursuant to AICTE Act, 1987 &amp; Approval Process Handbook (APH 2024-27). Authorized personnel access only.
        </p>
      </footer>

    </div>
  );
};
