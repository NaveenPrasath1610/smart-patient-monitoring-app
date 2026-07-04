import React, { useEffect, useState } from 'react';
import { Patient } from '../types';
import { Clock, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface SessionControlProps {
  patient: Patient;
  onCompleteSession: () => void;
  onExtendSession: (additionalMinutes: number) => void;
}

export default function SessionControl({ patient, onCompleteSession, onExtendSession }: SessionControlProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date(patient.startTime);
  const end = new Date(patient.endTime);
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const remainingMs = end.getTime() - now.getTime();

  // Calculate percentages
  const elapsedPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const isFinished = remainingMs <= 0 || patient.status === 'Completed';

  const formatDuration = (ms: number) => {
    if (ms < 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const formatDateTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl p-5 shadow-lg" id="session-control-panel">
      <div className="flex items-center gap-2.5 mb-4">
        <Clock className="w-5 h-5 text-teal-400 shrink-0" />
        <h2 className="text-base font-bold text-slate-100 font-display">Session Monitor Status</h2>
      </div>

      <div className="space-y-4">
        {/* Session Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-semibold font-mono">
            <span>Elapsed: {formatDuration(elapsedMs)}</span>
            <span>Remaining: {isFinished ? 'Completed' : formatDuration(remainingMs)}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 relative overflow-hidden border border-slate-800/40">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isFinished 
                  ? 'bg-slate-600' 
                  : remainingMs < 5 * 60 * 1000 
                  ? 'bg-rose-500 animate-pulse' 
                  : 'bg-gradient-to-r from-teal-500 to-emerald-400'
              }`}
              style={{ width: `${elapsedPercent}%` }}
            />
          </div>
        </div>

        {/* Start/End Reference Cards */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs">
          <div>
            <span className="text-slate-500 block font-bold uppercase tracking-wider text-[9px] mb-1">Required Start</span>
            <span className="font-semibold text-slate-200 font-mono">{formatDateTime(patient.startTime)}</span>
          </div>
          <div className="border-l border-slate-800/60 pl-3">
            <span className="text-slate-500 block font-bold uppercase tracking-wider text-[9px] mb-1">Required End</span>
            <span className="font-semibold text-slate-200 font-mono">{formatDateTime(patient.endTime)}</span>
          </div>
        </div>

        {/* State notification */}
        {patient.status === 'Completed' ? (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Monitoring completed successfully. Record stored in cloud history.</span>
          </div>
        ) : remainingMs < 0 ? (
          <div className="flex items-center gap-2 p-3 bg-rose-500/5 border border-rose-500/20 text-rose-300 rounded-xl text-xs animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Required monitoring session time has expired. Action required.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-teal-500/5 border border-teal-500/10 text-teal-300 rounded-xl text-xs">
            <Play className="w-3.5 h-3.5 text-teal-400 animate-pulse shrink-0" />
            <span>Telemetry active and syncing to cloud database in real-time.</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2.5 pt-1">
          {patient.status === 'Active' && (
            <>
              <button
                onClick={onCompleteSession}
                className="flex-1 py-2 px-3.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all shadow-sm hover:shadow-teal-400/10 cursor-pointer text-center"
              >
                Complete Session & Discharge
              </button>
              <button
                onClick={() => onExtendSession(15)}
                className="flex items-center justify-center gap-1 py-2 px-3 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                +15 Min
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
