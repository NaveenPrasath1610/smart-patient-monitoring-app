import React from 'react';
import { Patient } from '../types';
import { Users, ShieldAlert, Heart, Calendar, Plus, Clock } from 'lucide-react';

interface PatientListProps {
  patients: Patient[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string) => void;
  onOpenAdmission: () => void;
}

export default function PatientList({ patients, selectedPatientId, onSelectPatient, onOpenAdmission }: PatientListProps) {
  return (
    <div className="bg-slate-900/85 border border-slate-800/80 shadow-lg overflow-hidden h-full flex flex-col rounded-2xl" id="patient-sidebar">
      {/* Header */}
      <div className="p-5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-display">Patients</h2>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Count: {patients.length}</p>
          </div>
        </div>

        <button
          onClick={onOpenAdmission}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-950 bg-teal-400 hover:bg-teal-350 rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Admit
        </button>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="p-3.5 bg-slate-850 rounded-full text-slate-500 mb-3 border border-slate-800">
              <Users className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-200">Initial Patient Count: 0</p>
            <p className="text-[10px] text-slate-500 max-w-[160px] mx-auto mt-1.5 leading-relaxed font-mono">
              No clinical records found. Admit the 1st patient to begin real-time cloud monitoring.
            </p>
            <button
              onClick={onOpenAdmission}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-bold rounded-xl text-[11px] shadow-md cursor-pointer"
            >
              Admit 1st Patient
            </button>
          </div>
        ) : (
          patients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            const isActive = p.status === 'Active';
            
            // Format start time
            const startDate = new Date(p.startTime);
            const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <button
                key={p.id}
                onClick={() => onSelectPatient(p.id)}
                className={`w-full text-left p-4 transition-all duration-150 flex items-start gap-3 hover:bg-slate-800/40 cursor-pointer ${
                  isSelected ? 'bg-slate-800/60 border-r-2 border-teal-400' : ''
                }`}
                id={`patient-list-item-${p.id}`}
              >
                {/* Sequenced Badge */}
                <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-center shrink-0 border ${
                  isActive 
                    ? isSelected 
                      ? 'bg-teal-500/15 border-teal-500/30 text-teal-400 font-bold'
                      : 'bg-slate-800 border-slate-700/60 text-slate-300 font-semibold'
                    : 'bg-slate-950 border-slate-900 text-slate-500 font-normal'
                }`}>
                  <span className="text-[8px] leading-none text-slate-500 font-mono">PAT</span>
                  <span className="text-xs font-extrabold leading-none mt-0.5 font-mono">{p.patientNumber}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="text-xs font-bold text-slate-100 truncate font-display">{p.name}</h3>
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      isActive 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{p.condition}</p>
                  
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium mt-2">
                    <span className="flex items-center gap-0.5 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      In: {timeStr}
                    </span>
                    <span className="font-bold text-slate-300 font-mono">{p.age}y / {p.gender[0]}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
