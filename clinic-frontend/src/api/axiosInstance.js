// src/api/axiosInstance.js - CORRECTED
import axios from "axios";

const isBrowser = typeof window !== "undefined";

// Check if we're in development or production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

console.log("API Base URL:", API_BASE_URL); // Debug log

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  timeout: 10000, // 10 second timeout
  withCredentials: false, // Important: Set to false for JWT
});

// Only add interceptors in browser
if (isBrowser) {
  // Request Interceptor
  axiosInstance.interceptors.request.use(
  (config) => {
    try {
      // Try multiple possible token storage keys
      const token = localStorage.getItem("access") || 
                   localStorage.getItem("access_token") ||
                   localStorage.getItem("token");
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Failed to get token from localStorage:", error);
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

  // Response Interceptor
  axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try multiple possible refresh token keys
        const refreshToken = localStorage.getItem("refresh") || 
                            localStorage.getItem("refresh_token");
        
        if (!refreshToken) {
          throw new Error("No refresh token");
        }
        
        // Use a fresh axios instance to avoid loops
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          { refresh: refreshToken }
        );
        
        const newAccessToken = refreshResponse.data.access;
        // Save with consistent key
        localStorage.setItem("access", newAccessToken);
        localStorage.setItem("access_token", newAccessToken); // Backup
        
        // Update the original request header
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        console.warn("Token refresh failed:", refreshError);
        // Clear all possible token keys
        ['access', 'access_token', 'refresh', 'refresh_token', 'token'].forEach(key => {
          localStorage.removeItem(key);
        });
        
        if (isBrowser) {
          window.location.href = "/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);
}

// Add a test function
export const testAPI = async () => {
  try {
    console.log("Testing API connection to:", API_BASE_URL);
    const response = await axios.get(`${API_BASE_URL}/api/auth/check-auth/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access')}`
      }
    });
    console.log("API test successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("API test failed:", error);
    throw error;
  }
};

export default axiosInstance;