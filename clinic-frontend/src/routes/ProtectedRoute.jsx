// src/routes/ProtectedRoute.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, getRole, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server
  if (!isClient) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const userRole = getRole();
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    // Redirect to appropriate dashboard based on role
    switch (userRole) {
      case "Super Admin":
      case "Admin":
        return <Navigate to="/admin" replace />;
      case "Doctor":
        return <Navigate to="/doctor" replace />;
      case "Receptionist":
        return <Navigate to="/reception" replace />;
      case "Pharmacist":
        return <Navigate to="/pharmacy" replace />;
      case "Lab Technician":
        return <Navigate to="/labtechnician" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;