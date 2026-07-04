import { Vitals, VitalKey, VitalInfo, SmartAlert } from '../types';

export const VITAL_METRICS: Record<VitalKey, VitalInfo> = {
  heartRate: {
    key: 'heartRate',
    label: 'Heart Rate',
    unit: 'bpm',
    minNormal: 60,
    maxNormal: 100,
    criticalMin: 50,
    criticalMax: 130,
    description: 'Number of heart contractions per minute.'
  },
  spo2: {
    key: 'spo2',
    label: 'Oxygen Saturation (SpO2)',
    unit: '%',
    minNormal: 95,
    maxNormal: 100,
    criticalMin: 90,
    criticalMax: 100,
    description: 'Percentage of oxygen-saturated hemoglobin in blood.'
  },
  bpSystolic: {
    key: 'bpSystolic',
    label: 'Systolic BP',
    unit: 'mmHg',
    minNormal: 90,
    maxNormal: 120,
    criticalMin: 85,
    criticalMax: 160,
    description: 'Pressure in arteries during heart contraction.'
  },
  bpDiastolic: {
    key: 'bpDiastolic',
    label: 'Diastolic BP',
    unit: 'mmHg',
    minNormal: 60,
    maxNormal: 80,
    criticalMin: 50,
    criticalMax: 100,
    description: 'Pressure in arteries between heartbeats.'
  },
  bodyTemp: {
    key: 'bodyTemp',
    label: 'Body Temperature',
    unit: '°C',
    minNormal: 36.1,
    maxNormal: 37.2,
    criticalMin: 35.0,
    criticalMax: 38.5,
    description: 'Core body temperature.'
  },
  respRate: {
    key: 'respRate',
    label: 'Respiration Rate',
    unit: 'rpm',
    minNormal: 12,
    maxNormal: 20,
    criticalMin: 8,
    criticalMax: 26,
    description: 'Number of breaths taken per minute.'
  },
  bloodGlucose: {
    key: 'bloodGlucose',
    label: 'Blood Glucose',
    unit: 'mg/dL',
    minNormal: 70,
    maxNormal: 140,
    criticalMin: 55,
    criticalMax: 220,
    description: 'Concentration of glucose (sugar) in blood.'
  },
  etco2: {
    key: 'etco2',
    label: 'End-Tidal CO2 (EtCO2)',
    unit: 'mmHg',
    minNormal: 35,
    maxNormal: 45,
    criticalMin: 30,
    criticalMax: 50,
    description: 'Partial pressure of carbon dioxide at the end of an exhaled breath.'
  },
  perfusionIndex: {
    key: 'perfusionIndex',
    label: 'Perfusion Index (PI)',
    unit: '%',
    minNormal: 1.0,
    maxNormal: 15.0,
    criticalMin: 0.2,
    criticalMax: 20.0,
    description: 'Ratio of pulsatile blood flow to static blood flow at monitoring site.'
  },
  hrv: {
    key: 'hrv',
    label: 'Heart Rate Variability',
    unit: 'ms',
    minNormal: 30,
    maxNormal: 100,
    criticalMin: 15,
    criticalMax: 150,
    description: 'Variation in the time interval between consecutive heartbeats.'
  }
};

// Generate initial normal vitals based on condition
export function generateInitialVitals(condition: string): Vitals {
  const base = {
    heartRate: 72,
    spo2: 98,
    bpSystolic: 115,
    bpDiastolic: 75,
    bodyTemp: 36.6,
    respRate: 15,
    bloodGlucose: 105,
    etco2: 38,
    perfusionIndex: 4.5,
    hrv: 55
  };

  switch (condition.toLowerCase()) {
    case 'icu':
      base.heartRate = 88;
      base.spo2 = 96;
      base.bpSystolic = 105;
      base.bpDiastolic = 65;
      base.respRate = 18;
      break;
    case 'post-op recovery':
      base.bodyTemp = 35.8; // slightly low temp after anesthesia
      base.heartRate = 68;
      base.respRate = 13;
      break;
    case 'cardiac watch':
      base.heartRate = 82;
      base.bpSystolic = 130;
      base.bpDiastolic = 84;
      base.hrv = 28; // lower HRV can indicate cardiac stress
      break;
    case 'diabetic care':
      base.bloodGlucose = 165; // elevated glucose for diabetic patient
      break;
  }

  return base;
}

// Generate the next value in a random walk simulation
export function simulateNextVitals(current: Vitals, patientCondition: string, distressType?: 'cardiac' | 'respiratory' | 'fever' | 'hypoglycemic'): Vitals {
  const randomWalk = (val: number, step: number, min: number, max: number) => {
    const change = (Math.random() - 0.5) * step;
    return Math.min(max, Math.max(min, Number((val + change).toFixed(1))));
  };

  const next = { ...current };

  // If distress is active, force values into alarm ranges
  if (distressType === 'cardiac') {
    next.heartRate = Math.min(150, next.heartRate + 5 + Math.random() * 5);
    next.bpSystolic = Math.min(185, next.bpSystolic + 4 + Math.random() * 4);
    next.bpDiastolic = Math.min(110, next.bpDiastolic + 3 + Math.random() * 3);
    next.hrv = Math.max(10, next.hrv - 4);
  } else if (distressType === 'respiratory') {
    next.spo2 = Math.max(85, next.spo2 - 1.5);
    next.respRate = Math.min(32, next.respRate + 1);
    next.etco2 = Math.min(58, next.etco2 + 1.2);
  } else if (distressType === 'fever') {
    next.bodyTemp = Math.min(41.0, next.bodyTemp + 0.15);
    next.heartRate = Math.min(125, next.heartRate + 2);
  } else if (distressType === 'hypoglycemic') {
    next.bloodGlucose = Math.max(40, next.bloodGlucose - 8);
    next.heartRate = Math.min(115, next.heartRate + 1.5);
    next.perfusionIndex = Math.max(0.5, next.perfusionIndex - 0.2);
  } else {
    // Normal random walk behavior
    next.heartRate = randomWalk(current.heartRate, 2, 50, 140);
    next.spo2 = randomWalk(current.spo2, 0.4, 88, 100);
    next.bpSystolic = randomWalk(current.bpSystolic, 2.5, 80, 175);
    next.bpDiastolic = randomWalk(current.bpDiastolic, 1.5, 45, 105);
    next.bodyTemp = randomWalk(current.bodyTemp, 0.05, 34.5, 41.2);
    next.respRate = randomWalk(current.respRate, 0.8, 8, 30);
    next.bloodGlucose = randomWalk(current.bloodGlucose, 3, 50, 260);
    next.etco2 = randomWalk(current.etco2, 0.6, 25, 60);
    next.perfusionIndex = randomWalk(current.perfusionIndex, 0.3, 0.1, 20.0);
    next.hrv = randomWalk(current.hrv, 2, 5, 160);
  }

  // Ensure logical boundaries (e.g., SpO2 cannot exceed 100%)
  next.spo2 = Math.min(100, Math.max(0, Number(next.spo2.toFixed(1))));
  next.heartRate = Math.max(0, Math.round(next.heartRate));
  next.bpSystolic = Math.max(0, Math.round(next.bpSystolic));
  next.bpDiastolic = Math.max(0, Math.round(next.bpDiastolic));
  next.respRate = Math.max(0, Math.round(next.respRate));
  next.hrv = Math.max(1, Math.round(next.hrv));
  next.bloodGlucose = Math.max(0, Math.round(next.bloodGlucose));
  next.bodyTemp = Number(next.bodyTemp.toFixed(1));
  next.etco2 = Number(next.etco2.toFixed(1));
  next.perfusionIndex = Number(next.perfusionIndex.toFixed(1));

  return next;
}

// Check for clinical alerts based on current parameters
export function analyzeVitals(vitals: Vitals, patientId: string, name: string, patientNumber: number): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date().toISOString();

  Object.keys(vitals).forEach((key) => {
    const k = key as VitalKey;
    const info = VITAL_METRICS[k];
    const val = vitals[k];

    if (val < info.criticalMin) {
      alerts.push({
        id: `${patientId}_${k}_crit_low_${now}`,
        patientId,
        patientName: name,
        patientNumber,
        timestamp: now,
        parameter: info.label,
        vitalKey: k,
        value: val,
        severity: 'critical',
        message: `CRITICAL LOW: ${info.label} is ${val}${info.unit} (Normal: ${info.minNormal}-${info.maxNormal}${info.unit})`,
        resolved: false
      });
    } else if (val > info.criticalMax) {
      alerts.push({
        id: `${patientId}_${k}_crit_high_${now}`,
        patientId,
        patientName: name,
        patientNumber,
        timestamp: now,
        parameter: info.label,
        vitalKey: k,
        value: val,
        severity: 'critical',
        message: `CRITICAL HIGH: ${info.label} is ${val}${info.unit} (Normal: ${info.minNormal}-${info.maxNormal}${info.unit})`,
        resolved: false
      });
    } else if (val < info.minNormal) {
      alerts.push({
        id: `${patientId}_${k}_warn_low_${now}`,
        patientId,
        patientName: name,
        patientNumber,
        timestamp: now,
        parameter: info.label,
        vitalKey: k,
        value: val,
        severity: 'warning',
        message: `Warning: ${info.label} is slightly low (${val}${info.unit})`,
        resolved: false
      });
    } else if (val > info.maxNormal) {
      alerts.push({
        id: `${patientId}_${k}_warn_high_${now}`,
        patientId,
        patientName: name,
        patientNumber,
        timestamp: now,
        parameter: info.label,
        vitalKey: k,
        value: val,
        severity: 'warning',
        message: `Warning: ${info.label} is elevated (${val}${info.unit})`,
        resolved: false
      });
    }
  });

  return alerts;
}
