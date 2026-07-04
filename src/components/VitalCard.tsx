import React from 'react';
import { VitalKey, VitalInfo } from '../types';
import { VITAL_METRICS } from '../utils/clinicalData';
import { Heart, Wind, Thermometer, Droplet, Gauge, Zap, TrendingUp, TrendingDown, Activity, ShieldAlert, Check } from 'lucide-react';

interface VitalCardProps {
  key?: string;
  vitalKey: VitalKey;
  value: number;
  history: number[]; // historic numbers to draw a trendline
}

const VITAL_ICONS: Record<VitalKey, React.ComponentType<any>> = {
  heartRate: Heart,
  spo2: Activity,
  bpSystolic: TrendingUp,
  bpDiastolic: TrendingDown,
  bodyTemp: Thermometer,
  respRate: Wind,
  bloodGlucose: Droplet,
  etco2: Gauge,
  perfusionIndex: Zap,
  hrv: Activity
};

export default function VitalCard({ vitalKey, value, history }: VitalCardProps) {
  const metricInfo: VitalInfo = VITAL_METRICS[vitalKey];
  const Icon = VITAL_ICONS[vitalKey] || Activity;

  // Determine status color based on thresholds
  let status: 'normal' | 'warning' | 'critical' = 'normal';
  let statusText = 'Normal';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let cardBorder = 'border-slate-800/80 hover:border-slate-700/60';
  let textColor = 'text-emerald-400';
  let progressBg = 'bg-emerald-500';

  if (value < metricInfo.criticalMin || value > metricInfo.criticalMax) {
    status = 'critical';
    statusText = 'Critical';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
    cardBorder = 'border-rose-500/30 shadow-rose-500/5 ring-1 ring-rose-500/20';
    textColor = 'text-rose-400';
    progressBg = 'bg-rose-500';
  } else if (value < metricInfo.minNormal || value > metricInfo.maxNormal) {
    status = 'warning';
    statusText = 'Warning';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    cardBorder = 'border-amber-500/30 shadow-amber-500/5 ring-1 ring-amber-500/10';
    textColor = 'text-amber-400';
    progressBg = 'bg-amber-500';
  }

  // Calculate percentage of value across range for a clean visual bar
  const displayMin = metricInfo.criticalMin * 0.8;
  const displayMax = metricInfo.criticalMax * 1.2;
  const percentage = Math.min(100, Math.max(0, ((value - displayMin) / (displayMax - displayMin)) * 100));

  // Build points for SVG sparkline
  const drawSparkline = () => {
    if (history.length < 2) return '';
    const width = 120;
    const height = 30;
    const minVal = Math.min(...history) * 0.95;
    const maxVal = Math.max(...history) * 1.05;
    const valRange = maxVal - minVal || 1;

    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - minVal) / valRange) * height;
      return `${x},${y}`;
    });

    return points.join(' ');
  };

  const sparklinePoints = drawSparkline();

  return (
    <div className={`bg-slate-900/80 border ${cardBorder} p-4 rounded-2xl transition-all duration-300 hover:bg-slate-900 hover:shadow-lg relative overflow-hidden flex flex-col justify-between`} id={`vital-card-${vitalKey}`}>
      {/* Background status accent */}
      <div className={`absolute top-0 left-0 w-1 h-full ${progressBg} opacity-80`} />

      <div>
        <div className="flex items-start justify-between mb-3 pl-1">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/50`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200 font-display leading-tight">{metricInfo.label}</h3>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                Ref: {metricInfo.minNormal}-{metricInfo.maxNormal} {metricInfo.unit}
              </span>
            </div>
          </div>

          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {statusText}
          </span>
        </div>

        <div className="flex items-baseline gap-1 mt-2.5 mb-1 pl-1">
          <span className="text-2xl font-extrabold tracking-tight text-slate-50 font-mono">
            {value}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {metricInfo.unit}
          </span>
        </div>
      </div>

      {/* Sparkline and Bar metrics */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/60 pl-1">
        {history.length >= 2 ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Trend</span>
            <svg width="120" height="30" className="opacity-95">
              <polyline
                fill="none"
                stroke={status === 'critical' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : '#10b981'}
                strokeWidth="2.5"
                points={sparklinePoints}
              />
            </svg>
          </div>
        ) : (
          <div className="text-[9px] text-slate-500 font-mono italic">Initializing trend...</div>
        )}

        <div className="w-16 flex flex-col gap-1 text-right">
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div className={`h-1 rounded-full ${progressBg}`} style={{ width: `${percentage}%` }} />
          </div>
          <span className="text-[8px] text-slate-500 font-mono">
            Min: {Math.min(value, ...history)} | Max: {Math.max(value, ...history)}
          </span>
        </div>
      </div>
    </div>
  );
}
