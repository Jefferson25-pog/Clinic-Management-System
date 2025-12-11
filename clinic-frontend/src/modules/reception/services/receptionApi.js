// src/modules/reception/services/receptionApi.js
import axiosInstance from "../../../api/axiosInstance.js";

export const receptionApi = {
  // ============= Patient Management =============
  getPatients: (params = {}) => 
    axiosInstance.get("/api/reception/patients/", { params }),

  getPatientsAdvanced: (params = {}) => 
    axiosInstance.get("/api/reception/patients/advanced_search/", { params }),
  
  getPatientStats: () => 
    axiosInstance.get("/api/reception/patients/stats/"),
  
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
  getDoctors: (params = {}) => {
    // Convert 'status' parameter to 'available_only' if needed
    if (params.status === 'Available') {
      const newParams = { ...params, available_only: 'true' };
      delete newParams.status;
      return axiosInstance.get("/api/reception/doctors/", { params: newParams });
    }
    return axiosInstance.get("/api/reception/doctors/", { params });
  },
  
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

  // ============= NEW: Essential Hub/Management Endpoints =============
  
  // For BillingManagementPage (/reception/billing)
  getBillingSummary: () => 
    axiosInstance.get("/api/reception/billing/summary/"),
  
  // For Reports if you have a reports page
  getDailyReport: (date = null) => 
    axiosInstance.get("/api/reception/reports/daily/", { params: { date } }),
  
  // For patient search/quick add
  quickPatientSearch: (query) => 
    axiosInstance.get("/api/reception/patients/quick_search/", { params: { q: query } }),
  
  // For appointment calendar view
  getAppointmentsByDate: (date) => 
    axiosInstance.get("/api/reception/appointments/by_date/", { params: { date } }),
  
  // For doctor schedules
  getDoctorSchedule: (doctorId, date = null) => 
    axiosInstance.get("/api/reception/doctors/schedule/", { 
      params: { doctor_id: doctorId, date } 
    }),

  // ============= NEW: Print/Export Functions =============
  printAppointment: (appointmentId) => 
    axiosInstance.get(`/api/reception/print/appointment/${appointmentId}/`, { 
      responseType: 'blob' 
    }),
  
  printBillReceipt: (billId) => 
    axiosInstance.get(`/api/reception/print/bill/${billId}/`, { 
      responseType: 'blob' 
    }),

  // ============= NEW: Dashboard Specific =============
  getReceptionDashboardData: () => 
    axiosInstance.get("/api/reception/dashboard/data/"),
  
  // ============= NEW: Appointments - Additional Actions =============
  getAvailableTimeSlots: (doctorId, date) => 
    axiosInstance.get("/api/reception/appointments/available_slots/", {
      params: { doctor_id: doctorId, date }
    }),
  
  cancelAppointmentWithReason: (appointmentId, data) => 
    axiosInstance.post(`/api/reception/appointments/${appointmentId}/cancel/`, data),
  
  // ============= NEW: Bills - Additional Actions =============
  markBillAsPaid: (billId, data) => 
    axiosInstance.post(`/api/reception/bills/${billId}/mark_paid/`, data),
  
  generateBillPDF: (billId) => 
    axiosInstance.get(`/api/reception/bills/${billId}/pdf/`, { 
      responseType: 'blob' 
    }),

  // ============= NEW: Patient - Additional Actions =============
  getPatientAppointments: (patientId) => 
    axiosInstance.get(`/api/reception/patients/${patientId}/appointments/`),
  
  getPatientBills: (patientId) => 
    axiosInstance.get(`/api/reception/patients/${patientId}/bills/`),

};

export default receptionApi;