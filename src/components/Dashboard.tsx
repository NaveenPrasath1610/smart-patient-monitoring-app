import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Patient, VitalReading, SmartAlert, VitalKey } from '../types';
import { simulateNextVitals, analyzeVitals, VITAL_METRICS } from '../utils/clinicalData';
import PatientList from './PatientList';
import PatientAdmission from './PatientAdmission';
import VitalCard from './VitalCard';
import AlertPanel from './AlertPanel';
import SessionControl from './SessionControl';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, ShieldAlert, Heart, Calendar, Clock, Sparkles, UserPlus, Info, CheckCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [showAdmission, setShowAdmission] = useState(false);
  const [selectedVitalChart, setSelectedVitalChart] = useState<VitalKey>('heartRate');
  const [distressMode, setDistressMode] = useState<'normal' | 'cardiac' | 'respiratory' | 'fever' | 'hypoglycemic'>('normal');

  // Simulation timer ref
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to patient list in Firestore
  useEffect(() => {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, orderBy('patientNumber', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList: Patient[] = [];
      snapshot.forEach((doc) => {
        patientList.push({ id: doc.id, ...doc.data() } as Patient);
      });
      setPatients(patientList);

      // Auto-select the first patient if nothing is selected and patients exist
      if (patientList.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patientList[0].id);
      }
    }, (error) => {
      console.error("Error listening to patients:", error);
    });

    return () => unsubscribe();
  }, [selectedPatientId]);

  // 2. Subscribe to readings for the selected patient
  useEffect(() => {
    if (!selectedPatientId) {
      setReadings([]);
      return;
    }

    const readingsRef = collection(db, 'patients', selectedPatientId, 'readings');
    const q = query(readingsRef, orderBy('timestamp', 'asc')); // we want ascending for charts

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const readingsList: VitalReading[] = [];
      snapshot.forEach((doc) => {
        readingsList.push({ id: doc.id, ...doc.data() } as VitalReading);
      });
      
      // Limit to latest 30 readings on client side to keep charts neat
      const latestReadings = readingsList.slice(-30);
      setReadings(latestReadings);
    }, (error) => {
      console.error("Error listening to readings:", error);
    });

    return () => unsubscribe();
  }, [selectedPatientId]);

  // 3. Monitor active patient vitals to trigger alerts
  const currentPatient = patients.find(p => p.id === selectedPatientId);

  useEffect(() => {
    if (!currentPatient || currentPatient.status === 'Completed') {
      setAlerts([]);
      return;
    }

    // Analyze current patient's latest vitals and trigger alerts
    const generatedAlerts = analyzeVitals(
      currentPatient.latestVitals,
      currentPatient.id,
      currentPatient.name,
      currentPatient.patientNumber
    );

    setAlerts(prev => {
      // Keep alerts that are resolved or from other patients, and update current active ones
      const otherAlerts = prev.filter(a => a.patientId !== currentPatient.id || a.resolved);
      return [...otherAlerts, ...generatedAlerts];
    });
  }, [currentPatient?.latestVitals, selectedPatientId]);

  // 4. Patient Simulation Loop
  useEffect(() => {
    // Clear any existing simulation interval
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    // Only simulate if we have an active patient selected
    if (!selectedPatientId || !currentPatient || currentPatient.status !== 'Active') {
      return;
    }

    // Start running simulation updates every 4 seconds
    simIntervalRef.current = setInterval(async () => {
      try {
        const nextVitals = simulateNextVitals(
          currentPatient.latestVitals,
          currentPatient.condition,
          distressMode === 'normal' ? undefined : distressMode
        );

        // Update patient doc in Firestore
        const patientDocRef = doc(db, 'patients', selectedPatientId);
        await updateDoc(patientDocRef, {
          latestVitals: nextVitals
        });

        // Save new reading point in readings subcollection
        const readingsRef = collection(db, 'patients', selectedPatientId, 'readings');
        await addDoc(readingsRef, {
          timestamp: new Date().toISOString(),
          vitals: nextVitals
        });

        // Auto-end session if current time exceeds expected end time
        if (new Date() > new Date(currentPatient.endTime)) {
          await updateDoc(patientDocRef, {
            status: 'Completed'
          });
        }
      } catch (err) {
        console.error("Error updating simulation data in cloud DB:", err);
      }
    }, 4000);

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, [selectedPatientId, currentPatient?.latestVitals, currentPatient?.status, distressMode, currentPatient?.endTime]);

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
  };

  const handleCompleteSession = async () => {
    if (!selectedPatientId) return;
    try {
      const patientDocRef = doc(db, 'patients', selectedPatientId);
      await updateDoc(patientDocRef, {
        status: 'Completed'
      });
      setDistressMode('normal');
    } catch (err) {
      console.error("Error completing session:", err);
    }
  };

  const handleExtendSession = async (minutes: number) => {
    if (!selectedPatientId || !currentPatient) return;
    try {
      const originalEnd = new Date(currentPatient.endTime);
      const newEnd = new Date(originalEnd.getTime() + minutes * 60 * 1000);
      const patientDocRef = doc(db, 'patients', selectedPatientId);
      await updateDoc(patientDocRef, {
        endTime: newEnd.toISOString(),
        status: 'Active' // Re-activate if it was completed
      });
    } catch (err) {
      console.error("Error extending session:", err);
    }
  };

  // Extract history of specific selected metric for recharts
  const chartData = readings.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    val: r.vitals[selectedVitalChart]
  }));

  const activeMetricInfo = VITAL_METRICS[selectedVitalChart];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root">
      {/* Clinician Header */}
      <header className="bg-slate-950/60 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 rounded-xl shadow-md">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-50 tracking-tight font-display">Smart Clinical Telemetry</h1>
            <p className="text-xs text-slate-400 font-mono">Real-time Patient Vitals Monitoring & Database Logging</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold text-teal-400 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-ping" />
            Cloud Database Connected
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 overflow-hidden p-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Patient List */}
        <div className="w-full md:w-80 shrink-0 h-auto md:h-full">
          <PatientList
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={(id) => {
              setSelectedPatientId(id);
              setShowAdmission(false);
              setDistressMode('normal');
            }}
            onOpenAdmission={() => setShowAdmission(true)}
          />
        </div>

        {/* Dashboard Focus Zone */}
        <div className="flex-1 overflow-y-auto pr-1">
          {showAdmission ? (
            <div className="animate-fade-in py-4">
              <PatientAdmission
                onAdmissionSuccess={(id) => {
                  setSelectedPatientId(id);
                  setShowAdmission(false);
                }}
                onCancel={patients.length > 0 ? () => setShowAdmission(false) : undefined}
              />
            </div>
          ) : currentPatient ? (
            <div className="space-y-6">
              {/* Patient Core Summary Card */}
              <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl shadow-xl p-6" id="patient-banner">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-teal-500/10 text-teal-400 rounded-2xl flex flex-col items-center justify-center border border-teal-500/20 shadow-md shrink-0">
                      <span className="text-[9px] uppercase font-bold text-teal-500 tracking-wider font-mono">PAT</span>
                      <span className="text-xl font-extrabold leading-none font-mono">{currentPatient.patientNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-slate-50 font-display">{currentPatient.name}</h2>
                        <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                          currentPatient.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {currentPatient.status} Session
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-400 font-medium font-mono">
                        <span className="bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800/80 text-slate-300">
                          Age: <strong className="text-slate-100">{currentPatient.age}</strong>
                        </span>
                        <span className="bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800/80 text-slate-300">
                          Gender: <strong className="text-slate-100">{currentPatient.gender}</strong>
                        </span>
                        <span className="bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800/80 text-slate-300">
                          Clinical Condition: <strong className="text-teal-400">{currentPatient.condition}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Distress Simulation Trigger (Active sessions only) */}
                  {currentPatient.status === 'Active' && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-slate-300 font-display">
                        <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                        Clinical Distress Simulation
                      </div>
                      <select
                        value={distressMode}
                        onChange={(e) => setDistressMode(e.target.value as any)}
                        className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-400 transition-colors cursor-pointer"
                      >
                        <option value="normal" className="bg-slate-900">Normal (Stable Vitals)</option>
                        <option value="cardiac" className="bg-slate-900">Trigger Cardiac Arrest (Tachycardia)</option>
                        <option value="respiratory" className="bg-slate-900">Trigger Respiratory Failure (Hypoxia)</option>
                        <option value="fever" className="bg-slate-900">Trigger Hyperpyrexia (Severe Fever)</option>
                        <option value="hypoglycemic" className="bg-slate-900">Trigger Insulin Shock (Hypoglycemia)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Status and Alerts Panel Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SessionControl
                  patient={currentPatient}
                  onCompleteSession={handleCompleteSession}
                  onExtendSession={handleExtendSession}
                />
                <AlertPanel
                  alerts={alerts}
                  onResolveAlert={handleResolveAlert}
                />
              </div>

              {/* Advanced Real-time Graphing Section */}
              <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl shadow-lg p-5" id="interactive-analytics-graph">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/60 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-display">High-Resolution Parameter Trend</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">Real-time cloud logging analysis of Patient #{currentPatient.patientNumber}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-400 shrink-0 font-display">Analyze Vital:</label>
                    <select
                      value={selectedVitalChart}
                      onChange={(e) => setSelectedVitalChart(e.target.value as VitalKey)}
                      className="text-xs font-bold bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {Object.keys(VITAL_METRICS).map((key) => (
                        <option key={key} value={key} className="bg-slate-900 text-slate-200">
                          {VITAL_METRICS[key as VitalKey].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {chartData.length < 2 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                      <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mb-2" />
                      Capturing telemedicine data points...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                          stroke="#334155"
                        />
                        <YAxis
                          domain={[
                            (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.9)),
                            (dataMax: number) => Math.ceil(dataMax * 1.1)
                          ]}
                          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                          stroke="#334155"
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            color: '#f8fafc',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="val"
                          name={activeMetricInfo.label}
                          stroke="#14b8a6"
                          strokeWidth={3}
                          dot={{ r: 3.5, fill: '#14b8a6', strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: '#2dd4bf', strokeWidth: 2, stroke: '#000' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="flex items-center gap-2.5 mt-4 bg-teal-500/5 p-3 rounded-xl border border-teal-500/15 text-xs text-teal-300 leading-relaxed font-medium">
                  <Info className="w-4.5 h-4.5 text-teal-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-100">{activeMetricInfo.label}:</span> {activeMetricInfo.description}{' '}
                    Clinical normal range is <span className="font-bold text-slate-50 font-mono">{activeMetricInfo.minNormal} to {activeMetricInfo.maxNormal} {activeMetricInfo.unit}</span>.
                  </div>
                </div>
              </div>

              {/* Grid of 10 Parameter Vital Cards */}
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-200 font-display">10-Parameter Telemetry Hub</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">Clinical grade multi-parameter real-time sensor monitoring</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 font-display">
                  {(Object.keys(VITAL_METRICS) as VitalKey[]).map((key) => {
                    const latestVal = currentPatient.latestVitals[key];
                    // Map historic points for this specific parameter
                    const metricHistory = readings.map(r => r.vitals[key]);

                    return (
                      <VitalCard
                        key={key}
                        vitalKey={key}
                        value={latestVal}
                        history={metricHistory}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[450px] flex flex-col items-center justify-center text-center p-8 bg-slate-900/85 border border-slate-800/80 rounded-2xl shadow-xl" id="empty-state-card">
              <div className="p-4 bg-teal-500/10 text-teal-400 rounded-full mb-4 border border-teal-500/20">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-slate-50 font-display">Smart Hospital Terminal</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                Welcome to the Patient Telemetry monitor. Add a new patient record or select one from the sidebar list to inspect live cloud-synced biosignals.
              </p>
              <button
                onClick={() => setShowAdmission(true)}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold rounded-xl shadow-md hover:shadow-teal-500/10 transition-all text-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Admit 1st Patient
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
