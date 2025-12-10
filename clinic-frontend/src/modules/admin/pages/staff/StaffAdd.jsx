// src/modules/admin/pages/staff/StaffAdd.jsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";
import validation from "../../../../utils/validation.js";
import { getQualificationOptions } from "../../../../constants/qualifications.js";

const StaffAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  
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
    Role: "Doctor",
    Qualification: "", // Primary qualification (backward compatibility)
    Specialization: "",
    Experience: "",
    License_Number: "",
    Consultation_fees: "",
    Department: "",
    
    // Employment Details
    Joining_Date: new Date().toISOString().split('T')[0],
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
  
  const rolesWithAccounts = [
    { value: "Doctor", label: "Doctor", canHaveAccount: true },
    { value: "Admin", label: "Admin", canHaveAccount: true },
    { value: "Receptionist", label: "Receptionist", canHaveAccount: true },
    { value: "Lab Technician", label: "Lab Technician", canHaveAccount: true },
    { value: "Pharmacist", label: "Pharmacist", canHaveAccount: true },
  ];
  
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

  useEffect(() => {
    fetchDepartments();
  }, []);

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

  // Calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return null;
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

  // Handle field validation on change
  const validateField = (name, value) => {
    let validationResult = { valid: true, message: '' };

    switch (name) {
      case 'Name':
        validationResult = validation.validateName(value);
        break;
      case 'Email':
        validationResult = validation.validateEmail(value);
        break;
      case 'Phone_Number':
      case 'Alternate_Phone':
      case 'Emergency_Contact':
        if (value) validationResult = validation.validatePhone(value);
        break;
      case 'Date_of_Birth':
        validationResult = validation.validateDOB(value, formData.Role);
        break;
      case 'Pincode':
        validationResult = validation.validatePincode(value);
        break;
      case 'IFSC_Code':
        validationResult = validation.validateIFSC(value);
        break;
      case 'Account_Number':
        validationResult = validation.validateAccountNumber(value);
        break;
      case 'Joining_Date':
        validationResult = validation.validateJoiningDate(value);
        break;
      case 'Experience':
        validationResult = validation.validateExperience(value, formData.Date_of_Birth, qualifications);
        break;
      case 'Consultation_fees':
        validationResult = validation.validateConsultationFees(value, formData.Role);
        break;
      case 'Salary':
        validationResult = validation.validateSalary(value);
        break;
      case 'License_Number':
        validationResult = validation.validateLicenseNumber(value, formData.Role);
        break;
      default:
        break;
    }

    return validationResult;
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
      updatedData.Age = age;
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
    
    setFormData(updatedData);
    
    // Validate field
    const validationResult = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: validationResult.valid ? null : validationResult.message
    }));
  };

  // Qualification Management Functions
  const addQualification = () => {
    setQualifications([
      ...qualifications,
      {
        id: Date.now(), // Temporary ID
        qualification_name: "",
        institution: "",
        year_completed: new Date().getFullYear(),
        specialization: "",
        registration_number: "",
        is_primary: qualifications.length === 0 // First one is primary
      }
    ]);
  };

  const updateQualification = (index, field, value) => {
    const updatedQualifications = [...qualifications];
    updatedQualifications[index] = {
      ...updatedQualifications[index],
      [field]: value
    };
    
    // If setting as primary, unset others
    if (field === 'is_primary' && value) {
      updatedQualifications.forEach((qual, i) => {
        if (i !== index) {
          updatedQualifications[i].is_primary = false;
        }
      });
    }
    
    setQualifications(updatedQualifications);
  };

  const removeQualification = (index) => {
    const updatedQualifications = qualifications.filter((_, i) => i !== index);
    // If we removed the primary, set first one as primary
    if (qualifications[index].is_primary && updatedQualifications.length > 0) {
      updatedQualifications[0].is_primary = true;
    }
    setQualifications(updatedQualifications);
  };

  const validateQualifications = () => {
    const errors = [];
    
    qualifications.forEach((qual, index) => {
      if (!qual.qualification_name || qual.qualification_name.trim() === '') {
        errors.push(`Qualification ${index + 1}: Qualification name is required`);
      }
      
      if (!qual.year_completed) {
        errors.push(`Qualification ${index + 1}: Year completed is required`);
      } else {
        const currentYear = new Date().getFullYear();
        if (qual.year_completed < 1950 || qual.year_completed > currentYear + 2) {
          errors.push(`Qualification ${index + 1}: Year must be between 1950 and ${currentYear + 2}`);
        }
      }
      
      // If doctor and has registration number, validate format
      if (formData.Role === 'Doctor' && qual.registration_number) {
        const licenseValidation = validation.validateLicenseNumber(qual.registration_number, 'Doctor');
        if (!licenseValidation.valid) {
          errors.push(`Qualification ${index + 1}: ${licenseValidation.message}`);
        }
      }
    });
    
    return errors;
  };

  const validateForm = () => {
    const errors = [];
    const newFieldErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach(field => {
      if (field !== 'Notes' && field !== 'Age') { // Skip optional fields
        const validationResult = validateField(field, formData[field]);
        if (!validationResult.valid) {
          newFieldErrors[field] = validationResult.message;
          errors.push(validationResult.message);
        }
      }
    });
    
    // Validate qualifications
    const qualificationErrors = validateQualifications();
    if (qualificationErrors.length > 0) {
      errors.push(...qualificationErrors);
    }
    
    // Role-specific validations
    if (formData.Role === 'Doctor') {
      if (!formData.Department) {
        errors.push('Doctors must be assigned to a department');
        newFieldErrors['Department'] = 'Doctors must be assigned to a department';
      }
      
      if (qualifications.length === 0 && !formData.Qualification) {
        errors.push('Doctors must have at least one qualification');
      }
    }
    
    setFieldErrors(newFieldErrors);
    
    return {
      valid: errors.length === 0,
      errors: errors,
      errorMessage: errors.join(', ')
    };
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  const validationResult = validateForm();
  if (!validationResult.valid) {
    alert(`Please fix the following errors:\n\n${validationResult.errorMessage}`);
    return;
  }

  setLoading(true);

  try {
    // Prepare data for API
    const submitData = { ...formData };
    
    // Remove Age field (backend will calculate it from DOB)
    delete submitData.Age;
    
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

    // Add qualifications data
    if (qualifications.length > 0) {
      submitData.qualifications_data = qualifications.map(q => ({
        qualification_name: q.qualification_name || '',
        institution: q.institution || null,
        year_completed: parseInt(q.year_completed) || new Date().getFullYear(),
        specialization: q.specialization || null,
        registration_number: q.registration_number || null,
        is_primary: q.is_primary
      }));
      
      // If we have qualifications_data, set the first primary qualification as the main Qualification field
      const primaryQual = qualifications.find(q => q.is_primary);
      if (primaryQual && primaryQual.qualification_name) {
        submitData.Qualification = primaryQual.qualification_name;
      } else if (qualifications[0] && qualifications[0].qualification_name) {
        submitData.Qualification = qualifications[0].qualification_name;
      }
    }
    // If no qualifications array but we have Qualification field, keep it
    else if (submitData.Qualification && submitData.Qualification.trim() !== '') {
      // Keep Qualification field as a string
      submitData.Qualification = submitData.Qualification.trim();
    }
    // If no qualifications at all and no Qualification field, at least set an empty string for doctors
    else if (submitData.Role === 'Doctor') {
      submitData.Qualification = ""; // Empty string instead of deleting
    }

    // Remove empty fields - but NOT Qualification if it's empty string for doctors
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === "" || submitData[key] === null || submitData[key] === undefined) {
        // For doctors, keep empty Qualification string
        if (key === 'Qualification' && submitData.Role === 'Doctor') {
          submitData[key] = "";
        } else {
          delete submitData[key];
        }
      }
    });

    // DEBUG: Log what we're sending
    console.log("📤 SENDING DATA:", JSON.stringify(submitData, null, 2));
    console.log("Has Qualification?", 'Qualification' in submitData);
    console.log("Qualification value:", submitData.Qualification);
    console.log("Has qualifications_data?", 'qualifications_data' in submitData);
    
    const response = await adminApi.createStaff(submitData);
    
    alert("Staff added successfully!");
    navigate("/admin/staff");
    
  } catch (err) {
    console.error("❌ ERROR DETAILS:", err);
    
    if (err.response) {
      console.error("🔴 RESPONSE DATA:", err.response.data);
      
      // Show detailed error
      let errorMessage = "Failed to add staff.\n\n";
      
      if (err.response.data) {
        if (typeof err.response.data === 'string') {
          errorMessage += err.response.data;
        } else if (typeof err.response.data === 'object') {
          Object.keys(err.response.data).forEach(key => {
            if (Array.isArray(err.response.data[key])) {
              errorMessage += `• ${key}: ${err.response.data[key].join(', ')}\n`;
            } else {
              errorMessage += `• ${key}: ${JSON.stringify(err.response.data[key])}\n`;
            }
          });
        }
      }
      
      alert(errorMessage);
    } else {
      alert(`Error: ${err.message || "Failed to add staff. Please try again."}`);
    }
  } finally {
    setLoading(false);
  }
};


  // Get qualification options for current role
  const currentQualificationOptions = getQualificationOptions(formData.Role);

  return (
    <div className="staff-add">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Add New Staff Member</h3>
          <p className="text-muted mb-0">Fill in all required details to add a new staff member</p>
        </div>
        <Link to="/admin/staff" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>Back to List
        </Link>
      </div>

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
                    <input 
                      type="text" 
                      className={`form-control ${fieldErrors.Name ? 'is-invalid' : ''}`} 
                      name="Name" 
                      value={formData.Name} 
                      onChange={handleChange} 
                    />
                    {fieldErrors.Name && (
                      <div className="invalid-feedback d-block">{fieldErrors.Name}</div>
                    )}
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
                      className={`form-control ${fieldErrors.Date_of_Birth ? 'is-invalid' : ''}`}
                      name="Date_of_Birth" 
                      value={formData.Date_of_Birth} 
                      onChange={handleChange} 
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    />
                    {fieldErrors.Date_of_Birth ? (
                      <div className="invalid-feedback d-block">{fieldErrors.Date_of_Birth}</div>
                    ) : (
                      <small className="text-muted">
                        {calculateAge(formData.Date_of_Birth) ? `Age: ${calculateAge(formData.Date_of_Birth)} years` : "Must be at least 18 years old"}
                      </small>
                    )}
                  </div>

                  <div className="col-md-4 mb-3">
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
                    <input 
                      type="email" 
                      className={`form-control ${fieldErrors.Email ? 'is-invalid' : ''}`}
                      name="Email" 
                      value={formData.Email} 
                      onChange={handleChange}
                    />
                    {fieldErrors.Email && (
                      <div className="invalid-feedback d-block">{fieldErrors.Email}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      className={`form-control ${fieldErrors.Phone_Number ? 'is-invalid' : ''}`}
                      name="Phone_Number" 
                      value={formData.Phone_Number} 
                      onChange={handleChange}
                      maxLength="10"
                      placeholder="e.g., 9876543210"
                    />
                    {fieldErrors.Phone_Number && (
                      <div className="invalid-feedback d-block">{fieldErrors.Phone_Number}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Alternate Phone</label>
                    <input 
                      type="tel" 
                      className={`form-control ${fieldErrors.Alternate_Phone ? 'is-invalid' : ''}`}
                      name="Alternate_Phone" 
                      value={formData.Alternate_Phone} 
                      onChange={handleChange}
                      maxLength="10"
                      placeholder="e.g., 9876543210"
                    />
                    {fieldErrors.Alternate_Phone && (
                      <div className="invalid-feedback d-block">{fieldErrors.Alternate_Phone}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Emergency Contact</label>
                    <input 
                      type="tel" 
                      className={`form-control ${fieldErrors.Emergency_Contact ? 'is-invalid' : ''}`}
                      name="Emergency_Contact" 
                      value={formData.Emergency_Contact} 
                      onChange={handleChange}
                      maxLength="10"
                      placeholder="e.g., 9876543210"
                    />
                    {fieldErrors.Emergency_Contact && (
                      <div className="invalid-feedback d-block">{fieldErrors.Emergency_Contact}</div>
                    )}
                  </div>

                  <div className="col-12 mb-3">
                    <label className="form-label">Address *</label>
                    <textarea 
                      className="form-control" 
                      name="Address" 
                      rows="3" 
                      value={formData.Address} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">City</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="City" 
                      value={formData.City} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">State</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="State" 
                      value={formData.State} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Pincode</label>
                    <input 
                      type="text" 
                      className={`form-control ${fieldErrors.Pincode ? 'is-invalid' : ''}`}
                      name="Pincode" 
                      value={formData.Pincode} 
                      onChange={handleChange} 
                      maxLength="6"
                      placeholder="6-digit pincode"
                    />
                    {fieldErrors.Pincode && (
                      <div className="invalid-feedback d-block">{fieldErrors.Pincode}</div>
                    )}
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
                    <select 
                      className="form-select" 
                      name="Role" 
                      value={formData.Role} 
                      onChange={handleChange}
                    >
                      <optgroup label="Roles with User Accounts">
                        {rolesWithAccounts.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
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
                          This role cannot have a user account. User account creation will be disabled.
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Specialization</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="Specialization" 
                      value={formData.Specialization} 
                      onChange={handleChange} 
                      placeholder="e.g., Cardiology, Pediatrics, Retail Pharmacy"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Experience (Years)</label>
                    <input 
                      type="number" 
                      className={`form-control ${fieldErrors.Experience ? 'is-invalid' : ''}`}
                      name="Experience" 
                      value={formData.Experience} 
                      onChange={handleChange} 
                      min="0" 
                      max="50"
                    />
                    {fieldErrors.Experience && (
                      <div className="invalid-feedback d-block">{fieldErrors.Experience}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">License Number {formData.Role === 'Doctor' && '*'}</label>
                    <input 
                      type="text" 
                      className={`form-control ${fieldErrors.License_Number ? 'is-invalid' : ''}`}
                      name="License_Number" 
                      value={formData.License_Number} 
                      onChange={handleChange} 
                      placeholder={
                        formData.Role === 'Doctor' ? 'e.g., 123456 or TN/12345/2010' :
                        formData.Role === 'Pharmacist' ? 'e.g., PCI-12345 or KA/1234/2015' :
                        formData.Role === 'Lab Technician' ? 'e.g., DMLT-1234' :
                        'License number if applicable'
                      }
                    />
                    {fieldErrors.License_Number ? (
                      <div className="invalid-feedback d-block">{fieldErrors.License_Number}</div>
                    ) : (
                      <small className="text-muted">
                        {formData.Role === 'Doctor' && 'Format: 123456 (MCI) or State/Number/Year'}
                        {formData.Role === 'Pharmacist' && 'Format: PCI-12345 or State/Number/Year'}
                        {formData.Role === 'Lab Technician' && 'Format: DMLT-1234 or State/LT/Number'}
                      </small>
                    )}
                  </div>

                  {formData.Role === "Doctor" && (
                    <>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Consultation Fees (₹) *</label>
                        <input 
                          type="number" 
                          className={`form-control ${fieldErrors.Consultation_fees ? 'is-invalid' : ''}`}
                          name="Consultation_fees" 
                          value={formData.Consultation_fees} 
                          onChange={handleChange} 
                          min="0" 
                          step="0.01"
                          placeholder="e.g., 500"
                        />
                        {fieldErrors.Consultation_fees && (
                          <div className="invalid-feedback d-block">{fieldErrors.Consultation_fees}</div>
                        )}
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Department *</label>
                        <select 
                          className={`form-control ${fieldErrors.Department ? 'is-invalid' : ''}`}
                          name="Department" 
                          value={formData.Department} 
                          onChange={handleChange}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept.DEPT_ID || dept.id} value={dept.DEPT_ID || dept.id}>
                              {dept.Department_Name || dept.name}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.Department && (
                          <div className="invalid-feedback d-block">{fieldErrors.Department}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============= QUALIFICATIONS SECTION ============= */}
          <div className="col-12">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-award me-2"></i>
                  Qualifications
                </h5>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-primary"
                  onClick={addQualification}
                >
                  <i className="bi bi-plus-lg me-1"></i>Add Qualification
                </button>
              </div>
              <div className="card-body">
                {qualifications.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-award display-4 mb-3"></i>
                    <p>No qualifications added yet. Click "Add Qualification" to add.</p>
                  </div>
                ) : (
                  qualifications.map((qual, index) => (
                    <div key={qual.id} className="qualification-card border p-3 mb-3 rounded">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">
                          Qualification #{index + 1}
                          {qual.is_primary && (
                            <span className="badge bg-primary ms-2">Primary</span>
                          )}
                        </h6>
                        <div>
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => updateQualification(index, 'is_primary', true)}
                            disabled={qual.is_primary}
                          >
                            {qual.is_primary ? 'Primary' : 'Set as Primary'}
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeQualification(index)}
                            disabled={qualifications.length === 1}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Qualification Name *</label>
                          <select 
                            className="form-select"
                            value={qual.qualification_name}
                            onChange={(e) => updateQualification(index, 'qualification_name', e.target.value)}
                          >
                            <option value="">Select Qualification</option>
                            {currentQualificationOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Institution/University</label>
                          <input 
                            type="text"
                            className="form-control"
                            value={qual.institution}
                            onChange={(e) => updateQualification(index, 'institution', e.target.value)}
                            placeholder="e.g., AIIMS Delhi, University of Mumbai"
                          />
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label">Year Completed *</label>
                          <input 
                            type="number"
                            className="form-control"
                            value={qual.year_completed}
                            onChange={(e) => updateQualification(index, 'year_completed', parseInt(e.target.value))}
                            min="1950"
                            max={new Date().getFullYear() + 2}
                          />
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label">Specialization</label>
                          <input 
                            type="text"
                            className="form-control"
                            value={qual.specialization}
                            onChange={(e) => updateQualification(index, 'specialization', e.target.value)}
                            placeholder="e.g., Cardiology, Pediatrics"
                          />
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <label className="form-label">Registration Number</label>
                          <input 
                            type="text"
                            className="form-control"
                            value={qual.registration_number}
                            onChange={(e) => updateQualification(index, 'registration_number', e.target.value)}
                            placeholder={formData.Role === 'Doctor' ? 'e.g., TN/12345/2010' : 
                                       formData.Role === 'Pharmacist' ? 'e.g., PCI-12345' : 
                                       'e.g., DMLT-1234'}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Legacy qualification field for backward compatibility */}
                {qualifications.length === 0 && (
                  <div className="mb-3">
                    <label className="form-label">Primary Qualification (Legacy Field)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="Qualification" 
                      value={formData.Qualification} 
                      onChange={handleChange} 
                      placeholder="e.g., MBBS, B.Pharm, DMLT"
                    />
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      It's recommended to use the Qualifications section above for multiple qualifications.
                    </small>
                  </div>
                )}
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
                      className={`form-control ${fieldErrors.Joining_Date ? 'is-invalid' : ''}`}
                      name="Joining_Date" 
                      value={formData.Joining_Date} 
                      onChange={handleChange} 
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {fieldErrors.Joining_Date && (
                      <div className="invalid-feedback d-block">{fieldErrors.Joining_Date}</div>
                    )}
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
                    <input 
                      type="number" 
                      className={`form-control ${fieldErrors.Salary ? 'is-invalid' : ''}`}
                      name="Salary" 
                      value={formData.Salary} 
                      onChange={handleChange} 
                      min="0" 
                      step="0.01"
                      placeholder="e.g., 50000"
                    />
                    {fieldErrors.Salary && (
                      <div className="invalid-feedback d-block">{fieldErrors.Salary}</div>
                    )}
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
                    <input 
                      type="text" 
                      className="form-control" 
                      name="Bank_Name" 
                      value={formData.Bank_Name} 
                      onChange={handleChange} 
                      placeholder="e.g., State Bank of India"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Account Number</label>
                    <input 
                      type="text" 
                      className={`form-control ${fieldErrors.Account_Number ? 'is-invalid' : ''}`}
                      name="Account_Number" 
                      value={formData.Account_Number} 
                      onChange={handleChange} 
                      placeholder="9-18 digit account number"
                    />
                    {fieldErrors.Account_Number && (
                      <div className="invalid-feedback d-block">{fieldErrors.Account_Number}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">IFSC Code</label>
                    <input 
                      type="text" 
                      className={`form-control ${fieldErrors.IFSC_Code ? 'is-invalid' : ''}`}
                      name="IFSC_Code" 
                      value={formData.IFSC_Code} 
                      onChange={handleChange} 
                      placeholder="e.g., SBIN0001234"
                    />
                    {fieldErrors.IFSC_Code && (
                      <div className="invalid-feedback d-block">{fieldErrors.IFSC_Code}</div>
                    )}
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
                    <textarea 
                      className="form-control" 
                      name="Notes" 
                      rows="4" 
                      value={formData.Notes} 
                      onChange={handleChange} 
                      placeholder="Any additional notes or remarks..."
                    />
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
          <button type="submit" className="btn btn-primary px-4" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Adding Staff...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Add Staff Member
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffAdd;