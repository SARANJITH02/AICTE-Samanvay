import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationOutboxMessage } from '../types';
import { Mail, MessageSquare, Bell, RefreshCw, X, ShieldAlert, Sparkles, Phone, CheckCircle2 } from 'lucide-react';

interface SmsEmailSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsEmailSimulatorModal: React.FC<SmsEmailSimulatorModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<NotificationOutboxMessage[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'SMS' | 'EMAIL' | 'IN_APP'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotificationOutbox();
      setMessages(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSla = async () => {
    setIsEvaluating(true);
    try {
      const res = await api.triggerSlaEvaluation();
      setAlertMessage(`SLA Matrix Evaluated: ${res.escalatedCount} cases evaluated for statutory breach.`);
      await loadMessages();
      setTimeout(() => setAlertMessage(null), 4000);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!isOpen) return null;

  const filtered = messages.filter((m) => {
    if (filterType === 'ALL') return true;
    return m.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Air-Gapped Notification & SMS/Email Simulator</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                  Zero Cloud Leakage
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect local air-gapped OTPs, SLA threshold escalations (70%, 90%, 100%+ breach), and outbox notifications.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2">
            {(['ALL', 'SMS', 'EMAIL', 'IN_APP'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {type === 'ALL' ? 'All Communications' : type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSla}
              disabled={isEvaluating}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isEvaluating ? 'Evaluating...' : 'Trigger SLA Escalation Scan'}</span>
            </button>
            <button
              onClick={loadMessages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Outbox"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {alertMessage && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{alertMessage}</span>
          </div>
        )}

        {/* Message Log List */}
        <div className="p-6 overflow-y-auto space-y-3 max-h-[calc(90vh-160px)]">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading air-gapped outbox logs...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No outbox messages recorded for this filter.</div>
          ) : (
            filtered.map((msg) => {
              const isSms = msg.type === 'SMS';
              const isEmail = msg.type === 'EMAIL';
              const isBreach = msg.channel.includes('BREACH') || msg.channel.includes('ESCALATION');

              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl border transition-all space-y-2 ${
                    isBreach
                      ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/50'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border flex items-center gap-1 ${
                        isSms
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : isEmail
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {isSms && <Phone className="w-3 h-3" />}
                        {isEmail && <Mail className="w-3 h-3" />}
                        {!isSms && !isEmail && <Bell className="w-3 h-3" />}
                        <span>{msg.type}</span>
                      </span>

                      <span className="text-xs font-mono font-bold text-white">
                        {msg.recipient}
                      </span>

                      {msg.caseId && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-900 text-amber-400 border border-slate-700">
                          {msg.caseId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                        {msg.channel}
                      </span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-200">{msg.subject}</p>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
