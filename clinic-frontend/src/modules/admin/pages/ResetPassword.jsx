// src/modules/admin/pages/ResetPassword.jsx - UPDATED FIXED VERSION
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { adminApi } from "../services/adminApi.js";

// Success Modal Component
const SuccessModal = ({ show, newPassword, targetName, onClose }) => {
  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-success">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">
              <i className="bi bi-check-circle me-2"></i>
              Password Reset Successful!
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="text-center mb-4">
              <i className="bi bi-shield-check text-success display-1"></i>
              <h4 className="mt-3">Password has been reset for:</h4>
              <p className="lead">{targetName}</p>
            </div>
            
            <div className="alert alert-warning">
              <h6 className="alert-heading">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Important Security Information
              </h6>
              <p className="mb-2">
                Please provide this new password to the user immediately. 
                It will only be shown this one time.
              </p>
              <small className="text-muted">
                The password is securely stored and cannot be retrieved later.
              </small>
            </div>
            
            <div className="card border-info">
              <div className="card-header bg-info text-white">
                <i className="bi bi-key me-2"></i>
                New Password
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control text-center fw-bold fs-5"
                    value={newPassword}
                    readOnly
                    id="newPasswordField"
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("newPasswordField");
                      input.select();
                      navigator.clipboard.writeText(newPassword);
                      
                      // Show copied message
                      const copyBtn = document.querySelector(".copy-btn");
                      if (copyBtn) {
                        const originalHtml = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="bi bi-check2 me-1"></i>Copied!';
                        setTimeout(() => {
                          copyBtn.innerHTML = originalHtml;
                        }, 2000);
                      }
                    }}
                  >
                    <i className="bi bi-clipboard me-1"></i>
                    <span className="copy-btn">Copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                onClose();
                window.location.href = "/admin/credentials";
              }}
            >
              <i className="bi bi-arrow-left me-1"></i>
              Back to Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState("");
  const [successModal, setSuccessModal] = useState({
    show: false,
    newPassword: "",
    targetName: ""
  });
  
  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: "",
  });

  // Check if we came from CredentialsManagement with user data
  useEffect(() => {
    const fetchTargetData = async () => {
      if (!id) {
        setError("No ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        
        // Check if we have state passed from navigation (from CredentialsManagement)
        if (location.state && location.state.user) {
          console.log("Using user data from navigation state:", location.state.user);
          const userData = location.state.user;
          
          // Determine target type and extract info
          let targetData = {
            id: id,
            type: 'user',
            name: userData.username,
            email: userData.email,
            role: userData.role,
            is_staff: userData.profile?.staff_detail ? true : false,
            staff_detail: userData.profile?.staff_detail || userData.staff_detail
          };
          
          setTarget(targetData);
          setLoading(false);
          return;
        }
        
        // If no state, try to fetch as staff
        console.log("No navigation state, trying to fetch as staff...");
        try {
          const response = await adminApi.getStaffById(id);
          if (response.data) {
            const staffData = response.data;
            setTarget({
              id: id,
              type: 'staff',
              name: staffData.Name || staffData.name,
              email: staffData.Email || staffData.email,
              role: staffData.Role || staffData.role,
              is_staff: true,
              staff_detail: staffData
            });
            setLoading(false);
            return;
          }
        } catch (staffErr) {
          console.log("Not a staff ID, trying user API...");
        }
        
        // Try as user
        try {
          const userResponse = await adminApi.getUsers({ id: id });
          let userData = null;
          
          if (userResponse.data && Array.isArray(userResponse.data) && userResponse.data.length > 0) {
            userData = userResponse.data[0];
          } else if (userResponse.data && userResponse.data.results && userResponse.data.results.length > 0) {
            userData = userResponse.data.results[0];
          }
          
          if (userData) {
            setTarget({
              id: id,
              type: 'user',
              name: userData.username,
              email: userData.email,
              role: userData.role,
              is_staff: userData.profile?.staff_detail ? true : false,
              staff_detail: userData.profile?.staff_detail || userData.staff_detail
            });
          } else {
            throw new Error("Target not found");
          }
        } catch (userErr) {
          console.error("Error fetching user:", userErr);
          throw new Error(`Target with ID ${id} not found`);
        }
        
      } catch (err) {
        console.error("Error fetching target:", err);
        setError(`Failed to load target details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTargetData();
  }, [id, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!formData.new_password) {
      setError("New password is required");
      return false;
    }

    if (formData.new_password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!target) {
      setError("Target information not loaded");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      console.log("Resetting password for:", target);
      
      // Store the password before resetting
      const passwordToShow = formData.new_password;
      
      let response;
      
      // Determine which API to use based on target type
      if (target.is_staff && target.staff_detail) {
        // Use staff reset endpoint
        const staffId = target.staff_detail.STAFF_ID || target.staff_detail.id || target.staff_detail.staff_id || target.id;
        console.log("Using staff reset with ID:", staffId);
        response = await adminApi.resetUserPassword(staffId, formData.new_password);
      } else {
        // Use user reset endpoint
        console.log("Using user reset with ID:", target.id);
        response = await adminApi.resetUserPasswordById(target.id, { new_password: formData.new_password });
      }
      
      if (response.data && response.data.success) {
        // Show success modal
        setSuccessModal({
          show: true,
          newPassword: passwordToShow,
          targetName: target.name
        });
        
        // Clear form
        setFormData({
          new_password: "",
          confirm_password: "",
        });
      } else {
        setError(response.data?.error || "Failed to reset password");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      
      if (err.response) {
        if (err.response.status === 404) {
          setError("Target not found or does not have a user account");
        } else if (err.response.status === 400) {
          setError(err.response.data?.error || "Invalid password or data");
        } else if (err.response.data?.detail) {
          setError(err.response.data.detail);
        } else if (err.response.data?.error) {
          setError(err.response.data.error);
        } else {
          setError(`Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/credentials");
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    setFormData({
      new_password: password,
      confirm_password: password,
    });
  };

  const closeSuccessModal = () => {
    setSuccessModal({
      show: false,
      newPassword: "",
      targetName: ""
    });
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading information...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Success Modal */}
      <SuccessModal
        show={successModal.show}
        newPassword={successModal.newPassword}
        targetName={successModal.targetName}
        onClose={closeSuccessModal}
      />
      
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="breadcrumb" className="mb-4">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/admin">Admin</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/credentials">Credentials Management</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Reset Password
              </li>
            </ol>
          </nav>

          {/* Main Card */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">
                    <i className="bi bi-key me-2"></i>
                    Reset Password
                  </h4>
                  {target && (
                    <small className="opacity-75">
                      For: {target.name} 
                      {target.role && ` (${target.role})`}
                      {target.is_staff && " - Staff Account"}
                    </small>
                  )}
                </div>
                <button 
                  type="button" 
                  className="btn btn-light btn-sm"
                  onClick={handleCancel}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>{error}</div>
                </div>
              )}

              {/* Target Info Card */}
              {target && (
                <div className="card mb-4 border-info">
                  <div className="card-body">
                    <h5 className="card-title text-info">
                      <i className="bi bi-person-badge me-2"></i>
                      {target.is_staff ? "Staff Information" : "User Information"}
                    </h5>
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-1">
                          <strong>Name:</strong> {target.name}
                        </p>
                        <p className="mb-1">
                          <strong>Type:</strong> 
                          <span className={`badge ms-2 ${target.is_staff ? 'bg-info' : 'bg-secondary'}`}>
                            {target.is_staff ? "Staff" : "User"}
                          </span>
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-1">
                          <strong>Email:</strong> {target.email || 'N/A'}
                        </p>
                        <p className="mb-1">
                          <strong>ID:</strong> #{target.id}
                        </p>
                      </div>
                    </div>
                    {target.staff_detail && (
                      <div className="alert alert-info mt-3 mb-0">
                        <i className="bi bi-person-check me-2"></i>
                        Linked to staff: <strong>{target.staff_detail.Name || target.staff_detail.name}</strong>
                        {target.staff_detail.STAFF_ID && ` (Staff ID: ${target.staff_detail.STAFF_ID})`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Password Reset Form */}
              {!successModal.show && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <h5 className="mb-3">
                      <i className="bi bi-shield-lock me-2"></i>
                      Set New Password
                    </h5>
                    
                    {/* Password Generator */}
                    <div className="alert alert-warning mb-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <i className="bi bi-lightbulb me-2"></i>
                          <strong>Tip:</strong> Use a strong password with at least 8 characters
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-outline-primary btn-sm"
                          onClick={generateRandomPassword}
                        >
                          <i className="bi bi-dice-5 me-1"></i>
                          Generate Secure Password
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="mb-3">
                      <label htmlFor="new_password" className="form-label">
                        <i className="bi bi-key me-1"></i>
                        New Password
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        id="new_password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        placeholder="Enter new password"
                        required
                        disabled={submitting}
                      />
                      <div className="form-text">
                        Must be at least 8 characters long
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-4">
                      <label htmlFor="confirm_password" className="form-label">
                        <i className="bi bi-key-fill me-1"></i>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        id="confirm_password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        placeholder="Confirm new password"
                        required
                        disabled={submitting}
                      />
                      <div className="form-text">
                        Must match the new password above
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleCancel}
                        disabled={submitting}
                      >
                        <i className="bi bi-arrow-left me-1"></i>
                        Cancel
                      </button>
                      
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting || !formData.new_password || !formData.confirm_password}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Resetting Password...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-1"></i>
                            Reset Password
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;