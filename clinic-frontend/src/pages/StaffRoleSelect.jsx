// src/pages/StaffRoleSelect.jsx - COMPLETE FIXED VERSION
import React from "react";
import { useNavigate } from "react-router-dom";

const roles = [
  { 
    key: "Doctor", 
    path: "doctor", 
    label: "Doctor",
    description: "Medical consultation and patient management",
    icon: "👨‍⚕️"
  },
  { 
    key: "Receptionist", 
    path: "reception", 
    label: "Reception",
    description: "Patient registration and appointment scheduling",
    icon: "💼"
  },
  { 
    key: "Pharmacist", 
    path: "pharmacy", 
    label: "Pharmacist",
    description: "Medication dispensing and inventory",
    icon: "💊"
  },
  { 
    key: "Lab Technician", 
    path: "lab", 
    label: "Lab Technician",
    description: "Laboratory tests and sample analysis",
    icon: "🔬"
  },
];

const StaffRoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="text-center mb-5">
          <h3 className="fw-bold mb-2">Staff Login Portal</h3>
          <p className="text-muted mb-0">
            Select your role to continue. Your credentials will be validated against this role.
          </p>
        </div>
        
        <div className="row g-4">
          {roles.map((role) => (
            <div key={role.key} className="col-12 col-md-6 col-lg-3">
              <div
                className="card shadow-sm border-0 h-100 role-card"
                style={{ 
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onClick={() => navigate(`/login/staff/${role.path}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                }}
              >
                <div className="card-body d-flex flex-column justify-content-center text-center p-4">
                  <div className="display-4 mb-3">{role.icon}</div>
                  <h5 className="card-title fw-bold mb-2">{role.label}</h5>
                  <p className="text-muted small mb-0">{role.description}</p>
                </div>
                <div className="card-footer bg-transparent border-0 text-center py-3">
                  <small className="text-primary fw-medium">Click to login →</small>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <button 
            className="btn btn-outline-secondary" 
            onClick={() => navigate("/")}
          >
            ← Back to main login
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffRoleSelect;