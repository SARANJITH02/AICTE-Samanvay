import React, { useState, useEffect } from 'react';
import { CaseSubTask } from '../types';
import { api } from '../services/api';
import { Split, CheckCircle2, Clock, User, Building2, ArrowRight, Shield, Layers, Plus } from 'lucide-react';

interface SubTaskTrackerProps {
  parentCaseId: string;
  onRefresh?: () => void;
}

export const SubTaskTracker: React.FC<SubTaskTrackerProps> = ({ parentCaseId, onRefresh }) => {
  const [subTasks, setSubTasks] = useState<CaseSubTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubTasks();
  }, [parentCaseId]);

  const loadSubTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSubTasks(parentCaseId);
      setSubTasks(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-xs text-slate-400 text-center">Loading linked bureau sub-tasks...</div>;
  }

  if (subTasks.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
        <Layers className="w-6 h-6 text-slate-500 mx-auto" />
        <p className="text-xs text-slate-300 font-semibold">Single Unified Grievance</p>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
          No sub-tasks partitioned yet. If this case contains multiple grievances (e.g., fee dispute + infrastructure NOC violation), you can partition it across specialized bureaus.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Split className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              Complaint-Splitting Sub-Task Intelligence
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {subTasks.length} Active Tracks
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Composite grievance partitioned into independent bureau tracks under Parent Case #{parentCaseId}.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subTasks.map((task) => {
          const isPgrc = task.bureau === 'PGRC';
          const isRb = task.bureau === 'REGULATION_BUREAU';

          return (
            <div
              key={task.subTaskId}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    isPgrc
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isRb
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  }`}>
                    {task.bureau}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">{task.subTaskId}</span>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {task.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-200 line-clamp-1">{task.title}</p>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>{task.assignedOfficerId || 'Unassigned'}</span>
                </div>
                {task.slaDeadline && (
                  <div className="flex items-center gap-1 font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Due: {new Date(task.slaDeadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
