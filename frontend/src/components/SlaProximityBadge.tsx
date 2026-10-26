import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { ComplaintStatus } from '../types';

interface SlaProximityBadgeProps {
  status: ComplaintStatus | string;
  daysRemainingSla?: number;
  className?: string;
}

export const SlaProximityBadge: React.FC<SlaProximityBadgeProps> = ({
  status,
  daysRemainingSla = 0,
  className = ''
}) => {
  // Normalize status check with uppercase to handle any inconsistent casing
  const isDisposed = status?.toString().trim().toUpperCase() === 'DISPOSED';

  if (isDisposed) {
    return (
      <span className={`badge-disposed badge-resolved inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 shadow-inner ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
        <span>Disposed / Closed</span>
      </span>
    );
  }

  const isBreached = daysRemainingSla < 0;
  const isNearBreach = daysRemainingSla >= 0 && daysRemainingSla <= 3;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        isBreached
          ? 'bg-red-500/20 text-red-300 border-red-500/40'
          : isNearBreach
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      } ${className}`}
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span>
        {isBreached
          ? `${Math.abs(daysRemainingSla)}d Breached`
          : `${daysRemainingSla}d remaining`}
      </span>
    </div>
  );
};
