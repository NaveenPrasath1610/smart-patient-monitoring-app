import React, { useState } from 'react';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { generateInitialVitals } from '../utils/clinicalData';
import { Plus, Clock, UserCheck, AlertCircle } from 'lucide-react';

interface PatientAdmissionProps {
  onAdmissionSuccess: (patientId: string) => void;
  onCancel?: () => void;
}

export default function PatientAdmission({ onAdmissionSuccess, onCancel }: PatientAdmissionProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [condition, setCondition] = useState('General Ward');
  
  // Start time defaults to current time
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    // Format to local ISO-like datetime-local format
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  
  // End time defaults to 1 hour from now
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
    return new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) {
      setError('Please fill in patient Name and Age.');
      return;
    }

    const startISO = new Date(startTime).toISOString();
    const endISO = new Date(endTime).toISOString();

    if (new Date(endISO) <= new Date(startISO)) {
      setError('End Time must be after the Start Time.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Determine patient sequential number (initial is 0, first person is 1, second is 2)
      const patientsRef = collection(db, 'patients');
      const q = query(patientsRef, orderBy('patientNumber', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      
      let nextPatientNumber = 1;
      if (!querySnapshot.empty) {
        const highestPatient = querySnapshot.docs[0].data();
        if (typeof highestPatient.patientNumber === 'number') {
          nextPatientNumber = highestPatient.patientNumber + 1;
        }
      }

      const initialVitals = generateInitialVitals(condition);

      const patientData = {
        patientNumber: nextPatientNumber,
        name: name.trim(),
        age: Number(age),
        gender,
        condition,
        startTime: startISO,
        endTime: endISO,
        status: 'Active',
        latestVitals: initialVitals,
        createdAt: new Date().toISOString()
      };

      // 2. Write to Firestore
      const docRef = await addDoc(patientsRef, patientData);

      // 3. Add an initial reading to the readings subcollection
      const readingsRef = collection(db, 'patients', docRef.id, 'readings');
      await addDoc(readingsRef, {
        timestamp: new Date().toISOString(),
        vitals: initialVitals
      });

      onAdmissionSuccess(docRef.id);
    } catch (err: any) {
      console.error("Error admitting patient:", err);
      setError(`Failed to save details: ${err.message || 'Please check your internet connection.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800/80 rounded-2xl shadow-xl p-6 max-w-xl mx-auto" id="patient-admission-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 font-display">Admit New Patient</h2>
          <p className="text-xs text-slate-400">Register patient and configure required session limits</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm rounded-xl animate-fade-in font-mono">
          <AlertCircle className="w-4 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 font-display">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-display">Age</label>
              <input
                type="number"
                required
                min="0"
                max="125"
                placeholder="Years"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-display">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors text-sm"
              >
                <option value="Male" className="bg-slate-900">Male</option>
                <option value="Female" className="bg-slate-900">Female</option>
                <option value="Other" className="bg-slate-900">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 font-display">Primary Clinical Watch Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors text-sm"
          >
            <option value="General Ward" className="bg-slate-900">General Ward (Standard Monitoring)</option>
            <option value="ICU" className="bg-slate-900">ICU (High Alert Vitals)</option>
            <option value="Post-Op Recovery" className="bg-slate-900">Post-Op Recovery (Anesthesia Wear-off)</option>
            <option value="Cardiac Watch" className="bg-slate-900">Cardiac Watch (Telemetry Monitoring)</option>
            <option value="Diabetic Care" className="bg-slate-900">Diabetic Care (Glucose tracking)</option>
          </select>
        </div>

        <div className="border-t border-slate-800/80 my-4 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider font-display">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            Monitoring Session Requirements
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-display">Session Start Time (Required)</label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 font-display">Session End Time (Required)</label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 border border-slate-700 hover:bg-slate-850 text-slate-300 font-bold rounded-xl transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-450 hover:to-emerald-350 text-slate-950 font-extrabold rounded-xl shadow-md hover:shadow-teal-500/10 disabled:opacity-50 transition-all text-xs cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Admit Patient
          </button>
        </div>
      </form>
    </div>
  );
}
