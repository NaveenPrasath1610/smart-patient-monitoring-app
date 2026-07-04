export interface Vitals {
  heartRate: number;         // bpm (60 - 100)
  spo2: number;              // % (95 - 100)
  bpSystolic: number;        // mmHg (90 - 120)
  bpDiastolic: number;       // mmHg (60 - 80)
  bodyTemp: number;          // °C (36.1 - 37.2)
  respRate: number;          // breaths/min (12 - 20)
  bloodGlucose: number;      // mg/dL (70 - 140)
  etco2: number;             // mmHg (35 - 45)
  perfusionIndex: number;    // % (0.2 - 20.0)
  hrv: number;               // ms (20 - 150)
}

export type VitalKey = keyof Vitals;

export interface Patient {
  id: string;
  patientNumber: number; // 1 for 1st patient, 2 for 2nd, etc.
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  condition: string;     // e.g. "Post-Op Recovery", "General Ward", "ICU", "Cardiac Watch"
  startTime: string;     // ISO timestamp of monitoring start
  endTime: string;       // ISO timestamp of monitoring end
  status: 'Active' | 'Completed';
  latestVitals: Vitals;
  createdAt: string;
}

export interface VitalReading {
  id: string;
  timestamp: string;     // ISO timestamp
  vitals: Vitals;
}

export interface VitalInfo {
  key: VitalKey;
  label: string;
  unit: string;
  minNormal: number;
  maxNormal: number;
  criticalMin: number;
  criticalMax: number;
  description: string;
}

export interface SmartAlert {
  id: string;
  patientId: string;
  patientName: string;
  patientNumber: number;
  timestamp: string;
  parameter: string;
  vitalKey: VitalKey;
  value: number;
  severity: 'warning' | 'critical';
  message: string;
  resolved: boolean;
}
