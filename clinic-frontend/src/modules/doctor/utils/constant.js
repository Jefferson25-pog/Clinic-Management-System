export const APPOINTMENT_STATUS = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const CONSULTATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const PRIORITY_LEVELS = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  CRITICAL: 'critical'
};

export const LAB_TEST_PRIORITY = {
  ROUTINE: 'routine',
  PRIORITY: 'priority',
  STAT: 'stat'
};

export const FREQUENCY_CHOICES = [
  { value: '1-0-1', label: '1-0-1 (Morning-Night)' },
  { value: '0-1-1', label: '0-1-1 (Afternoon-Night)' },
  { value: '1-0-0', label: '1-0-0 (Morning only)' },
  { value: '0-1-0', label: '0-1-0 (Afternoon only)' },
  { value: '0-0-1', label: '0-0-1 (Night only)' },
  { value: '1-1-0', label: '1-1-0 (Morning-Afternoon)' },
  { value: '1-1-1', label: '1-1-1 (Morning-Afternoon-Night)' }
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' }
];