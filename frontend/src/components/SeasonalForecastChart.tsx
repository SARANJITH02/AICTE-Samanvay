import React, { useEffect, useState } from 'react';
import { Calendar, TrendingUp, AlertCircle, Info, RefreshCw, Users, ShieldAlert } from 'lucide-react';
import { SeasonalForecastResponse, SeasonalForecastMonth } from '../types';
import { api } from '../services/api';

interface SeasonalForecastChartProps {
  selectedRegion: string;
}

export const SeasonalForecastChart: React.FC<SeasonalForecastChartProps> = ({ selectedRegion }) => {
  const [data, setData] = useState<SeasonalForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<SeasonalForecastMonth | null>(null);

  const fetchForecast = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSeasonalForecast(selectedRegion);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch seasonal forecast:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [selectedRegion]);

  const months = data?.monthlyData || [];
  const maxVal = Math.max(...months.map(m => Math.max(m.confidenceUpper, m.projectedVolume, m.actualVolume)), 180);

  // Chart Dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingX = 45;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / Math.max(months.length - 1, 1)) * chartWidth;
  const getY = (val: number) => svgHeight - paddingY - (val / maxVal) * chartHeight;

  // Build SVG Path strings
  const actualPath = months.map((m, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(m.actualVolume)}`).join(' ');
  const projectedPath = months.map((m, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(m.projectedVolume)}`).join(' ');

  // Confidence Interval Area Polygon
  const upperPoints = months.map((m, i) => `${getX(i)},${getY(m.confidenceUpper)}`).join(' ');
  const lowerPoints = [...months].reverse().map((m, i) => `${getX(months.length - 1 - i)},${getY(m.confidenceLower)}`).join(' ');
  const areaPolygon = `${upperPoints} ${lowerPoints}`;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Seasonal Intake &amp; Influx Predictor
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 font-mono">
                Heuristic forecast based on academic calendar and seeded data
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Synthetic calibrated baseline modeled on academic calendar milestones (Admissions, Exams, and Fee Refund Deadlines)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-3.5 h-0.5 bg-cyan-400 rounded-full" />
            <span className="font-semibold text-[11px]">Actual Ingestion</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-400" />
            <span className="font-semibold text-[11px]">Projected Surge</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-3 bg-amber-500/10 border border-amber-500/20 rounded-sm" />
            <span className="font-semibold text-[11px]">95% CI Range</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-x-auto bg-slate-950/70 rounded-xl p-2 border border-slate-800">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none overflow-visible">
          <defs>
            <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 50, 100, 150].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line x1={paddingX} y1={y} x2={svgWidth - paddingX} y2={y} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
                <text x={paddingX - 8} y={y + 3.5} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                  {level}
                </text>
              </g>
            );
          })}

          {/* Confidence interval area */}
          <polygon points={areaPolygon} fill="url(#confidenceGrad)" />

          {/* Projected surge dashed curve */}
          <path d={projectedPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />

          {/* Actual case line */}
          <path d={actualPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />

          {/* Month Data Points and Labels */}
          {months.map((m, idx) => {
            const x = getX(idx);
            const yActual = getY(m.actualVolume);
            const yProj = getY(m.projectedVolume);
            const isHovered = hoveredPoint?.month === m.month;

            return (
              <g key={m.month} onMouseEnter={() => setHoveredPoint(m)} onMouseLeave={() => setHoveredPoint(null)} className="cursor-pointer">
                {/* Vertical hover indicator */}
                {isHovered && (
                  <line x1={x} y1={paddingY} x2={x} y2={svgHeight - paddingY} stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 2" />
                )}

                {/* Actual node */}
                <circle cx={x} cy={yActual} r={isHovered ? 5.5 : 3.5} fill="#06b6d4" stroke="#0f172a" strokeWidth="1.5" />

                {/* Projected node */}
                <circle cx={x} cy={yProj} r={isHovered ? 5.5 : 3.5} fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />

                {/* X-axis label */}
                <text x={x} y={svgHeight - 10} fill={isHovered ? '#fbbf24' : '#94a3b8'} fontSize="10" fontWeight={isHovered ? 'bold' : 'normal'} textAnchor="middle" fontFamily="sans-serif">
                  {m.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Details Card */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 p-3 rounded-xl bg-slate-900/95 border border-amber-500/50 text-xs shadow-2xl space-y-1.5 animate-in fade-in duration-100 max-w-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="font-bold text-amber-300 font-mono text-sm">{hoveredPoint.month} Forecast Details</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                {hoveredPoint.surgeFactor}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>Actual: <span className="text-cyan-400 font-bold">{hoveredPoint.actualVolume}</span></div>
              <div>Projected: <span className="text-amber-400 font-bold">{hoveredPoint.projectedVolume}</span></div>
            </div>
            <div className="text-[10px] text-slate-400">
              CI Band: <span className="text-slate-200 font-mono">{hoveredPoint.confidenceLower} &ndash; {hoveredPoint.confidenceUpper} cases</span>
            </div>
            <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800">
              <span className="text-amber-400 font-semibold block text-[10px] uppercase">Cyclical Academic Driver:</span>
              {hoveredPoint.surgeType}
            </div>
          </div>
        )}
      </div>

      {/* Operational Recommendation Banner */}
      {data?.operationalRecommendation && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white uppercase text-[10px] tracking-wider block">
              AICTE Strategic Resource Allocation Directive:
            </span>
            <p className="leading-relaxed text-amber-100">
              {data.operationalRecommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
