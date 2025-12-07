// src/context/AuthContext.jsx - UPDATED WITH CORRECT API ENDPOINTS
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance.js';

// Create context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const isBrowser = typeof window !== 'undefined';

// Role to dashboard mapping
const ROLE_DASHBOARD_PATHS = {
  'Super Admin': '/admin',
  'Admin': '/admin',
  'Doctor': '/doctor',
  'Receptionist': '/reception',
  'Pharmacist': '/pharmacy',
  'Lab Technician': '/lab',
  'User': '/'
};

// Frontend role to backend role mapping
const FRONTEND_TO_BACKEND_ROLE = {
  'doctor': 'Doctor',
  'reception': 'Receptionist',
  'pharmacy': 'Pharmacist',
  'lab': 'Lab Technician'
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [staffDetail, setStaffDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Storage functions
  const getFromStorage = useCallback((key) => {
    if (!isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get ${key} from localStorage:`, error);
      return null;
    }
  }, []);

  const setToStorage = useCallback((key, value) => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to set ${key} to localStorage:`, error);
    }
  }, []);

  const clearStorage = useCallback(() => {
    if (!isBrowser) return;
    try {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      localStorage.removeItem('staff_detail');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, []);

  // Get user role
  const getRole = useCallback(() => {
  if (!user) return null;
  
  // Priority 1: Super Admin
  if (user.is_superuser) return 'Super Admin';
  
  // Priority 2: Staff role from profile (MOST IMPORTANT)
  if (staffDetail && staffDetail.Role) return staffDetail.Role;
  
  // Priority 3: Admin flag from profile
  if (user.profile?.is_admin_user) return 'Admin';
  
  // Priority 4: Django staff flag
  if (user.is_staff) return 'Staff';
  
  // Priority 5: User role from groups
  if (user.groups && user.groups.length > 0) {
    return user.groups[0].name;
  }
  
  return 'User';
}, [user, staffDetail]);

  // Get dashboard path based on role
  const getDashboardPath = useCallback(() => {
    const role = getRole();
    return ROLE_DASHBOARD_PATHS[role] || '/login';
  }, [getRole]);

  // Check authentication status - FIXED: Add /api/ prefix
  const checkAuth = useCallback(async () => {
    if (!isBrowser) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    const token = getFromStorage('access');
    if (!token) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const response = await axiosInstance.get('/api/auth/check-auth/'); // ADDED /api/
      
      if (response.data.authenticated) {
        setUser(response.data.user);
        setStaffDetail(response.data.staff_detail || null);
      } else {
        setUser(null);
        setStaffDetail(null);
      }
    } catch (error) {
      console.warn('Auth check failed:', error.message);
      setUser(null);
      setStaffDetail(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [getFromStorage]);

  // Initialize auth
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Admin login - FIXED: Add /api/ prefix
  const loginAdmin = useCallback(async (username, password) => {
    if (!isBrowser) throw new Error('Cannot login on server side');

    try {
      const response = await axiosInstance.post('/api/auth/admin-login/', { // ADDED /api/
        username,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || response.data.error || 'Invalid admin credentials.');
      }

      const { access, refresh } = response.data.tokens;
      const userData = response.data.user;
      
      // Store data
      setToStorage('access', access);
      setToStorage('refresh', refresh);
      setToStorage('user', JSON.stringify(userData));

      setUser(userData);
      setStaffDetail(null);

      return {
        success: true,
        user: userData,
        redirectPath: response.data.redirect_path || '/admin'
      };
    } catch (error) {
      console.error('Admin login error:', error);
      
      let errorMessage = error.message;
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0];
          errorMessage = firstError[0] || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }
  }, [setToStorage]);

// In AuthContext.jsx - Update loginStaff function around line 258
const loginStaff = useCallback(async (expectedRoleSlug, username, password) => {
    if (!isBrowser) throw new Error('Cannot login on server side');

    try {
        const response = await axiosInstance.post('/api/auth/staff-login/', {
            username,
            password,
        });

        if (!response.data.success) {
            throw new Error(response.data.message || response.data.error || 'Invalid staff credentials.');
        }

        const { user: userData, staff, tokens, redirect_path } = response.data;
        const expectedBackendRole = FRONTEND_TO_BACKEND_ROLE[expectedRoleSlug];

        // Check if staff exists and has role
        if (!staff || !staff.role) {
            throw new Error('Staff information incomplete. Please contact administrator.');
        }

        // Check if user is admin (should not use staff portal)
        if (userData.is_superuser || userData.is_staff) {
            throw new Error('Admins cannot log in through the staff portal. Please use admin login.');
        }

        // Validate role for specific portal
        if (expectedBackendRole && staff.role !== expectedBackendRole) {
            throw new Error(`You are registered as ${staff.role}, not ${expectedBackendRole}. Please login from the correct portal.`);
        }

        // Validate staff account status
        if (staff.Status && !['Available', 'Busy'].includes(staff.Status)) {
            throw new Error('Your staff account is not active. Please contact administrator.');
        }

        // Validate account_active field
        if (staff.account_active === false) {
            throw new Error('Your account has been deactivated. Please contact administrator.');
        }

        // Validate user is active
        if (!userData.is_active) {
            throw new Error('Your user account is inactive. Please contact administrator.');
        }

        // Store data
        setToStorage('access', tokens.access);
        setToStorage('refresh', tokens.refresh);
        setToStorage('user', JSON.stringify(userData));
        setToStorage('staff_detail', JSON.stringify(staff));

        setUser(userData);
        setStaffDetail(staff);

        return {
            success: true,
            user: userData,
            staff: staff,
            redirectPath: redirect_path || ROLE_DASHBOARD_PATHS[staff.role] || '/login'
        };
    } catch (error) {
        console.error('Staff login error:', error);
        
        let errorMessage = error.message;
        if (error.response && error.response.data) {
            const errorData = error.response.data;
            if (errorData.error) {
                errorMessage = errorData.error;
            } else if (errorData.message) {
                errorMessage = errorData.message;
            } else if (errorData.errors) {
                // Handle Django serializer errors
                if (typeof errorData.errors === 'object') {
                    const firstError = Object.values(errorData.errors)[0];
                    if (Array.isArray(firstError)) {
                        errorMessage = firstError[0];
                    } else {
                        errorMessage = firstError;
                    }
                } else if (Array.isArray(errorData.errors)) {
                    errorMessage = errorData.errors[0];
                }
            } else if (errorData.detail) {
                errorMessage = errorData.detail;
            }
        }
        
        throw new Error(errorMessage);
    }
}, [setToStorage]);

  // Logout - FIXED: Add /api/ prefix
  const logout = useCallback(async () => {
    if (!isBrowser) return;

    try {
      await axiosInstance.post('/api/auth/logout/', {}, { // ADDED /api/
        headers: {
          'Authorization': `Bearer ${getFromStorage('access')}`
        }
      });
    } catch (error) {
      console.warn('Logout error:', error.message);
    } finally {
      clearStorage();
      setUser(null);
      setStaffDetail(null);
      setInitialized(false);
    }
  }, [clearStorage, getFromStorage]);

  const value = {
    user,
    staffDetail,
    loading: loading || !initialized,
    loginAdmin,
    loginStaff,
    logout,
    checkAuth,
    getRole,
    getDashboardPath,
    isAuthenticated: !!user && !!getFromStorage('access'),
    isStaff: () => staffDetail && ['Doctor', 'Receptionist', 'Pharmacist', 'Lab Technician'].includes(staffDetail.Role),
    isAdmin: () => user && (user.is_staff || user.is_superuser),
    getStaffRole: () => staffDetail?.Role,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};