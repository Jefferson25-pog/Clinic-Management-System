// src/modules/admin/pages/staff/StaffEdit.jsx - UPDATED VERSION
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const StaffEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [staffData, setStaffData] = useState(null);
  const [formData, setFormData] = useState({
    // Personal Information
    Name: "",
    Gender: "Male",
    Date_of_Birth: "",
    Blood_Group: "A+",
    
    // Contact Information
    Address: "",
    City: "",
    State: "",
    Pincode: "",
    Phone_Number: "",
    Alternate_Phone: "",
    Emergency_Contact: "",
    Email: "",
    
    // Professional Information
    Role: "",
    Qualification: "",
    Specialization: "",
    Experience: "",
    License_Number: "",
    Consultation_fees: "",
    Department: "",
    
    // Employment Details
    Joining_Date: "",
    Shift_Timing: "09:00 AM - 05:00 PM",
    Salary: "",
    
    // Bank Details
    Bank_Name: "",
    Account_Number: "",
    IFSC_Code: "",
    
    // Additional Info
    Notes: ""
  });

  // Options for dropdowns
  const genderOptions = ["Male", "Female", "Other"];
  const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  
  // Roles WITH user accounts
  const rolesWithAccounts = [
    { value: "Doctor", label: "Doctor", canHaveAccount: true },
    { value: "Admin", label: "Admin", canHaveAccount: true },
    { value: "Receptionist", label: "Receptionist", canHaveAccount: true },
    { value: "Lab Technician", label: "Lab Technician", canHaveAccount: true },
    { value: "Pharmacist", label: "Pharmacist", canHaveAccount: true },
  ];
  
  // Roles WITHOUT user accounts
  const rolesWithoutAccounts = [
    { value: "Nurse", label: "Nurse", canHaveAccount: false },
    { value: "Physiotherapist", label: "Physiotherapist", canHaveAccount: false },
    { value: "Radiologist", label: "Radiologist", canHaveAccount: false },
    { value: "Accountant", label: "Accountant", canHaveAccount: false },
    { value: "Ward Boy", label: "Ward Boy", canHaveAccount: false },
    { value: "Cleaner", label: "Cleaner", canHaveAccount: false },
    { value: "Security Guard", label: "Security Guard", canHaveAccount: false },
  ];

  const shiftOptions = [
    "09:00 AM - 05:00 PM",
    "10:00 AM - 06:00 PM", 
    "02:00 PM - 10:00 PM",
    "Night Shift",
    "Flexible"
  ];

  // Calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Check if role can have user account
  const canHaveUserAccount = (role) => {
    const rolesWithAccountsList = ["Doctor", "Admin", "Receptionist", "Lab Technician", "Pharmacist"];
    return rolesWithAccountsList.includes(role);
  };

  useEffect(() => {
    fetchStaffData();
    fetchDepartments();
  }, [id]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStaffById(id);
      const data = response.data;
      setStaffData(data);
      
      // Format dates for input fields
      let dob = data.Date_of_Birth;
      let joiningDate = data.Joining_Date;
      
      if (dob && typeof dob === 'string' && dob.includes('T')) {
        dob = dob.split('T')[0];
      }
      
      if (joiningDate && typeof joiningDate === 'string' && joiningDate.includes('T')) {
        joiningDate = joiningDate.split('T')[0];
      }
      
      setFormData({
        // Personal Information
        Name: data.Name || "",
        Gender: data.Gender || "Male",
        Date_of_Birth: dob || "",
        Blood_Group: data.Blood_Group || "A+",
        
        // Contact Information
        Address: data.Address || "",
        City: data.City || "",
        State: data.State || "",
        Pincode: data.Pincode || "",
        Phone_Number: data.Phone_Number || "",
        Alternate_Phone: data.Alternate_Phone || "",
        Emergency_Contact: data.Emergency_Contact || "",
        Email: data.Email || "",
        
        // Professional Information
        Role: data.Role || "",
        Qualification: data.Qualification || "",
        Specialization: data.Specialization || "",
        Experience: data.Experience || "",
        License_Number: data.License_Number || "",
        Consultation_fees: data.Consultation_fees || "",
        Department: data.Department || "",
        
        // Employment Details
        Joining_Date: joiningDate || "",
        Shift_Timing: data.Shift_Timing || "09:00 AM - 05:00 PM",
        Salary: data.Salary || "",
        
        // Bank Details
        Bank_Name: data.Bank_Name || "",
        Account_Number: data.Account_Number || "",
        IFSC_Code: data.IFSC_Code || "",
        
        // Additional Info
        Notes: data.Notes || ""
      });
    } catch (err) {
      setError("Failed to load staff data");
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await adminApi.getDepartments();
      let departmentsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) departmentsData = response.data;
        else if (response.data.results) departmentsData = response.data.results;
        else if (response.data.data) departmentsData = response.data.data;
      }
      setDepartments(departmentsData);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    const updatedData = {
      ...formData,
      [name]: type === 'checkbox' ? e.target.checked : value
    };
    
    // Calculate age when DOB changes
    if (name === "Date_of_Birth") {
      const age = calculateAge(value);
      
      // Validate DOB
      if (age && age < 18) {
        setError("Staff must be at least 18 years old");
      } else if (updatedData.Role === "Doctor" && age && age < 25) {
        setError("Doctors must be at least 25 years old");
      } else {
        setError("");
      }
    }
    
    // Check if role change affects department requirement
    if (name === "Role") {
      // Clear department for non-doctors
      if (value !== "Doctor") {
        updatedData.Department = "";
        updatedData.Consultation_fees = "";
        updatedData.Specialization = "";
      }
    }
    
    // Validate Joining Date (cannot be in the past)
    if (name === "Joining_Date") {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setError("Joining date cannot be in the past. It must be today or in the future.");
      } else {
        setError("");
      }
    }
    
    setFormData(updatedData);
  };

  const validateForm = () => {
    const errors = [];

    // Required validations
    if (!formData.Name.trim()) errors.push("Name is required");
    if (!formData.Email) errors.push("Email is required");
    if (!formData.Phone_Number) errors.push("Phone Number is required");
    if (!formData.Role) errors.push("Role is required");
    if (!formData.Date_of_Birth) errors.push("Date of Birth is required");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.Email && !emailRegex.test(formData.Email)) {
      errors.push("Please enter a valid email address");
    }

    // Phone validation (10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (formData.Phone_Number && !phoneRegex.test(formData.Phone_Number)) {
      errors.push("Phone number must start with 6-9 and be exactly 10 digits");
    }

    // Date of Birth validation
    if (formData.Date_of_Birth) {
      const age = calculateAge(formData.Date_of_Birth);
      
      if (age && age < 18) {
        errors.push("Staff must be at least 18 years old");
      }
      
      if (formData.Role === "Doctor" && age && age < 25) {
        errors.push("Doctors must be at least 25 years old");
      }
      
      if (age && age > 70) {
        errors.push("Staff age cannot exceed 70 years");
      }
    }

    // Joining Date validation (cannot be in the past)
    if (formData.Joining_Date) {
      const joiningDate = new Date(formData.Joining_Date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (joiningDate < today) {
        errors.push("Joining date cannot be in the past");
      }
    }

    // Doctor-specific validations
    if (formData.Role === "Doctor") {
      if (!formData.Department) errors.push("Doctors must be assigned to a department");
      if (!formData.Qualification) errors.push("Qualification is required for doctors");
      if (!formData.License_Number) errors.push("License number is required for doctors");
      const fees = parseFloat(formData.Consultation_fees);
      if (isNaN(fees) || fees <= 0) {
        errors.push("Doctors must have consultation fees greater than 0");
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(", "));
      setSaving(false);
      return;
    }

    try {
      // Prepare data for API
      const submitData = { ...formData };
      
      // Convert numeric fields
      if (submitData.Experience) submitData.Experience = parseInt(submitData.Experience);
      if (submitData.Consultation_fees) submitData.Consultation_fees = parseFloat(submitData.Consultation_fees);
      if (submitData.Salary) submitData.Salary = parseFloat(submitData.Salary);
      
      // Clear department for non-doctors
      if (submitData.Role !== "Doctor") {
        submitData.Department = null;
        submitData.Consultation_fees = 0;
        submitData.Specialization = "";
      }

      // Remove empty fields
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === "" || submitData[key] === null || submitData[key] === undefined) {
          delete submitData[key];
        }
      });

      console.log("Updating staff with data:", submitData);
      await adminApi.updateStaff(id, submitData);
      
      alert("Staff updated successfully!");
      navigate("/admin/staff");
      
    } catch (err) {
      console.error("Error updating staff:", err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          "Failed to update staff. Please try again.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading staff data...</p>
      </div>
    );
  }

  return (
    <div className="staff-edit">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Edit Staff Member</h3>
          <p className="text-muted mb-0">
            Update details for {formData.Name} (ID: #{id})
          </p>
        </div>
        <div className="btn-group">
          <Link to="/admin/staff" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i>Back to List
          </Link>
          <Link to={`/admin/staff/view/${id}`} className="btn btn-outline-info">
            <i className="bi bi-eye me-1"></i>View
          </Link>
          <Link to={`/admin/staff/delete/${id}`} className="btn btn-outline-danger">
            <i className="bi bi-trash me-1"></i>Delete
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {staffData && (
        <form onSubmit={handleSubmit}>
          <div className="row">
            {/* ============= PERSONAL INFORMATION ============= */}
            <div className="col-12">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className="bi bi-person-badge me-2"></i>
                    Personal Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Full Name *</label>
                      <input type="text" className="form-control" name="Name" 
                        value={formData.Name} onChange={handleChange} required />
                    </div>

                    <div className="col-md-3 mb-3">
                      <label className="form-label">Gender</label>
                      <select className="form-select" name="Gender" 
                        value={formData.Gender} onChange={handleChange}>
                        {genderOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3 mb-3">
                      <label className="form-label">Date of Birth *</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        name="Date_of_Birth" 
                        value={formData.Date_of_Birth} 
                        onChange={handleChange} 
                        required 
                      />
                      <small className="text-muted">
                        Age: {calculateAge(formData.Date_of_Birth) || "N/A"} years
                      </small>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Blood Group</label>
                      <select className="form-select" name="Blood_Group" 
                        value={formData.Blood_Group} onChange={handleChange}>
                        {bloodGroupOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============= CONTACT INFORMATION ============= */}
            <div className="col-12">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className="bi bi-telephone me-2"></i>
                    Contact Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email Address *</label>
                      <input type="email" className="form-control" name="Email" 
                        value={formData.Email} onChange={handleChange} required />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" className="form-control" name="Phone_Number" 
                        value={formData.Phone_Number} onChange={handleChange} 
                        pattern="[6-9]\d{9}" maxLength="10" required 
                        title="Phone must start with 6-9 and be 10 digits" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Alternate Phone</label>
                      <input type="tel" className="form-control" name="Alternate_Phone" 
                        value={formData.Alternate_Phone} onChange={handleChange} 
                        pattern="[6-9]\d{9}" maxLength="10" 
                        title="Phone must start with 6-9 and be 10 digits" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Emergency Contact</label>
                      <input type="tel" className="form-control" name="Emergency_Contact" 
                        value={formData.Emergency_Contact} onChange={handleChange} 
                        pattern="[6-9]\d{9}" maxLength="10" 
                        title="Phone must start with 6-9 and be 10 digits" />
                    </div>

                    <div className="col-12 mb-3">
                      <label className="form-label">Address *</label>
                      <textarea className="form-control" name="Address" rows="3" 
                        value={formData.Address} onChange={handleChange} required />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">City</label>
                      <input type="text" className="form-control" name="City" 
                        value={formData.City} onChange={handleChange} />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">State</label>
                      <input type="text" className="form-control" name="State" 
                        value={formData.State} onChange={handleChange} />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Pincode</label>
                      <input type="text" className="form-control" name="Pincode" 
                        value={formData.Pincode} onChange={handleChange} pattern="\d{6}" maxLength="6" 
                        title="6-digit pincode" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============= PROFESSIONAL INFORMATION ============= */}
            <div className="col-12">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className="bi bi-briefcase me-2"></i>
                    Professional Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Role *</label>
                      <select className="form-select" name="Role" 
                        value={formData.Role} onChange={handleChange} required>
                        {/* Roles with user accounts */}
                        <optgroup label="Roles with User Accounts">
                          {rolesWithAccounts.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                        {/* Roles without user accounts */}
                        <optgroup label="Other Roles (No User Account)">
                          {rolesWithoutAccounts.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      {!canHaveUserAccount(formData.Role) && (
                        <div className="alert alert-warning mt-2 p-2">
                          <small>
                            <i className="bi bi-info-circle me-1"></i>
                            This role cannot have a user account. Existing user account will be affected.
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Qualification</label>
                      <input type="text" className="form-control" name="Qualification" 
                        value={formData.Qualification} onChange={handleChange} 
                        required={formData.Role === "Doctor"} />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Specialization</label>
                      <input type="text" className="form-control" name="Specialization" 
                        value={formData.Specialization} onChange={handleChange} />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Experience (Years)</label>
                      <input type="number" className="form-control" name="Experience" 
                        value={formData.Experience} onChange={handleChange} min="0" max="50" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">License Number</label>
                      <input type="text" className="form-control" name="License_Number" 
                        value={formData.License_Number} onChange={handleChange} 
                        required={formData.Role === "Doctor"} />
                    </div>

                    {formData.Role === "Doctor" && (
                      <>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Consultation Fees (₹) *</label>
                          <input type="number" className="form-control" name="Consultation_fees" 
                            value={formData.Consultation_fees} onChange={handleChange} 
                            min="0" step="0.01" required />
                        </div>

                        <div className="col-md-6 mb-3">
                          <label className="form-label">Department *</label>
                          <select className="form-select" name="Department" 
                            value={formData.Department} onChange={handleChange} 
                            required={formData.Role === "Doctor"}>
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept.DEPT_ID || dept.id} value={dept.DEPT_ID || dept.id}>
                                {dept.Department_Name || dept.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ============= EMPLOYMENT DETAILS ============= */}
            <div className="col-12">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className="bi bi-calendar-check me-2"></i>
                    Employment Details
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Joining Date *</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        name="Joining_Date" 
                        value={formData.Joining_Date} 
                        onChange={handleChange} 
                        min={new Date().toISOString().split('T')[0]} // Cannot select past dates
                        required 
                      />
                      <small className="text-muted">Cannot be in the past</small>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Shift Timing</label>
                      <select className="form-select" name="Shift_Timing" 
                        value={formData.Shift_Timing} onChange={handleChange}>
                        {shiftOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Salary (₹)</label>
                      <input type="number" className="form-control" name="Salary" 
                        value={formData.Salary} onChange={handleChange} min="0" step="0.01" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============= BANK DETAILS ============= */}
            <div className="col-12">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className="bi bi-bank me-2"></i>
                    Bank Details
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Bank Name</label>
                      <input type="text" className="form-control" name="Bank_Name" 
                        value={formData.Bank_Name} onChange={handleChange} />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Account Number</label>
                      <input type="text" className="form-control" name="Account_Number" 
                        value={formData.Account_Number} onChange={handleChange} 
                        pattern="\d{9,18}" title="9-18 digit account number" />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">IFSC Code</label>
                      <input type="text" className="form-control" name="IFSC_Code" 
                        value={formData.IFSC_Code} onChange={handleChange} 
                        pattern="[A-Z]{4}0[A-Z0-9]{6}" title="Format: ABCD0123456" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============= ADDITIONAL INFO ============= */}
            <div className="col-12">
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-light">
                  <h5 className="mb-0">
                    <i className="bi bi-sticky me-2"></i>
                    Additional Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-12 mb-3">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" name="Notes" rows="4" 
                        value={formData.Notes} onChange={handleChange} 
                        placeholder="Any additional notes or remarks..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============= FORM ACTIONS ============= */}
          <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
            <Link to="/admin/staff" className="btn btn-outline-secondary">
              <i className="bi bi-x-circle me-1"></i>Cancel
            </Link>
            <div className="btn-group">
              <Link to={`/admin/staff/view/${id}`} className="btn btn-outline-info">
                <i className="bi bi-eye me-1"></i>View Details
              </Link>
              <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Update Staff
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default StaffEdit;