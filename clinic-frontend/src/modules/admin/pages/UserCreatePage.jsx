// src/modules/admin/pages/UserCreatePage.jsx - FIXED
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../services/adminApi.js";

const UserCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "Staff",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    setError("");

    if (!formData.username.trim()) {
      setError("Username is required");
      return false;
    }
    
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(formData.username)) {
      setError("Username can only contain letters, numbers, dots, hyphens and underscores");
      return false;
    }
    
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }
    
    if (formData.username.length > 30) {
      setError("Username cannot exceed 30 characters");
      return false;
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const userData = {
        username: formData.username,
        email: formData.email || "",
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: formData.role,
      };

      console.log("Sending user data:", userData);
      
      // Use createUser (both are the same, but let's use createUser)
      const response = await adminApi.createUser(userData);
      
      console.log("API Response:", response.data);
      
      if (response.data && response.data.success) {
        const customUserId = response.data.user?.custom_user_id || response.data.custom_user_id;
        setSuccess(`User created successfully! User ID: ${customUserId}`);
        
        // Reset form
        setFormData({
          username: "",
          email: "",
          password: "",
          confirm_password: "",
          role: "Staff",
        });
        
        // Auto-navigate back after 2 seconds
        setTimeout(() => {
          navigate("/admin/credentials");
        }, 2000);
      } else {
        setError(response.data?.error || "Failed to create user");
      }
      
    } catch (err) {
      console.error("Full error creating user:", err);
      console.error("Error response data:", err.response?.data);
      
      // FIXED ERROR HANDLING
      let errorMessage = "Failed to create user";
      
      if (err.response?.data) {
        // Handle object errors properly
        if (err.response.data.non_field_errors) {
          const errorObj = err.response.data.non_field_errors;
          errorMessage = Array.isArray(errorObj) ? errorObj[0] : String(errorObj);
        } else if (err.response.data.detail) {
          errorMessage = String(err.response.data.detail);
        } else if (err.response.data.error) {
          errorMessage = String(err.response.data.error);
        } else if (typeof err.response.data === 'object') {
          // Get first error message from object
          const keys = Object.keys(err.response.data);
          if (keys.length > 0) {
            const firstKey = keys[0];
            const firstError = err.response.data[firstKey];
            errorMessage = `${firstKey}: ${Array.isArray(firstError) ? firstError[0] : String(firstError)}`;
          }
        } else {
          errorMessage = String(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/credentials");
  };

  return (
    <div className="user-create-page">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="mb-0">
                      <i className="bi bi-person-plus me-2"></i>
                      Create New User Account
                    </h4>
                    <p className="text-muted mb-0">
                      Create a standalone user account that can later be linked to staff
                    </p>
                  </div>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={handleCancel}
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back
                  </button>
                </div>
              </div>
              
              <div className="card-body">
                {success && (
                  <div className="alert alert-success alert-dismissible fade show">
                    <i className="bi bi-check-circle me-2"></i>
                    {success}
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger alert-dismissible fade show">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {String(error)}  {/* FIXED: Ensure it's a string */}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Username *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Enter username"
                        required
                        disabled={loading}
                      />
                      <div className="form-text">
                        3-30 characters. Letters, numbers, dots, hyphens or underscores.
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="user@example.com"
                        disabled={loading}
                      />
                      <div className="form-text">
                        Optional. Used for password recovery.
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter password"
                        required
                        minLength="8"
                        disabled={loading}
                      />
                      <div className="form-text">Minimum 8 characters</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Confirm Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleInputChange}
                        placeholder="Confirm password"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-select"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={loading}
                      >
                        <option value="Staff">Staff</option>
                        <option value="Admin">Admin</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Receptionist">Receptionist</option>
                        <option value="Pharmacist">Pharmacist</option>
                        <option value="Lab Technician">Lab Technician</option>
                        <option value="User">User</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <div className="alert alert-info">
                        <h6 className="alert-heading">
                          <i className="bi bi-info-circle me-2"></i>
                          Important Notes
                        </h6>
                        <ul className="mb-0">
                          <li>This creates a standalone user account</li>
                          <li>You can link this account to staff members later</li>
                          <li>User ID will be auto-generated (e.g., USER-0001)</li>
                          <li>Staff members don't have passwords - only user accounts do</li>
                        </ul>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="d-flex justify-content-between">
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={handleCancel}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Creating User...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-person-plus me-2"></i>
                              Create User Account
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCreatePage;