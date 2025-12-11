// src/routes/AppRoutes.jsx - UPDATED WITH CORRECT PHARMACY ROUTES
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
import StaffList from "../modules/admin/pages/staff/StaffList";
import DepartmentList from "../modules/admin/pages/departments/DepartmentList";
import LoginHistory from "../modules/admin/pages/LoginHistory";
import SystemLogs from "../modules/admin/pages/SystemLogs";
import CredentialsManagement from "../modules/admin/pages/CredentialsManagement";
import AdminReports from "../modules/admin/pages/Reports"; // Renamed to avoid conflict
import UserCreatePage from "../modules/admin/pages/UserCreatePage";
import ResetPassword from "../modules/admin/pages/ResetPassword";

// Staff CRUD Pages
import StaffAdd from "../modules/admin/pages/staff/StaffAdd";
import StaffEdit from "../modules/admin/pages/staff/StaffEdit";
import StaffView from "../modules/admin/pages/staff/StaffView";
import StaffDelete from "../modules/admin/pages/staff/StaffDelete";

// Department CRUD Pages
import DepartmentAdd from "../modules/admin/pages/departments/DepartmentAdd";
import DepartmentEdit from "../modules/admin/pages/departments/DepartmentEdit";
import DepartmentDelete from "../modules/admin/pages/departments/DepartmentDelete";

// ============= RECEPTIONIST PAGES =============
// Dashboard
import ReceptionDashboard from "../modules/reception/pages/ReceptionDashboard";

// Patient Management Hub & Pages
import PatientsListPage from "../modules/reception/pages/patients/PatientsListPage";
import AddPatientPage from "../modules/reception/pages/patients/AddPatientPage";
import EditPatientPage from "../modules/reception/pages/patients/EditPatientPage";
import ViewPatientPage from "../modules/reception/pages/patients/ViewPatientPage";

// Appointment Management Hub & Pages
import AppointmentsListPage from "../modules/reception/pages/appointments/AppointmentsListPage";
import CreateAppointmentPage from "../modules/reception/pages/appointments/CreateAppointmentPage";
import ViewAppointmentPage from "../modules/reception/pages/appointments/ViewAppointmentPage";
import EditAppointmentPage from "../modules/reception/pages/appointments/EditAppointmentPage";

// Billing Management Hub & Pages
import BillingManagementPage from "../modules/reception/pages/BillingManagementPage";
import BillsListPage from "../modules/reception/pages/billing/BillsListPage";
import CreateBillPage from "../modules/reception/pages/billing/CreateBillPage";
import BillDetailsPage from "../modules/reception/pages/billing/BillDetailsPage";

// ============= DOCTOR PAGES =============
import DoctorDashboard from "../modules/doctor/pages/DoctorDashboard";
import Appointments from "../modules/doctor/pages/Appointments";
import LabRequests from "../modules/doctor/pages/LabRequests";
import ConsultationForm from "../modules/doctor/pages/ConsultationForm";
import ConsultationHistory from "../modules/doctor/pages/ConsultationHistory";
import LabResults from "../modules/doctor/pages/LabResults";

// ============= PHARMACIST PAGES =============
import PharmacyDashboard from "../modules/pharmacy/pages/PharmacyDashboard";
import PharmacyLayout from "../modules/pharmacy/PharmacyLayout";
import Medicines from "../modules/pharmacy/pages/Medicines";
import Suppliers from "../modules/pharmacy/pages/Suppliers";
import Stock from "../modules/pharmacy/pages/Stock";
import StockOrders from "../modules/pharmacy/pages/StockOrders";
import Dispensing from "../modules/pharmacy/pages/Dispensing";
import PharmacyReports from "../modules/pharmacy/pages/Reports"; // Renamed to avoid conflict

// ============= LAB TECHNICIAN PAGES =============
import LabTechDashboard from "../modules/labtechnician/pages/LabTechDashboard";

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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/login/staff" element={<StaffRoleSelect />} />
        <Route path="/login/staff/:roleSlug" element={<StaffLogin />} />
        
        {/* ============= PROTECTED ADMIN ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Super Admin", "Admin"]} />}>
          <Route path="/admin" element={<MainLayout><AdminDashboard /></MainLayout>} />
          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
          
          {/* Staff Management Routes */}
          <Route path="/admin/staff" element={<MainLayout><StaffList /></MainLayout>} />
          <Route path="/admin/staff/add" element={<MainLayout><StaffAdd /></MainLayout>} />
          <Route path="/admin/staff/:id" element={<MainLayout><StaffView /></MainLayout>} />
          <Route path="/admin/staff/edit/:id" element={<MainLayout><StaffEdit /></MainLayout>} />
          <Route path="/admin/staff/delete/:id" element={<MainLayout><StaffDelete /></MainLayout>} />
          
          {/* Department Management Routes */}
          <Route path="/admin/departments" element={<MainLayout><DepartmentList /></MainLayout>} />
          <Route path="/admin/departments/add" element={<MainLayout><DepartmentAdd /></MainLayout>} />
          <Route path="/admin/departments/edit/:id" element={<MainLayout><DepartmentEdit /></MainLayout>} />
          <Route path="/admin/departments/delete/:id" element={<MainLayout><DepartmentDelete /></MainLayout>} />
          
          {/* Other Admin Routes */}
          <Route path="/admin/system-logs" element={<MainLayout><SystemLogs /></MainLayout>} />
          <Route path="/admin/login-history" element={<MainLayout><LoginHistory /></MainLayout>} />
          <Route path="/admin/credentials" element={<MainLayout><CredentialsManagement /></MainLayout>} />
          <Route path="/admin/reports" element={<MainLayout><AdminReports /></MainLayout>} />
          
          {/* User Management Routes */}
          <Route path="/admin/users/create" element={<MainLayout><UserCreatePage /></MainLayout>} />
          
          {/* Reset Password Routes */}
          <Route path="/admin/reset-password/user/:id" element={<MainLayout><ResetPassword /></MainLayout>} />
          <Route path="/admin/reset-password/staff/:id" element={<MainLayout><ResetPassword /></MainLayout>} />
        </Route>

        {/* ============= PROTECTED RECEPTIONIST ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Receptionist"]} />}>
          {/* Reception Dashboard */}
          <Route path="/reception" element={<MainLayout><ReceptionDashboard /></MainLayout>} />
          <Route path="/reception/dashboard" element={<Navigate to="/reception" replace />} />
    
          {/* Patient Management Routes - NEW STRUCTURE */}
          <Route path="/reception/patients/list" element={<MainLayout><PatientsListPage /></MainLayout>} />
          <Route path="/reception/patients/add" element={<MainLayout><AddPatientPage /></MainLayout>} />
          <Route path="/reception/patients/edit/:id" element={<MainLayout><EditPatientPage /></MainLayout>} />
          <Route path="/reception/patients/view/:id" element={<MainLayout><ViewPatientPage /></MainLayout>} />
    
          {/* Appointment Management Routes - NEW STRUCTURE */}
          <Route path="/reception/appointments/list" element={<MainLayout><AppointmentsListPage /></MainLayout>} />
          <Route path="/reception/appointments/create" element={<MainLayout><CreateAppointmentPage /></MainLayout>} />
          <Route path="/reception/appointments/view/:id" element={<MainLayout><ViewAppointmentPage /></MainLayout>} />
          <Route path="/reception/appointments/edit/:id" element={<MainLayout><EditAppointmentPage /></MainLayout>} />
    
          {/* Billing Management Routes - NEW STRUCTURE */}
          <Route path="/reception/billing" element={<MainLayout><BillingManagementPage /></MainLayout>} />
          <Route path="/reception/billing/list" element={<MainLayout><BillsListPage /></MainLayout>} />
          <Route path="/reception/billing/create" element={<MainLayout><CreateBillPage /></MainLayout>} />
          <Route path="/reception/billing/view/:id" element={<MainLayout><BillDetailsPage /></MainLayout>} />
    
          {/* Legacy Routes Redirects */}
          <Route path="/reception/patients/new" element={<Navigate to="/reception/patients/add" replace />} />
          <Route path="/reception/appointments/new" element={<Navigate to="/reception/appointments/create" replace />} />
          <Route path="/reception/billing/new" element={<Navigate to="/reception/billing/create" replace />} />
        </Route>

        {/* ============= PROTECTED DOCTOR ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Doctor"]} />}>
          <Route path="/doctor" element={<MainLayout><DoctorDashboard /></MainLayout>} />
          <Route path="/doctor/dashboard" element={<Navigate to="/doctor" replace />} />
          <Route path="/doctor/appointments" element={<MainLayout><Appointments /></MainLayout>} />
          <Route path="/doctor/consultation/:id?" element={<MainLayout><ConsultationForm /></MainLayout>} />
          <Route path="/doctor/lab-requests" element={<MainLayout><LabRequests /></MainLayout>} />
          <Route path="/doctor/lab-results" element={<MainLayout><LabResults /></MainLayout>} />
          <Route path="/doctor/history" element={<MainLayout><ConsultationHistory /></MainLayout>} />
          <Route path="/doctor/*" element={<Navigate to="/doctor" replace />} />
        </Route>

        {/* ============= PROTECTED PHARMACIST ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Pharmacist"]} />}>
          {/* Main Pharmacy Dashboard - This is what shows when they login */}
          <Route path="/pharmacy" element={<MainLayout><PharmacyDashboard /></MainLayout>} />
          <Route path="/pharmacy/dashboard" element={<Navigate to="/pharmacy" replace />} />
          
          {/* Separate route for Pharmacy Layout with nested routes */}
          {/* This route structure might be causing the confusion */}
          <Route path="/pharmacy/*" element={<MainLayout><PharmacyLayout /></MainLayout>}>
            {/* Default route inside PharmacyLayout - redirect to main dashboard */}
            
            {/* Medicines Management */}
            <Route path="medicines" element={<Medicines />} />
            
            {/* Suppliers Management */}
            <Route path="suppliers" element={<Suppliers />} />
            
            {/* Stock Management */}
            <Route path="stock" element={<Stock />} />
            
            {/* Stock Orders */}
            <Route path="stock-orders" element={<StockOrders />} />
            
            {/* Dispensing */}
            <Route path="dispensing" element={<Dispensing />} />
            
            {/* Reports */}
            <Route path="reports" element={<PharmacyReports />} />
            
            {/* Catch all - redirect to main pharmacy dashboard */}
            <Route path="*" element={<Navigate to="/pharmacy" replace />} />
          </Route>
        </Route>

        {/* ============= PROTECTED LAB TECHNICIAN ROUTES ============= */}
        <Route element={<ProtectedRoute allowedRoles={["Lab Technician"]} />}>
          <Route path="/lab" element={<MainLayout><LabTechDashboard /></MainLayout>} />
          <Route path="/lab/dashboard" element={<Navigate to="/lab" replace />} />
          <Route path="/lab/*" element={<Navigate to="/lab" replace />} />
          <Route path="/labtechnician" element={<Navigate to="/lab" replace />} />
        </Route>

        {/* ============= CATCH-ALL ROUTES ============= */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;