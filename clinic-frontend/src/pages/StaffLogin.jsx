// src/pages/StaffLogin.jsx - UPDATED VERSION
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_MAP = {
  doctor: "Doctor",
  reception: "Receptionist",
  pharmacy: "Pharmacist",
  lab: "Lab Technician",
};

const StaffLogin = () => {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const { loginStaff } = useAuth();

  const selectedRole = ROLE_MAP[roleSlug];
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
    
    const username = form.username.trim();
    const password = form.password.trim();
    
    if (!username || !password) {
      setError("Please enter both username and password");
      setLoading(false);
      return;
    }
    
    try {
      const result = await loginStaff(roleSlug, username, password);
      
      if (result && result.success) {
        // Redirect to the path returned by backend
        navigate(result.redirectPath, { replace: true });
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      // Display specific error messages
      if (err.message.includes('registered as')) {
        setError(err.message);
      } else if (err.message.includes('inactive')) {
        setError("Your account is inactive. Please contact administrator.");
      } else if (err.message.includes('No staff profile')) {
        setError("No staff profile found. Please contact administrator.");
      } else if (err.message.includes('Invalid credentials')) {
        setError("Invalid username or password.");
      } else {
        setError(err.message || `Login failed for ${selectedRole}. Please check credentials.`);
      }
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
                <strong>Note:</strong> Only <strong>{selectedRole}</strong> can login here
              </small>
            </div>
          </div>
          
          {error && (
            <div className="alert alert-danger py-2 mb-3">
              <small className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </small>
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
                autoFocus
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