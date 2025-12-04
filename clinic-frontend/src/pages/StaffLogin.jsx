// src/pages/StaffLogin.jsx - COMPLETE FIXED VERSION
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_MAP = {
  doctor: "Doctor",
  reception: "Receptionist",
  pharmacy: "Pharmacist",
  lab: "Lab Technician",
};

const MODULE_REDIRECT = {
  doctor: "/doctor",
  reception: "/reception",
  pharmacy: "/pharmacy",
  lab: "/labtechnician", // Fixed: was "/lab"
};

const StaffLogin = () => {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const { loginStaff } = useAuth();

  const selectedRole = ROLE_MAP[roleSlug];
  const modulePath = MODULE_REDIRECT[roleSlug];

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!selectedRole) {
    return (
      <div className="vh-100 d-flex align-items-center justify-content-center">
        <div className="alert alert-danger" style={{ maxWidth: 400 }}>
          <h6>Invalid Staff Role</h6>
          <p className="mb-2">The selected staff role is not recognized.</p>
          <button 
            className="btn btn-sm btn-danger" 
            onClick={() => navigate("/login/staff")}
          >
            ← Back to role selection
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    if (!form.username.trim() || !form.password.trim()) {
      setError("Please enter both username and password");
      setLoading(false);
      return;
    }
    
    try {
      await loginStaff(selectedRole, form.username, form.password);
      navigate(modulePath, { replace: true });
    } catch (err) {
      setError(
        err.message || 
        `Invalid credentials for ${selectedRole}. Please check username/password.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-sm p-4" style={{ width: "100%", maxWidth: 400 }}>
        <div className="card-body">
          <div className="text-center mb-4">
            <h4 className="card-title fw-bold mb-2">{selectedRole} Login</h4>
            <div className="alert alert-info py-2 mb-0">
              <small className="d-block">
                <strong>Note:</strong> You must be registered as <strong>{selectedRole}</strong>
              </small>
              <small>
                Logging in with a different role will be rejected.
              </small>
            </div>
          </div>
          
          {error && (
            <div className="alert alert-danger py-2 mb-3">
              <small>{error}</small>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-medium">Username</label>
              <input
                name="username"
                className="form-control"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                placeholder="Enter your username"
                disabled={loading}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label fw-medium">Password</label>
              <input
                name="password"
                type="password"
                className="form-control"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={loading}
                required
              />
            </div>
            
            <div className="d-grid gap-2">
              <button 
                className="btn btn-primary btn-lg fw-medium" 
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Logging in...
                  </>
                ) : (
                  `Login as ${selectedRole}`
                )}
              </button>
              
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2"
                onClick={() => navigate("/login/staff")}
                disabled={loading}
              >
                ← Back to role selection
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;