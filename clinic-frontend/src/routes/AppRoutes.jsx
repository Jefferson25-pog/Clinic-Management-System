// src/routes/AppRoutes.jsx - COMPLETE FIXED VERSION
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
import RolesManagement from "../modules/admin/pages/RolesManagement";
import SystemLogs from "../modules/admin/pages/SystemLogs";
import LoginHistory from "../modules/admin/pages/LoginHistory";
import CredentialsManagement from "../modules/admin/pages/CredentialsManagement";
import ChangePassword from "../modules/admin/pages/ChangePassword";

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

// Staff Module Pages
import DoctorDashboard from "../modules/doctor/pages/DoctorDashboard";
import ReceptionDashboard from "../modules/reception/pages/ReceptionDashboard";
import PharmacyDashboard from "../modules/pharmacy/pages/PharmacyDashboard";
import LabTechDashboard from "../modules/labtechnician/pages/LabTechDashboard";

// Loading component
const LoadingScreen = () => (
  <div className="d-flex justify-content-center align-items-center vh-100">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/staff" element={<StaffRoleSelect />} />
        <Route path="/login/staff/:roleSlug" element={<StaffLogin />} />
        
        {/* Redirect any unmatched /login path to main login */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        
        {/* Loading route for debugging */}
        <Route path="/loading" element={<LoadingScreen />} />

        {/* Protected Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={["Super Admin", "Admin"]} />}>
          {/* Admin Dashboard */}
          <Route path="/admin" element={<MainLayout><AdminDashboard /></MainLayout>} />
          
          {/* Staff Management Routes */}
          <Route path="/admin/staff" element={<MainLayout><StaffList /></MainLayout>} />
          <Route path="/admin/staff/add" element={<MainLayout><StaffAdd /></MainLayout>} />
          <Route path="/admin/staff/edit/:id" element={<MainLayout><StaffEdit /></MainLayout>} />
          <Route path="/admin/staff/delete/:id" element={<MainLayout><StaffDelete /></MainLayout>} />
          
          {/* Department Management Routes */}
          <Route path="/admin/departments" element={<MainLayout><DepartmentList /></MainLayout>} />
          <Route path="/admin/departments/add" element={<MainLayout><DepartmentAdd /></MainLayout>} />
          <Route path="/admin/departments/edit/:id" element={<MainLayout><DepartmentEdit /></MainLayout>} />
          <Route path="/admin/departments/delete/:id" element={<MainLayout><DepartmentDelete /></MainLayout>} />
          
          {/* System Management Routes */}
          <Route path="/admin/roles" element={<MainLayout><RolesManagement /></MainLayout>} />
          <Route path="/admin/system-logs" element={<MainLayout><SystemLogs /></MainLayout>} />
          <Route path="/admin/login-history" element={<MainLayout><LoginHistory /></MainLayout>} />
          <Route path="/admin/credentials" element={<MainLayout><CredentialsManagement /></MainLayout>} />
          <Route path="/admin/change-password" element={<MainLayout><ChangePassword /></MainLayout>} />
        </Route>

        {/* Protected doctor routes */}
        <Route element={<ProtectedRoute allowedRoles={["Doctor"]} />}>
          <Route path="/doctor" element={<MainLayout><DoctorDashboard /></MainLayout>} />
        </Route>

        {/* Protected receptionist routes */}
        <Route element={<ProtectedRoute allowedRoles={["Receptionist"]} />}>
          <Route path="/reception" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
        </Route>

        {/* Protected pharmacist routes */}
        <Route element={<ProtectedRoute allowedRoles={["Pharmacist"]} />}>
          <Route path="/pharmacy" element={<MainLayout><PharmacyDashboard /></MainLayout>} />
        </Route>

        {/* Protected lab technician routes */}
        <Route element={<ProtectedRoute allowedRoles={["Lab Technician"]} />}>
          <Route path="/labtechnician" element={<MainLayout><LabTechDashboard /></MainLayout>} />
        </Route>

        {/* Catch-all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;