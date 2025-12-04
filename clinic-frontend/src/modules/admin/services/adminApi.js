// src/modules/admin/services/adminApi.js - UPDATED
import axiosInstance from "../../../api/axiosInstance.js";

export const adminApi = {
  // Staff CRUD operations
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
  
  createStaffAccount: (staffId) => 
    axiosInstance.post(`/admin/staffs/${staffId}/create_account/`),
  
  resetStaffPassword: (staffId) => 
    axiosInstance.post(`/admin/staffs/${staffId}/reset_password/`),

  // Department CRUD operations
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

  // Groups/Roles
  getGroups: () => 
    axiosInstance.get("/admin/groups/"),
  
  createGroup: (data) => 
    axiosInstance.post("/admin/groups/", data),
  
  updateGroup: (id, data) => 
    axiosInstance.put(`/admin/groups/${id}/`, data),
  
  deleteGroup: (id) => 
    axiosInstance.delete(`/admin/groups/${id}/`),

  // User management (for CredentialsManagement)
  getUsers: (params = {}) => 
    axiosInstance.get("/auth/users/", { params }),
  
  createUser: (data) => 
    axiosInstance.post("/auth/register/", data),
  
  updateUser: (id, data) => 
    axiosInstance.put(`/auth/users/${id}/`, data),
  
  deleteUser: (id) => 
    axiosInstance.delete(`/auth/users/${id}/`),
};

export const authApi = {
  changePassword: (data) => 
    axiosInstance.post("/auth/change-password/", data),
  
  getProfile: () => 
    axiosInstance.get("/auth/profile/"),
  
  updateProfile: (data) => 
    axiosInstance.put("/auth/profile/", data),
};

export default adminApi;