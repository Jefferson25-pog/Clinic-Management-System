// src/pages/Login.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-sm" style={{ minWidth: 380 }}>
        <div className="card-body">
          <h4 className="card-title text-center mb-3">Clinic Management System</h4>
          <p className="text-muted text-center mb-4">
            Please choose your login type.
          </p>
          <div className="d-grid gap-3">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate("/login/admin")}
            >
              Admin Login
            </button>
            <button
              className="btn btn-outline-primary btn-lg"
              onClick={() => navigate("/login/staff")}
            >
              Staff Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
