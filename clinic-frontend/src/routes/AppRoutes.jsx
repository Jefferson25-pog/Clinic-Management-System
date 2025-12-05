// src/routes/AppRoutes.jsx - FIXED VERSION
import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layout/MainLayout";

// Public Pages
import Login from "../pages/Login";
import AdminLogin from "../pages/AdminLogin";
import StaffRoleSelect from "../pages/StaffRoleSelect";
import StaffLogin from "../pages/StaffLogin";

// Admin Pages - Core
import AdminDashboard from "../modules/admin/pages/AdminDashboard";
import SystemLogs from "../modules/admin/pages/SystemLogs";
import LoginHistory from "../modules/admin/pages/LoginHistory";
import CredentialsManagement from "../modules/admin/pages/CredentialsManagement";
import Reports from "../modules/admin/pages/Reports";

// Admin Pages - Staff Management
import StaffList from "../modules/admin/pages/staff/StaffList";
import StaffAdd from "../modules/admin/pages/staff/StaffAdd";
import StaffEdit from "../modules/admin/pages/staff/StaffEdit";
import StaffDelete from "../modules/admin/pages/staff/StaffDelete";

// Admin Pages - Department Management
import DepartmentList from "../modules/admin/pages/departments/DepartmentList";
import DepartmentAdd from "../modules/admin/pages/departments/DepartmentAdd";
import DepartmentEdit from "../modules/admin/pages/departments/DepartmentEdit";
import DepartmentDelete from "../modules/admin/pages/departments/DepartmentDelete";

// Admin Pages - Account Management
import ResetPassword from "../modules/admin/pages/ResetPassword";

// Staff Module Pages
import DoctorDashboard from "../modules/doctor/pages/DoctorDashboard";
import ReceptionDashboard from "../modules/reception/pages/ReceptionDashboard";
import PharmacyDashboard from "../modules/pharmacy/pages/PharmacyDashboard";
import LabTechDashboard from "../modules/labtechnician/pages/LabTechDashboard";

// Common Pages
import NotFound from "../pages/NotFound";
import Unauthorized from "../pages/Unauthorized";

// Loading component
const LoadingScreen = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <div className="text-center">
      <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-3 text-muted">Loading application...</p>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* ============= PUBLIC ROUTES ============= */}
        
        {/* Main Login - Redirects based on user type */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Admin Login */}
        <Route path="/login/admin" element={<AdminLogin />} />
        
        {/* Staff Login Flow */}
        <Route path="/login/staff" element={<StaffRoleSelect />} />
        <Route path="/login/staff/:roleSlug" element={<StaffLogin />} />
        
        {/* Error Pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/404" element={<NotFound />} />
        
        {/* ============= PROTECTED ADMIN ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Super Admin", "Admin"]} />}>
          {/* Admin Dashboard */}
          <Route path="/admin" element={<MainLayout><AdminDashboard /></MainLayout>} />
          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          
          {/* Staff Management Routes */}
          <Route path="/admin/staff" element={<MainLayout><StaffList /></MainLayout>} />
          <Route path="/admin/staff/add" element={<MainLayout><StaffAdd /></MainLayout>} />
          <Route path="/admin/staff/edit/:id" element={<MainLayout><StaffEdit /></MainLayout>} />
          <Route path="/admin/staff/delete/:id" element={<MainLayout><StaffDelete /></MainLayout>} />
          
          {/* Staff Account Management Routes */}
          <Route path="/admin/staff/reset-password/:id" element={<MainLayout><ResetPassword /></MainLayout>} />
          
          {/* Department Management Routes */}
          <Route path="/admin/departments" element={<MainLayout><DepartmentList /></MainLayout>} />
          <Route path="/admin/departments/add" element={<MainLayout><DepartmentAdd /></MainLayout>} />
          <Route path="/admin/departments/edit/:id" element={<MainLayout><DepartmentEdit /></MainLayout>} />
          <Route path="/admin/departments/delete/:id" element={<MainLayout><DepartmentDelete /></MainLayout>} />
          
          {/* System Management Routes */}
          <Route path="/admin/reports" element={<MainLayout><Reports /></MainLayout>} />
          <Route path="/admin/system-logs" element={<MainLayout><SystemLogs /></MainLayout>} />
          <Route path="/admin/login-history" element={<MainLayout><LoginHistory /></MainLayout>} />
          <Route path="/admin/credentials" element={<MainLayout><CredentialsManagement /></MainLayout>} />
          
          {/* Account Management Routes */}
          <Route path="/admin/accounts" element={<Navigate to="/admin/credentials" replace />} />
          <Route path="/admin/user-management" element={<Navigate to="/admin/credentials" replace />} />
          
          {/* Password Management */}
          <Route path="/admin/reset-password" element={<Navigate to="/admin/credentials" replace />} />
          <Route path="/admin/change-password" element={<Navigate to="/admin/credentials" replace />} />
        </Route>

        {/* ============= PROTECTED DOCTOR ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Doctor"]} />}>
          <Route path="/doctor" element={<MainLayout><DoctorDashboard /></MainLayout>} />
          <Route path="/doctor/dashboard" element={<Navigate to="/doctor" replace />} />
          <Route path="/doctor/*" element={<Navigate to="/doctor" replace />} />
        </Route>

        {/* ============= PROTECTED RECEPTIONIST ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Receptionist"]} />}>
          <Route path="/reception" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
          <Route path="/reception/dashboard" element={<Navigate to="/reception" replace />} />
          <Route path="/reception/*" element={<Navigate to="/reception" replace />} />
        </Route>

        {/* ============= PROTECTED PHARMACIST ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Pharmacist"]} />}>
          <Route path="/pharmacy" element={<MainLayout><PharmacyDashboard /></MainLayout>} />
          <Route path="/pharmacy/dashboard" element={<Navigate to="/pharmacy" replace />} />
          <Route path="/pharmacy/*" element={<Navigate to="/pharmacy" replace />} />
        </Route>

        {/* ============= PROTECTED LAB TECHNICIAN ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Lab Technician"]} />}>
          <Route path="/lab" element={<MainLayout><LabTechDashboard /></MainLayout>} />
          <Route path="/lab/dashboard" element={<Navigate to="/lab" replace />} />
          <Route path="/lab/*" element={<Navigate to="/lab" replace />} />
          {/* Alternative route for lab technician */}
          <Route path="/labtechnician" element={<Navigate to="/lab" replace />} />
        </Route>

        {/* ============= COMMON PROTECTED ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Super Admin", "Admin", "Doctor", "Receptionist", "Pharmacist", "Lab Technician"]} />}>
          {/* Profile Management - Accessible to all authenticated users */}
          <Route path="/profile" element={<MainLayout><div>Profile Page - To be implemented</div></MainLayout>} />
          <Route path="/settings" element={<MainLayout><div>Settings Page - To be implemented</div></MainLayout>} />
          <Route path="/change-password" element={<MainLayout><div>Change Password - To be implemented</div></MainLayout>} />
        </Route>

        {/* ============= CATCH-ALL ROUTES ============= */}
        
        {/* 404 - Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;