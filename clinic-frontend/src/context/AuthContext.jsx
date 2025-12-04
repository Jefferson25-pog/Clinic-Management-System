// src/context/AuthContext.jsx - COMPLETE FIXED VERSION
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance.js';

// Create context
const AuthContext = createContext(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

const allowedStaffRoles = [
  'Doctor',
  'Receptionist',
  'Pharmacist',
  'Lab Technician',
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [staffDetail, setStaffDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Safe localStorage functions
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
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }, []);

  // Get user role
  const getRole = useCallback(() => {
    if (!user) return null;
    
    if (user.is_superuser) return 'Super Admin';
    if (user.is_staff) return 'Admin';
    if (staffDetail && staffDetail.Role) return staffDetail.Role;
    if (user.profile?.is_admin_user) return 'Admin';
    
    return 'User';
  }, [user, staffDetail]);

  // Check authentication status
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
      const response = await axiosInstance.get('/auth/check-auth/');
      
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

  // Initialize auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Admin login
  const loginAdmin = useCallback(async (username, password) => {
    if (!isBrowser) throw new Error('Cannot login on server side');

    const response = await axiosInstance.post('/auth/admin-login/', {
      username,
      password,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Invalid admin credentials.');
    }

    const { access, refresh } = response.data.tokens;
    setToStorage('access', access);
    setToStorage('refresh', refresh);

    setUser(response.data.user);
    setStaffDetail(null);

    return response.data;
  }, [setToStorage]);

  // Staff login
  const loginStaff = useCallback(async (expectedRole, username, password) => {
    if (!isBrowser) throw new Error('Cannot login on server side');

    const response = await axiosInstance.post('/auth/staff-login/', {
      username,
      password,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Invalid staff credentials.');
    }

    const { user: userData, staff_detail, tokens } = response.data;

    // Role validation
    if (userData.is_superuser || userData.is_staff) {
      throw new Error('Admins cannot log in through the staff portal.');
    }

    if (!staff_detail) {
      throw new Error('No staff profile found for this user.');
    }

    if (!allowedStaffRoles.includes(staff_detail.Role)) {
      throw new Error('Your role does not have staff portal access.');
    }

    if (expectedRole && staff_detail.Role !== expectedRole) {
      throw new Error(
        `Only ${expectedRole} can log in here. You are a ${staff_detail.Role}.`
      );
    }

    // Store tokens
    setToStorage('access', tokens.access);
    setToStorage('refresh', tokens.refresh);

    setUser(userData);
    setStaffDetail(staff_detail);

    return response.data;
  }, [setToStorage]);

  // Logout
  const logout = useCallback(async () => {
    if (!isBrowser) return;

    try {
      await axiosInstance.post('/auth/logout/');
    } catch (error) {
      console.warn('Logout error:', error.message);
    }

    clearStorage();
    setUser(null);
    setStaffDetail(null);
    setInitialized(false);
  }, [clearStorage]);

  const value = {
    user,
    staffDetail,
    loading: loading || !initialized,
    loginAdmin,
    loginStaff,
    logout,
    checkAuth,
    getRole,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};