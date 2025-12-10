// src/modules/admin/services/adminApi.js - FIXED ENDPOINTS
import axiosInstance from "../../../api/axiosInstance.js";

export const adminApi = {
  // ============= Staff CRUD Operations =============
  getStaff: (params = {}) => 
    axiosInstance.get("/api/admin/staffs/", { params }),
  
  getStaffById: (id) => 
    axiosInstance.get(`/api/admin/staffs/${id}/`),
  
  createStaff: (data) => 
    axiosInstance.post("/api/admin/staffs/", data),
  
  updateStaff: (id, data) => 
    axiosInstance.put(`/api/admin/staffs/${id}/`, data),
  
  deleteStaff: (id) => 
    axiosInstance.delete(`/api/admin/staffs/${id}/`),
  
  // ============= Staff Account Management =============
  activateStaffAccount: (staffId) => 
    axiosInstance.post(`/api/admin/staffs/${staffId}/activate_account/`),
  
  deactivateStaffAccount: (staffId) => 
    axiosInstance.post(`/api/admin/staffs/${staffId}/deactivate_account/`),
  
  checkStaffAccount: (staffId) =>
    axiosInstance.get(`/api/admin/staffs/${staffId}/check_account/`),

  // ============= Account Linking =============
  linkStaffToUser: (staffId, userId) => 
    axiosInstance.post(`/api/admin/staffs/${staffId}/link_to_user/`, {
      user_id: userId 
    }),
  
  unlinkStaffAccount: (staffId) => 
    axiosInstance.post(`/api/admin/staffs/${staffId}/unlink_account/`),
  
  // ============= PASSWORD MANAGEMENT =============
  resetUserPasswordById: (userId, data) => 
  axiosInstance.post(`/api/admin/staffs/${userId}/reset_password/`, {
    new_password: data.new_password 
  }),
  
  // Create user account (STANDALONE - not linked to staff)
  createUser: (data) => 
    axiosInstance.post("/api/auth/users/create/", data),
  
  // Create user account FOR STAFF (linked to staff member)
  createStaffUserAccount: (staffId, accountData) =>
    axiosInstance.post(`/api/admin/staffs/${staffId}/create_user_account/`, accountData),

  // ============= Department Management =============
  getDepartments: (params = {}) => 
    axiosInstance.get("/api/admin/departments/", { params }),
  
  getDepartmentById: (id) => 
    axiosInstance.get(`/api/admin/departments/${id}/`),
  
  createDepartment: (data) => 
    axiosInstance.post("/api/admin/departments/", data),
  
  updateDepartment: (id, data) => 
    axiosInstance.put(`/api/admin/departments/${id}/`, data),
  
  deleteDepartment: (id) => 
    axiosInstance.delete(`/api/admin/departments/${id}/`),

  // ============= Groups/Roles =============
  getGroups: () => 
    axiosInstance.get("/api/admin/groups/"),
  
  createGroup: (data) => 
    axiosInstance.post("/api/admin/groups/", data),
  
  updateGroup: (id, data) => 
    axiosInstance.put(`/api/admin/groups/${id}/`, data),
  
  deleteGroup: (id) => 
    axiosInstance.delete(`/api/admin/groups/${id}/`),

  // ============= User Management =============
  getUsers: (params = {}) => 
    axiosInstance.get("/api/auth/users/", { params }),
  
  getAvailableUsers: () => 
    axiosInstance.get("/api/auth/users/unlinked/"),
  
  updateUser: (id, data) => 
    axiosInstance.put(`/api/auth/users/${id}/`, data),
  
  deleteUser: (id) => 
    axiosInstance.delete(`/api/auth/users/${id}/delete/`),

  syncUserRole: (userId) =>
    axiosInstance.post(`/api/auth/users/${userId}/sync-role/`),
  
  // ============= System Logs =============
  getSystemLogs: (params = {}) =>
    axiosInstance.get("/api/auth/system-logs/", { params }),
  
  getActivityMonitor: () =>
    axiosInstance.get("/api/auth/activity-monitor/"),
  
  // FIX THIS ENDPOINT - IT MIGHT BE DIFFERENT
  getDashboardStats: () =>
    axiosInstance.get("/api/admin/dashboard-stats/"), // Changed from /api/auth/dashboard-stats/
  
  // ============= Login History =============
  getLoginHistory: (params = {}) =>
    axiosInstance.get("/api/auth/login-history/", { params }),

  forceLogout: (loginId) =>
    axiosInstance.post(`/api/auth/login-history/${loginId}/force-logout/`),
  
  // Add a debug endpoint
  testEndpoint: (endpoint) =>
    axiosInstance.get(endpoint),
};

export const authApi = {
  // ============= Authentication =============
  login: (data) => 
    axiosInstance.post("/api/auth/token/", data),
  
  refreshToken: (refreshToken) => 
    axiosInstance.post("/api/auth/token/refresh/", { refresh: refreshToken }),
  
  logout: () =>
    axiosInstance.post("/api/auth/logout/"),
  
  verifyToken: () =>
    axiosInstance.post("/api/auth/token/verify/"),
  
  // ============= User Profile =============
  getProfile: () => 
    axiosInstance.get("/api/auth/profile/"),
  
  updateProfile: (data) => 
    axiosInstance.put("/api/auth/profile/", data),
  
  // ============= Password Management =============
  resetUserPassword: (staffId, newPassword) => 
  axiosInstance.post(`/api/admin/staffs/${staffId}/reset_password/`, {
    new_password: newPassword 
  }),
  
  // Check auth endpoint
  checkAuth: () =>
    axiosInstance.get("/api/auth/check-auth/"),
};

export default adminApi;