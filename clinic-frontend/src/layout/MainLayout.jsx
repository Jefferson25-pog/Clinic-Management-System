// src/layout/MainLayout.jsx - COMPLETE VERSION
import React from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MainLayout = ({ children }) => {
  const { user, staffDetail, logout, getRole } = useAuth();
  const navigate = useNavigate();
  const role = getRole();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const getDashboardTitle = () => {
    if (role === "Super Admin" || role === "Admin") return "Admin Dashboard";
    if (role === "Doctor") return "Doctor Dashboard";
    if (role === "Receptionist") return "Reception Dashboard";
    if (role === "Pharmacist") return "Pharmacy Dashboard";
    if (role === "Lab Technician") return "Lab Technician Dashboard";
    return "Dashboard";
  };

  const getDashboardPath = () => {
    if (role === "Super Admin" || role === "Admin") return "/admin";
    if (role === "Doctor") return "/doctor";
    if (role === "Receptionist") return "/reception";
    if (role === "Pharmacist") return "/pharmacy";
    if (role === "Lab Technician") return "/labtechnician";
    return "/";
  };

  return (
    <div className="container-fluid p-0">
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3">
        <div className="container">
          <Link className="navbar-brand fw-bold text-primary" to={getDashboardPath()}>
            🏥 Clinic Management
          </Link>
          
          <div className="d-flex align-items-center">
            <div className="me-4 text-end d-none d-md-block">
              <div className="fw-medium">{user?.username}</div>
              <div className="small text-muted">{role}</div>
              {staffDetail && staffDetail.Name && (
                <div className="small">{staffDetail.Name}</div>
              )}
            </div>
            
            <div className="dropdown">
              <button 
                className="btn btn-outline-secondary dropdown-toggle" 
                type="button" 
                id="userDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-person-circle me-1"></i>
                Account
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                {role === "Admin" || role === "Super Admin" ? (
                  <li>
                    <Link className="dropdown-item" to="/admin/change-password">
                      <i className="bi bi-key me-2"></i>Change Password
                    </Link>
                  </li>
                ) : null}
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mt-4">        
        <div className="content-area">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;