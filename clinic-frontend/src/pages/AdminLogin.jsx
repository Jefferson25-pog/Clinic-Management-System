// src/pages/AdminLogin.jsx - UPDATED VERSION
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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
      const result = await loginAdmin(username, password);
      
      if (result && result.success) {
        // Redirect to the path returned by backend
        navigate(result.redirectPath || "/admin", { replace: true });
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      // Show specific error messages
      if (err.message.includes('inactive')) {
        setError("Your account is inactive. Please contact administrator.");
      } else if (err.message.includes('Staff users')) {
        setError("Staff users must login through staff portal.");
      } else if (err.message.includes('Invalid credentials')) {
        setError("Invalid username or password.");
      } else if (err.message.includes('Not authorized')) {
        setError("You are not authorized for admin access.");
      } else {
        setError(err.message || "Login failed. Please try again.");
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
            <h4 className="card-title fw-bold mb-2">Admin Login</h4>
            <div className="alert alert-warning py-2 mb-0">
              <small className="d-block">
                <strong>Restricted Access:</strong> Super Admins and Admins only
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
                placeholder="Enter admin username"
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
                placeholder="Enter admin password"
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
                  "Login as Admin"
                )}
              </button>
              
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                ← Back to main login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;