// src/modules/admin/pages/ChangePassword.jsx - UPDATED WITH BACK BUTTON
import React, { useState } from "react";
import { authApi } from "../services/adminApi.js";
import { Link, useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (form.new_password !== form.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }
    
    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    
    setMessage(null);
    setError(null);
    setLoading(true);
    
    try {
      const res = await authApi.changePassword(form);
      if (res.data.success) {
        setMessage("Password changed successfully!");
        setForm({ old_password: "", new_password: "", confirm_password: "" });
        
        // Clear messages after 5 seconds
        setTimeout(() => {
          setMessage(null);
        }, 5000);
      } else {
        setError(res.data.message || "Failed to change password.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error changing password. Please check your old password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center mb-2">
            <button 
              onClick={() => navigate(-1)}
              className="btn btn-outline-secondary btn-sm me-2"
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <h4 className="mb-0">Change Password</h4>
          </div>
          <p className="text-muted">
            Change the password for your currently logged-in account.
          </p>
        </div>
        <Link to="/admin/credentials" className="btn btn-outline-primary">
          <i className="bi bi-people me-1"></i>
          Credentials Management
        </Link>
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="row">
        <div className="col-12 col-md-8 col-lg-6">
          <form className="card shadow-sm border-0" onSubmit={handleSubmit}>
            <div className="card-body">
              <h6 className="card-title mb-4">
                <i className="bi bi-shield-lock me-2"></i>
                Password Update Form
              </h6>
              
              <div className="mb-4">
                <label className="form-label fw-medium">Current Password *</label>
                <input
                  type="password"
                  name="old_password"
                  className="form-control"
                  value={form.old_password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your current password"
                />
                <div className="form-text">Enter the password you're currently using.</div>
              </div>
              
              <div className="mb-4">
                <label className="form-label fw-medium">New Password *</label>
                <input
                  type="password"
                  name="new_password"
                  className="form-control"
                  value={form.new_password}
                  onChange={handleChange}
                  required
                  placeholder="Enter new password"
                  minLength="8"
                />
                <div className="form-text">Must be at least 8 characters long.</div>
              </div>
              
              <div className="mb-4">
                <label className="form-label fw-medium">Confirm New Password *</label>
                <input
                  type="password"
                  name="confirm_password"
                  className="form-control"
                  value={form.confirm_password}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter new password"
                  minLength="8"
                />
                <div className="form-text">Must match the new password above.</div>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => navigate(-1)}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Back
                </button>
                <button 
                  className="btn btn-primary" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
        
        <div className="col-12 col-md-4 col-lg-6">
          <div className="card shadow-sm border-info">
            <div className="card-body">
              <h6 className="card-title text-info">
                <i className="bi bi-lightbulb me-2"></i>
                Password Guidelines
              </h6>
              <ul className="list-unstyled small">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Use at least 8 characters
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Include uppercase and lowercase letters
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Include at least one number
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Include special characters (!@#$%^&*)
                </li>
                <li className="mb-2">
                  <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                  Don't use common words or personal info
                </li>
                <li className="mb-2">
                  <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                  Don't reuse old passwords
                </li>
              </ul>
            </div>
          </div>
          
          <div className="card shadow-sm border-warning mt-3">
            <div className="card-body">
              <h6 className="card-title text-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Important Notes
              </h6>
              <div className="alert alert-warning mb-0 p-2">
                <small>
                  <i className="bi bi-info-circle me-1"></i>
                  After changing your password, you'll need to log in again on other devices.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;