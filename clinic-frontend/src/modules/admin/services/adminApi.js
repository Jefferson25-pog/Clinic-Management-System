// src/modules/admin/services/adminApi.js - UPDATED
import axiosInstance from "../../../api/axiosInstance.js";

export const adminApi = {
  // ============= Staff CRUD Operations =============
  getStaff: (params = {}) => 
    axiosInstance.get("/admin/staffs/", { params }),
  
  getStaffById: (id) => 
    axiosInstance.get(`/admin/staffs/${id}/`),
  
  createStaff: (data) => 
    axiosInstance.post("/admin/staffs/", data),
  
  updateStaff: (id, data) => 
    axiosInstance.put(`/admin/staffs/${id}/`, data),
  
  deleteStaff: (id) => 
    axiosInstance.delete(`/admin/staffs/${id}/`),
  
  // ============= Staff Account Management =============
  activateStaffAccount: (staffId) => 
    axiosInstance.post(`/admin/staffs/${staffId}/activate_account/`),
  
  deactivateStaffAccount: (staffId) => 
    axiosInstance.post(`/admin/staffs/${staffId}/deactivate_account/`),
  
  checkStaffAccount: (staffId) =>
    axiosInstance.get(`/admin/staffs/${staffId}/check_account/`),

  // ============= Account Linking =============
  linkStaffToUser: (staffId, userId) => 
    axiosInstance.post(`/admin/staffs/${staffId}/link_to_user/`, { 
      user_id: userId 
    }),
  
  unlinkStaffAccount: (staffId) => 
    axiosInstance.post(`/admin/staffs/${staffId}/unlink_account/`),
  
  // ============= PASSWORD MANAGEMENT - USE AUTH ENDPOINTS =============
  resetUserPassword: (staffId, newPassword) => 
    axiosInstance.post(`/auth/staff/${staffId}/reset-password/`, { 
      new_password: newPassword 
    }),
  
  // Create user account for staff (using authentication endpoint)
  createUserAccount: (data) => 
    axiosInstance.post("/auth/users/create/", data),
  
  // Legacy functions - KEEP FOR COMPATIBILITY
  setStaffPassword: (staffId, newPassword) => 
    axiosInstance.post(`/admin/staffs/${staffId}/set_custom_password/`, { 
      new_password: newPassword 
    }),
  
  createStaffUserAccount: (staffId, accountData) =>
    axiosInstance.post(`/admin/staffs/${staffId}/create_user_account/`, accountData),

  // ============= Department Management =============
  getDepartments: (params = {}) => 
    axiosInstance.get("/admin/departments/", { params }),
  
  getDepartmentById: (id) => 
    axiosInstance.get(`/admin/departments/${id}/`),
  
  createDepartment: (data) => 
    axiosInstance.post("/admin/departments/", data),
  
  updateDepartment: (id, data) => 
    axiosInstance.put(`/admin/departments/${id}/`, data),
  
  deleteDepartment: (id) => 
    axiosInstance.delete(`/admin/departments/${id}/`),

  // ============= Groups/Roles =============
  getGroups: () => 
    axiosInstance.get("/admin/groups/"),
  
  createGroup: (data) => 
    axiosInstance.post("/admin/groups/", data),
  
  updateGroup: (id, data) => 
    axiosInstance.put(`/admin/groups/${id}/`, data),
  
  deleteGroup: (id) => 
    axiosInstance.delete(`/admin/groups/${id}/`),

  // ============= User Management =============
  getUsers: (params = {}) => 
    axiosInstance.get("/auth/users/", { params }),
  
  getAvailableUsers: () => 
    axiosInstance.get("/auth/users/unlinked/"),
  
  createUser: (data) => 
    axiosInstance.post("/auth/users/create/", data),
  
  updateUser: (id, data) => 
    axiosInstance.put(`/auth/users/${id}/`, data),
  
  deleteUser: (id) => 
    axiosInstance.delete(`/auth/users/${id}/delete/`),
  
  resetUserPasswordById: (userId, data) => 
    axiosInstance.post(`/auth/users/${userId}/reset-password/`, data),
  
  // ============= System Logs =============
  getSystemLogs: (params = {}) =>
    axiosInstance.get("/auth/system-logs/", { params }),
  
  getActivityMonitor: () =>
    axiosInstance.get("/auth/activity-monitor/"),
  
  getDashboardStats: () =>
    axiosInstance.get("/auth/dashboard-stats/"),
  
  // ============= Login History =============
  getLoginHistory: (params = {}) =>
    axiosInstance.get("/auth/login-history/", { params }),

  forceLogout: (loginId) =>
    axiosInstance.post(`/auth/login-history/${loginId}/force-logout/`),
};

export const authApi = {
  // ============= Authentication =============
  login: (data) => 
    axiosInstance.post("/auth/token/", data),
  
  refreshToken: (refreshToken) => 
    axiosInstance.post("/auth/token/refresh/", { refresh: refreshToken }),
  
  logout: () =>
    axiosInstance.post("/auth/logout/"),
  
  verifyToken: () =>
    axiosInstance.post("/auth/token/verify/"),
  
  // ============= User Profile =============
  getProfile: () => 
    axiosInstance.get("/auth/profile/"),
  
  updateProfile: (data) => 
    axiosInstance.put("/auth/profile/", data),
  
  // ============= Password Management =============
  changePassword: (data) => 
    axiosInstance.post("/auth/change-password/", data),
};

export default adminApi;