import React from 'react';
import { SmartAlert } from '../types';
import { ShieldAlert, CheckCircle, BellRing, Clock } from 'lucide-react';

interface AlertPanelProps {
  alerts: SmartAlert[];
  onResolveAlert: (alertId: string) => void;
}

export default function AlertPanel({ alerts, onResolveAlert }: AlertPanelProps) {
  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl p-5 shadow-lg" id="alert-panel">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <BellRing className={`w-5 h-5 text-slate-300 ${activeAlerts.length > 0 ? 'animate-bounce text-rose-400' : ''}`} />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500/40" />
            )}
          </div>
          <h2 className="text-base font-bold text-slate-100 font-display">Smart Clinical Alerts</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
          {activeAlerts.length} Active
        </span>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mb-2.5 opacity-90" />
          <p className="text-sm font-semibold text-slate-200">All Parameters Normal</p>
          <p className="text-xs text-slate-500 mt-1">Real-time telemetry safe, no active alarms</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {activeAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            return (
              <div
                key={alert.id}
                className={`flex gap-3 p-3.5 rounded-xl border transition-all duration-200 ${
                  isCritical
                    ? 'bg-rose-500/5 border-rose-500/30 text-rose-100 shadow-md shadow-rose-950/20'
                    : 'bg-amber-500/5 border-amber-500/30 text-amber-100 shadow-sm'
                }`}
                id={`alert-item-${alert.id}`}
              >
                <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center ${isCritical ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'}`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                      {alert.severity} Alarm
                    </p>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 mt-1 leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="text-xs font-bold flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      Acknowledge & Mute
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
