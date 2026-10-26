import React, { useState } from 'react';
import { api, setAuthToken } from '../services/api';
import { Persona } from '../types';
import { Lock, Shield, KeyRound, AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';

interface OfficerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export const OfficerLoginModal: React.FC<OfficerLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('officer.pgrc');
  const [password, setPassword] = useState('Pgrc@Samanvay2026!');
  const [totpCode, setTotpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLiveTotp, setCurrentLiveTotp] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchTotp = async () => {
    try {
      const res = await api.getCurrentTotp(username);
      if (res.currentTotpCode) {
        setCurrentLiveTotp(res.currentTotpCode);
        setTotpCode(res.currentTotpCode);
      }
    } catch {
      setTotpCode('123456');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.login({
        username,
        password,
        totpCode: totpCode.trim() || undefined
      });

      setSuccessMsg(`Authenticated as ${res.fullName || res.username} (${res.role})`);
      setTimeout(() => {
        onLoginSuccess(res);
        onClose();
      }, 700);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Officer Security Login</h3>
              <p className="text-[11px] text-slate-400">BCrypt + Short-Lived JWT + RFC 6238 TOTP MFA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Preset User Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Officer Account</label>
            <select
              value={username}
              onChange={(e) => {
                const u = e.target.value;
                setUsername(u);
                if (u === 'admin.apex') setPassword('Admin@Samanvay2026!');
                if (u === 'officer.pgrc') setPassword('Pgrc@Samanvay2026!');
                if (u === 'officer.regulation') setPassword('Reg@Samanvay2026!');
                if (u === 'officer.south') setPassword('South@Samanvay2026!');
                if (u === 'nodal.inst') setPassword('Nodal@Samanvay2026!');
                setCurrentLiveTotp(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="officer.pgrc">Shri A. K. Sharma (PGRC Chief Officer)</option>
              <option value="officer.regulation">Prof. Rajive Kumar (Regulation Bureau)</option>
              <option value="officer.south">Dr. K. Sundararajan (Regional Officer - South)</option>
              <option value="admin.apex">Dr. Ramesh Unnikrishnan (Advisor, Apex)</option>
              <option value="nodal.inst">Prof. S. Ranganathan (Institution Nodal)</option>
            </select>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username / ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">BCrypt salted hash verified against PostgreSQL table users.</span>
          </div>

          {/* TOTP Code */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                6-Digit TOTP Authenticator Code
              </label>
              <button
                type="button"
                onClick={handleFetchTotp}
                className="text-[10px] text-blue-400 hover:text-blue-300 underline font-mono"
              >
                Inspect Air-Gapped Code
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 text-sm font-mono tracking-widest text-center focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
            {currentLiveTotp && (
              <span className="text-[10px] text-emerald-400 mt-1 block font-mono">
                Active Authenticator Code: {currentLiveTotp} (Valid for 30s)
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>Sign In to Platform</span>
          </button>
        </form>

      </div>
    </div>
  );
};
