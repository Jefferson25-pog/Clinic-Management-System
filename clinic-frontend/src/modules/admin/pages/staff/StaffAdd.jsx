// src/modules/admin/pages/staff/StaffAdd.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const StaffAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    Name: "",
    Age: "",
    Address: "",
    Phone_Number: "",
    Email: "",
    Role: "Doctor",
    Department: "",
    Consultation_fees: "",
    Status: "Available"
  });

  const roleOptions = [
    { value: "Admin", label: "Admin" },
    { value: "Doctor", label: "Doctor" },
    { value: "Receptionist", label: "Receptionist" },
    { value: "Lab Technician", label: "Lab Technician" },
    { value: "Pharmacist", label: "Pharmacist" }
  ];

  const statusOptions = [
    { value: "Available", label: "Available" },
    { value: "Busy", label: "Busy" },
    { value: "On Leave", label: "On Leave" }
  ];

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await adminApi.getDepartments();
      setDepartments(response.data.results || response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.Name || !formData.Email || !formData.Phone_Number) {
        throw new Error("Name, Email, and Phone Number are required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.Email)) {
        throw new Error("Please enter a valid email address");
      }

      // Validate phone number (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.Phone_Number)) {
        throw new Error("Phone number must be exactly 10 digits");
      }

      // Validate age
      const age = parseInt(formData.Age);
      if (age < 18 || age > 70) {
        throw new Error("Age must be between 18 and 70");
      }

      // Doctor-specific validations
      if (formData.Role === "Doctor") {
        if (!formData.Department) {
          throw new Error("Doctors must be assigned to a department");
        }
        const fees = parseFloat(formData.Consultation_fees);
        if (isNaN(fees) || fees <= 0) {
          throw new Error("Doctors must have consultation fees greater than 0");
        }
      }

      // Prepare data for API
      const submitData = { ...formData };
      if (submitData.Age) submitData.Age = parseInt(submitData.Age);
      if (submitData.Consultation_fees) {
        submitData.Consultation_fees = parseFloat(submitData.Consultation_fees);
      }

      // Remove Department if not Doctor
      if (submitData.Role !== "Doctor") {
        submitData.Department = null;
        submitData.Consultation_fees = 0;
      }

      const response = await adminApi.createStaff(submitData);
      
      alert("Staff added successfully!");
      navigate("/admin/staff");
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to add staff");
      console.error("Error adding staff:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-add">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Add New Staff Member</h3>
          <p className="text-muted mb-0">
            Fill in the details to add a new staff member to the system
          </p>
        </div>
        <Link to="/admin/staff" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>Back to List
        </Link>
      </div>

      <div className="row">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Basic Information */}
                  <div className="col-12">
                    <h5 className="mb-3 border-bottom pb-2">
                      <i className="bi bi-person-badge me-2"></i>
                      Basic Information
                    </h5>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="Name"
                      value={formData.Name}
                      onChange={handleChange}
                      required
                      placeholder="Enter full name"
                    />
                    <div className="form-text">Letters, spaces, dots and hyphens only</div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Age *</label>
                    <input
                      type="number"
                      className="form-control"
                      name="Age"
                      value={formData.Age}
                      onChange={handleChange}
                      min="18"
                      max="70"
                      required
                    />
                    <div className="form-text">Must be between 18 and 70 years</div>
                  </div>

                  <div className="col-12 mb-3">
                    <label className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      name="Address"
                      value={formData.Address}
                      onChange={handleChange}
                      placeholder="Enter address"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="Phone_Number"
                      value={formData.Phone_Number}
                      onChange={handleChange}
                      pattern="\d{10}"
                      maxLength="10"
                      required
                      placeholder="10-digit phone number"
                    />
                    <div className="form-text">Exactly 10 digits, no spaces or symbols</div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      name="Email"
                      value={formData.Email}
                      onChange={handleChange}
                      required
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Role and Status */}
                  <div className="col-12 mt-4">
                    <h5 className="mb-3 border-bottom pb-2">
                      <i className="bi bi-briefcase me-2"></i>
                      Role & Status
                    </h5>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Role *</label>
                    <select
                      className="form-select"
                      name="Role"
                      value={formData.Role}
                      onChange={handleChange}
                      required
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Status *</label>
                    <select
                      className="form-select"
                      name="Status"
                      value={formData.Status}
                      onChange={handleChange}
                      required
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor Specific Fields */}
                  {formData.Role === "Doctor" && (
                    <>
                      <div className="col-12 mt-4">
                        <h5 className="mb-3 border-bottom pb-2">
                          <i className="bi bi-hospital me-2"></i>
                          Doctor Information
                        </h5>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Department *</label>
                        <select
                          className="form-select"
                          name="Department"
                          value={formData.Department}
                          onChange={handleChange}
                          required={formData.Role === "Doctor"}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept.DEPT_ID} value={dept.DEPT_ID}>
                              {dept.Department_Name}
                            </option>
                          ))}
                        </select>
                        <div className="form-text">Doctors must be assigned to a department</div>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Consultation Fees (₹) *</label>
                        <input
                          type="number"
                          className="form-control"
                          name="Consultation_fees"
                          value={formData.Consultation_fees}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          required={formData.Role === "Doctor"}
                          placeholder="Enter consultation fees"
                        />
                        <div className="form-text">Must be greater than 0 for doctors</div>
                      </div>
                    </>
                  )}

                  {/* Form Actions */}
                  <div className="col-12 mt-4 pt-3 border-top">
                    <div className="d-flex justify-content-end gap-2">
                      <Link to="/admin/staff" className="btn btn-outline-secondary">
                        Cancel
                      </Link>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Adding...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Add Staff Member
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

        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-info-circle me-2"></i>
                Guidelines
              </h5>
              <ul className="list-unstyled small">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  All fields marked with * are required
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Doctors require department and consultation fees
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Phone number must be exactly 10 digits
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Email must be valid and have proper domain
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Age must be between 18-70 years
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  User account can be created after staff is added
                </li>
              </ul>
            </div>
          </div>

          <div className="card shadow-sm border-0 mt-3">
            <div className="card-body">
              <h5 className="card-title">
                <i className="bi bi-lightbulb me-2"></i>
                Quick Tips
              </h5>
              <div className="alert alert-info mb-0">
                <small>
                  <i className="bi bi-exclamation-circle me-1"></i>
                  After adding a staff member, you can create their user account from the staff list.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAdd;