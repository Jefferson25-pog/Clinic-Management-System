// src/constants/qualifications.js
export const QUALIFICATION_OPTIONS = {
  Doctor: [
    'MBBS',
    'MD',
    'MS',
    'DM',
    'MCh',
    'DNB',
    'BAMS',
    'BHMS',
    'BUMS',
    'DCH',
    'DGO',
    'DLO',
    'D.Ortho',
    'DMRD',
    'DA',
    'DDVL',
    'DPM',
    'FCPS',
    'MRCP',
    'FRCS',
    'Other (Specify)'
  ],
  Pharmacist: [
    'D.Pharm',
    'B.Pharm',
    'Pharm.D',
    'M.Pharm',
    'Diploma in Pharmacy',
    'Other (Specify)'
  ],
  'Lab Technician': [
    'DMLT',
    'BMLT',
    'B.Sc MLT',
    'M.Sc MLT',
    'Diploma in Radiology',
    'X-Ray Technician',
    'ECG Technician',
    'Other (Specify)'
  ],
  Nurse: [
    'ANM',
    'GNM',
    'B.Sc Nursing',
    'M.Sc Nursing',
    'Post Basic B.Sc Nursing',
    'Other (Specify)'
  ],
  Receptionist: [
    '10+2',
    'High School',
    "Bachelor's Degree",
    'Diploma in Hospital Admin',
    'Medical Receptionist Certificate',
    'BBA',
    'B.Com',
    'BA',
    'Other (Specify)'
  ],
  Admin: [
    'MBA',
    'MHA',
    'BBA',
    "Bachelor's Degree",
    "Master's Degree",
    'Hospital Admin Diploma',
    'Healthcare Management',
    'Other (Specify)'
  ],
  Physiotherapist: [
    'BPT',
    'MPT',
    'Diploma in Physiotherapy',
    'Other (Specify)'
  ],
  Radiologist: [
    'MD (Radiology)',
    'DNB (Radiology)',
    'Diploma in Radiology',
    'Other (Specify)'
  ],
  Other: [
    '10+2',
    'High School',
    "Bachelor's Degree",
    "Master's Degree",
    'Diploma',
    'Certificate Course',
    'Other (Specify)'
  ]
};

// Qualification duration in years (for experience validation)
export const QUALIFICATION_DURATIONS = {
  'MBBS': 5.5,
  'MD': 3,
  'MS': 3,
  'DM': 3,
  'MCh': 3,
  'DNB': 3,
  'BAMS': 5.5,
  'BHMS': 5.5,
  'DCH': 2,
  'DGO': 2,
  'D.Pharm': 2,
  'B.Pharm': 4,
  'Pharm.D': 6,
  'DMLT': 2,
  'BMLT': 3,
  'ANM': 2,
  'GNM': 3.5,
  'B.Sc Nursing': 4,
  '10+2': 2,
  "Bachelor's Degree": 3,
  "Master's Degree": 2,
  'MBA': 2,
  'MHA': 2,
};

// Get qualification options by role
export const getQualificationOptions = (role) => {
  return QUALIFICATION_OPTIONS[role] || QUALIFICATION_OPTIONS['Other'];
};