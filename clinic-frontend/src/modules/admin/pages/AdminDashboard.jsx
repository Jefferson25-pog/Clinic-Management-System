// src/modules/admin/pages/AdminDashboard.jsx
import React from "react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const adminTiles = [
    {
      title: "Staff Management",
      description: "Create, update and manage all staff members.",
      to: "/admin/staff",
    },
    {
      title: "Department Management",
      description: "Organize clinical departments and mappings.",
      to: "/admin/departments",
    },
    {
      title: "Roles & Permissions",
      description: "Manage user roles and group permissions.",
      to: "/admin/roles",
    },
    {
      title: "System Logs",
      description: "View security & system activity logs.",
      to: "/admin/system-logs",
    },
    {
      title: "Login History",
      description: "Monitor login attempts and history.",
      to: "/admin/login-history",
    },
    {
      title: "Credentials / Passwords",
      description: "Create accounts and change passwords.",
      to: "/admin/credentials",
    },
  ];

  const moduleTiles = [
    {
      title: "Doctor Module",
      description: "Go to Doctor-facing interface.",
      to: "/doctor",
    },
    {
      title: "Reception Module",
      description: "Go to Receptionist interface.",
      to: "/reception",
    },
    {
      title: "Pharmacy Module",
      description: "Go to Pharmacy interface.",
      to: "/pharmacy",
    },
    {
      title: "LabTech Module",
      description: "Go to Lab Technician interface.",
      to: "/labtechnician",
    },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Admin Dashboard</h3>
          <p className="text-muted mb-0">
            Central hub for managing staff, departments, roles, and audit logs.
          </p>
        </div>
      </div>

      <h5 className="mb-3">Administration</h5>
      <div className="row g-3 mb-4">
        {adminTiles.map((tile) => (
          <div key={tile.title} className="col-12 col-md-4">
            <Link to={tile.to} className="text-decoration-none text-dark">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title mb-2">{tile.title}</h6>
                  <p className="text-muted small mb-0">{tile.description}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <h5 className="mb-3">Modules</h5>
      <div className="row g-3">
        {moduleTiles.map((tile) => (
          <div key={tile.title} className="col-12 col-md-3">
            <Link to={tile.to} className="text-decoration-none text-dark">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h6 className="card-title mb-2">{tile.title}</h6>
                  <p className="text-muted small mb-0">{tile.description}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
