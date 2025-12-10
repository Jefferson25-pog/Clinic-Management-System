// src/modules/doctor/services/doctorApi.js - SIMPLIFIED VERSION
import axiosInstance from "../../../api/axiosInstance.js";

const doctorApi = {
  // REMOVE ALL AVAILABILITY ENDPOINTS FOR NOW
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
  
  createConsultationFromAppointment: (appointmentId, data) => 
    axiosInstance.post(`/api/doctor/consultations/${appointmentId}/create_consultation/`, data),

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
    axiosInstance.post("/api/doctor/lab-test-requests/request_lab_test/", data),
  
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

  // ============= Doctor Profile (from auth API) =============
  getMyProfile: () => 
    axiosInstance.get("/api/auth/profile/"),
  
  updateMyProfile: (data) => 
    axiosInstance.put("/api/auth/profile/", data),

  // ============= Dashboard Stats =============
  getDashboardStats: () => 
    axiosInstance.get("/api/doctor/dashboard/stats/"),
};

export default doctorApi;