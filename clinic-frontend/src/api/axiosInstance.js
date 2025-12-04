// src/api/axiosInstance.js - COMPLETE FIXED VERSION
import axios from "axios";

// Check if we're in browser environment
const isBrowser = typeof window !== "undefined";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 second timeout
});

// Only add interceptors in browser
if (isBrowser) {
  // Request Interceptor
  axiosInstance.interceptors.request.use(
    (config) => {
      try {
        const token = localStorage.getItem("access");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn("Failed to get token from localStorage:", error);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Skip if already retried or not 401
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem("refresh");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }
        
        // Use axios directly (not axiosInstance) to avoid infinite loop
        const response = await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const newAccessToken = response.data.access;
        localStorage.setItem("access", newAccessToken);
        
        // Update the original request header
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        console.warn("Token refresh failed:", refreshError);
        try {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
        } catch (storageError) {
          console.warn("Failed to clear localStorage:", storageError);
        }
        
        // Only redirect if we're in browser
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
        
        return Promise.reject(refreshError);
      }
    }
  );
}

export default axiosInstance;