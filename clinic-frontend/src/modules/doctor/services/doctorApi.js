// doctorApi.js - UPDATED VERSION
import axiosInstance from "../../../api/axiosInstance.js";

const doctorApi = {
  // ============= Appointments =============
  getMyAppointments: () => 
    axiosInstance.get("/api/doctor/appointments/my_appointments/"),
  
  getTodayAppointments: () => 
    axiosInstance.get("/api/doctor/appointments/today_appointments/"),
  
  getUpcomingAppointments: () => 
    axiosInstance.get("/api/doctor/appointments/upcoming_appointments/"),
  
  markAppointmentCompleted: (id) => 
    axiosInstance.post(`/api/doctor/appointments/${id}/mark_completed/`),
  
  updateAppointmentStatus: (id, status) => 
    axiosInstance.post(`/api/doctor/appointments/${id}/update_status/`, { status }),

  // ============= Consultations =============
  getConsultations: () => 
    axiosInstance.get("/api/doctor/consultations/"),
  
  getConsultation: (id) => 
    axiosInstance.get(`/api/doctor/consultations/${id}/`),
  
  createConsultation: (data) => 
    axiosInstance.post("/api/doctor/consultations/", data),
  
  updateConsultation: (id, data) => 
    axiosInstance.patch(`/api/doctor/consultations/${id}/`, data),
  
  getConsultationHistory: (params = {}) => 
    axiosInstance.get("/api/doctor/consultations/consultation_history/", { params }),
  
  getRecentConsultations: () => 
    axiosInstance.get("/api/doctor/consultations/recent_consultations/"),
  
  getTodayConsultations: () => 
    axiosInstance.get("/api/doctor/consultations/today_consultations/"),
  
  // NEW: Create consultation from appointment
  createConsultationFromAppointment: (data) => 
    axiosInstance.post("/api/doctor/consultations/create_from_appointment/", data),
  
  // NEW: Get consultation by appointment ID
  getConsultationByAppointmentId: (appointmentId) => 
    axiosInstance.get(`/api/doctor/consultations/by_appointment/${appointmentId}/`),
  
  getConsultationByToken: (tokenNo) => 
    axiosInstance.get(`/api/doctor/consultations/by_token/?token_no=${tokenNo}`),

  // ============= Prescriptions =============
  getPrescriptions: () => 
    axiosInstance.get("/api/doctor/prescriptions/"),
  
  createPrescription: (data) => 
    axiosInstance.post("/api/doctor/prescriptions/", data),
  
  updatePrescription: (id, data) => 
    axiosInstance.patch(`/api/doctor/prescriptions/${id}/`, data),
  
  deletePrescription: (id) => 
    axiosInstance.delete(`/api/doctor/prescriptions/${id}/`),
  
  getPatientPrescriptions: (patientId) => 
    axiosInstance.get(`/api/doctor/prescriptions/patient_prescriptions/?patient_id=${patientId}`),

  // ============= Availability =============
  getCurrentAvailability: () => 
    axiosInstance.get("/api/doctor/availability/current_status/"),
  
  toggleAvailability: () => 
    axiosInstance.post("/api/doctor/availability/toggle/"),  
  
  setAvailability: (status) => 
    axiosInstance.post("/api/doctor/availability/set_status/", { status }),

  // ============= Medicines =============
  getAvailableMedicines: () => 
    axiosInstance.get("/api/doctor/medicines/"),
  
  getMedicinesWithStock: () => 
    axiosInstance.get("/api/doctor/medicines/with_stock/"),

  // ============= Lab Tests =============
  getLabTests: () => 
    axiosInstance.get("/api/doctor/lab-tests/"),
  
  getLabTestRequests: () => 
    axiosInstance.get("/api/doctor/lab-test-requests/"),
  
  createLabTestRequest: (data) => 
    axiosInstance.post("/api/doctor/lab-test-requests/", data),
  
  updateLabTestRequest: (id, data) => 
    axiosInstance.patch(`/api/doctor/lab-test-requests/${id}/`, data),
  
  cancelLabTestRequest: (id) => 
    axiosInstance.post(`/api/doctor/lab-test-requests/${id}/cancel_request/`),

  // ============= Lab Results =============
  getLabResults: () => 
    axiosInstance.get("/api/doctor/lab-results/"),
  
  getPatientLabResults: (patientId) => 
    axiosInstance.get(`/api/doctor/lab-results/patient_results/?patient_id=${patientId}`),
  
  getPriorityLabResults: (priority) => 
    axiosInstance.get(`/api/doctor/lab-results/priority_results/?priority=${priority}`),
  
  getRecentLabResults: () => 
    axiosInstance.get("/api/doctor/lab-results/recent_results/"),
  
  getPendingLabResults: () => 
    axiosInstance.get("/api/doctor/lab-results/pending_results/"),

  // ============= Patient Search =============
  searchPatients: (searchTerm) => 
    axiosInstance.get(`/api/doctor/patients/search/?search=${encodeURIComponent(searchTerm)}`),

  getRecentPatients: () =>
    axiosInstance.get("/api/doctor/patients/recent/"),

  getPatientAppointments: (patientId) =>
    axiosInstance.get(`/api/doctor/patients/${patientId}/appointments/`),

  // ============= Doctor Profile =============
  getMyProfile: () => 
    axiosInstance.get("/api/auth/profile/"),
  
  updateMyProfile: (data) => 
    axiosInstance.put("/api/auth/profile/", data),

  // ============= Dashboard Stats =============
  getDashboardStats: () => 
    axiosInstance.get("/api/doctor/dashboard/stats/"),

  // ============= Patient Medical Info =============
  getPatientMedicalInfo: (patientId) => {
    console.log("Getting medical info for patient:", patientId);
    return axiosInstance.get(`/api/doctor/patient-medical-info/by_patient/`, {
      params: { patient_id: patientId }
    });
  },
  
  savePatientMedicalInfo: (patientId, data) => {
    console.log("Saving medical info for patient:", patientId, data);
    const requestData = {
      patient: patientId,
      ...data
    };
    return axiosInstance.post(`/api/doctor/patient-medical-info/`, requestData);
  },
  
  updatePatientVitals: (patientId, vitals) => {
    console.log("Updating vitals for patient:", patientId, vitals);
    const requestData = {
      patient_id: patientId,
      ...vitals
    };
    return axiosInstance.post(`/api/doctor/patient-medical-info/update_vitals/`, requestData);
  },

  // ============= Consultation Completion =============
  completeConsultation: (consultationId) => 
    axiosInstance.post(`/api/doctor/consultations/${consultationId}/complete_consultation/`),
  
  getConsultationBill: (consultationId) => 
    axiosInstance.get(`/api/doctor/consultations/${consultationId}/bill_info/`),
  
  // ============= Bills =============
  getPatientBills: (patientId) => 
    axiosInstance.get(`/api/receptionist/bills/?patient_id=${patientId}`),
  
  getConsultationBills: (consultationId) => 
    axiosInstance.get(`/api/receptionist/bills/?consultation_id=${consultationId}`),

  // ============= NEW: Start consultation (legacy support) =============
  startConsultation: (data) => 
    axiosInstance.post("/api/doctor/consultations/create_from_appointment/", data),

  createConsultationFromAppointment: (data) => 
    axiosInstance.post("/api/doctor/consultations/create_from_appointment/", data),
  
  // NEW: Get consultation by appointment ID
  getConsultationByAppointmentId: (appointmentId) => 
    axiosInstance.get(`/api/doctor/consultations/by_appointment/${appointmentId}/`),

};

export default doctorApi;