// src/pages/AdminLogin.jsx - COMPLETE FIXED VERSION
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
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Basic validation
    if (!form.username.trim() || !form.password.trim()) {
      setError("Please enter both username and password");
      setLoading(false);
      return;
    }
    
    try {
      await loginAdmin(form.username, form.password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid admin credentials or not authorized.");
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
            <p className="text-muted small">
              Access the admin dashboard with your credentials
            </p>
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