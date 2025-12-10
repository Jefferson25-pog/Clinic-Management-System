# adminapp/constants.py

# Qualification options by role
QUALIFICATION_OPTIONS = {
    'Doctor': [
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
        'FRCS'
    ],
    'Pharmacist': [
        'D.Pharm',
        'B.Pharm',
        'Pharm.D',
        'M.Pharm',
        'Diploma in Pharmacy'
    ],
    'Lab Technician': [
        'DMLT',
        'BMLT',
        'B.Sc MLT',
        'M.Sc MLT',
        'Diploma in Radiology',
        'X-Ray Technician',
        'ECG Technician'
    ],
    'Nurse': [
        'ANM',
        'GNM',
        'B.Sc Nursing',
        'M.Sc Nursing',
        'Post Basic B.Sc Nursing'
    ],
    'Receptionist': [
        '10+2',
        'High School',
        'Bachelor\'s Degree',
        'Diploma in Hospital Admin',
        'Medical Receptionist Certificate',
        'BBA',
        'B.Com',
        'BA'
    ],
    'Admin': [
        'MBA',
        'MHA',
        'BBA',
        'Bachelor\'s Degree',
        'Master\'s Degree',
        'Hospital Admin Diploma',
        'Healthcare Management'
    ],
    'Physiotherapist': [
        'BPT',
        'MPT',
        'Diploma in Physiotherapy'
    ],
    'Radiologist': [
        'MD (Radiology)',
        'DNB (Radiology)',
        'Diploma in Radiology'
    ],
    'Other': [
        '10+2',
        'High School',
        'Bachelor\'s Degree',
        'Master\'s Degree',
        'Diploma',
        'Certificate Course'
    ]
}

# License number formats with examples
LICENSE_FORMATS = {
    'Doctor': [
        {'format': '123456', 'example': 'MCI Registration Number (6-10 digits)'},
        {'format': 'TN/12345/2010', 'example': 'State Medical Council (State/Number/Year)'},
        {'format': 'MH/1234/2015', 'example': 'Maharashtra Medical Council'},
        {'format': 'KA/5678/2012', 'example': 'Karnataka Medical Council'},
    ],
    'Pharmacist': [
        {'format': 'PCI-12345', 'example': 'Pharmacy Council of India'},
        {'format': 'KA/1234/2015', 'example': 'State Pharmacy Council (State/Number/Year)'},
        {'format': 'MH/5678/2020', 'example': 'Maharashtra Pharmacy Council'},
    ],
    'Lab Technician': [
        {'format': 'DMLT-1234', 'example': 'Diploma in Medical Lab Technology'},
        {'format': 'BMLT-5678', 'example': 'Bachelor of Medical Lab Technology'},
        {'format': 'KA/LT/1234', 'example': 'State Lab Technician Registration'},
    ],
    'Nurse': [
        {'format': 'INC-123456', 'example': 'Indian Nursing Council'},
        {'format': 'TN/NUR/1234', 'example': 'State Nursing Council'},
    ]
}

# Qualification duration in years
QUALIFICATION_DURATIONS = {
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
    'Bachelor\'s Degree': 3,
    'Master\'s Degree': 2,
    'MBA': 2,
    'MHA': 2,
}