import axios from '../../../api/axiosInstance';

const doctorApi = {
  // Appointments
  getTodayAppointments: () => 
    axios.get('/api/doctors/appointments/today_appointments/'),
  
  getUpcomingAppointments: () => 
    axios.get('/api/doctors/appointments/upcoming_appointments/'),
  
  updateAppointmentStatus: (appointmentId, status) => 
    axios.post(`/api/doctors/appointments/${appointmentId}/update_status/`, { status }),
  
  // Consultations
  createConsultation: (appointmentId, data) => 
    axios.post(`/api/doctors/consultations/create_consultation/`, {
      TOKEN_NO: appointmentId,
      ...data
    }),
  
  getConsultationHistory: (params) => 
    axios.get('/api/doctors/consultations/consultation_history/', { params }),
  
  getRecentConsultations: () => 
    axios.get('/api/doctors/consultations/recent_consultations/'),
  
  // Prescriptions
  getAvailableMedicines: () => 
    axios.get('/api/doctors/medicines/with_stock/'),
  
  createPrescription: (data) => 
    axios.post('/api/doctors/prescriptions/', data),
  
  getPatientPrescriptions: (patientId) => 
    axios.get(`/api/doctors/prescriptions/patient_prescriptions/?patient_id=${patientId}`),
  
  // Lab Tests
  getLabTests: () => 
    axios.get('/api/doctors/lab-tests/'),
  
  requestLabTest: (data) => 
    axios.post('/api/doctors/lab-test-requests/request_lab_test/', data),
  
  getPendingLabResults: () => 
    axios.get('/api/doctors/lab-results/pending_results/'),
  
  getLabResults: (params) => 
    axios.get('/api/doctors/lab-results/', { params }),
  
  // Availability
  getAvailability: () => 
    axios.get('/api/doctors/availability/my_availability/'),
  
  setAvailability: (status) => 
    axios.post('/api/doctors/availability/set_availability/', { status }),
  
  // Patient Medical Info (Custom - need backend)
  getPatientMedicalInfo: (patientId) => 
    axios.get(`/api/patients/${patientId}/medical-info/`),
  
  updatePatientMedicalInfo: (patientId, data) => 
    axios.put(`/api/patients/${patientId}/medical-info/`, data)
};

export default doctorApi;