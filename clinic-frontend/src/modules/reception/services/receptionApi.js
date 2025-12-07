// src/modules/reception/services/receptionApi.js
import axiosInstance from "../../../api/axiosInstance.js";

export const receptionApi = {
  // ============= Patient Management =============
  getPatients: (params = {}) => 
    axiosInstance.get("/api/reception/patients/", { params }),
  
  getPatientById: (id) => 
    axiosInstance.get(`/api/reception/patients/${id}/`),
  
  createPatient: (data) => 
    axiosInstance.post("/api/reception/patients/register_patient/", data),
  
  updatePatient: (id, data) => 
    axiosInstance.put(`/api/reception/patients/${id}/`, data),
  
  deletePatient: (id) => 
    axiosInstance.delete(`/api/reception/patients/${id}/`),
  
  searchPatients: (query) => 
    axiosInstance.get("/api/reception/patients/", { params: { search: query } }),

  // ============= Appointment Management =============
  getAppointments: (params = {}) => 
    axiosInstance.get("/api/reception/appointments/", { params }),
  
  getAppointmentById: (id) => 
    axiosInstance.get(`/api/reception/appointments/${id}/`),
  
  createAppointment: (data) => 
    axiosInstance.post("/api/reception/appointments/schedule_appointment/", data),
  
  updateAppointment: (id, data) => 
    axiosInstance.put(`/api/reception/appointments/${id}/`, data),
  
  deleteAppointment: (id) => 
    axiosInstance.delete(`/api/reception/appointments/${id}/`),
  
  getTodayAppointments: () => 
    axiosInstance.get("/api/reception/appointments/today_appointments/"),

  // ============= Doctor Management =============
  getDoctors: (params = {}) => 
    axiosInstance.get("/api/reception/doctors/", { params }),
  
  getAllDoctors: () => 
    axiosInstance.get("/api/reception/doctors/all_doctors/"),
  
  getDoctorsByDepartment: () => 
    axiosInstance.get("/api/reception/doctors/available_by_department/"),
  
  checkDoctorAvailability: (doctorId, date) => 
    axiosInstance.get("/api/reception/doctors/check_doctor_availability/", {
      params: { doctor_id: doctorId, date }
    }),

  // ============= Billing Management =============
  getBills: (params = {}) => 
    axiosInstance.get("/api/reception/bills/", { params }),
  
  getBillById: (id) => 
    axiosInstance.get(`/api/reception/bills/${id}/`),
  
  createBill: (data) => 
    axiosInstance.post("/api/reception/bills/", data),
  
  updateBill: (id, data) => 
    axiosInstance.put(`/api/reception/bills/${id}/`, data),
  
  deleteBill: (id) => 
    axiosInstance.delete(`/api/reception/bills/${id}/`),
  
  recalculateBill: (id) => 
    axiosInstance.post(`/api/reception/bills/${id}/recalculate/`),
  
  getAvailableConsultations: () => 
    axiosInstance.get("/api/reception/bills/available_consultations/"),

  // ============= Consultation Management =============
  getConsultationById: (id) =>
    axiosInstance.get(`/api/doctor/consultations/${id}/`),

  // ============= Logs =============
  getLogs: (params = {}) => 
    axiosInstance.get("/api/reception/logs/", { params }),
  
  createLog: (data) => 
    axiosInstance.post("/api/reception/logs/", data),

  // ============= Quick Stats =============
  getQuickStats: () => 
    axiosInstance.get("/api/reception/quick-stats/"),
};

export default receptionApi;