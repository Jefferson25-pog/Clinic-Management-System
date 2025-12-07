import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const AddPatientPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    Patient_Name: '',
    DOB: '',
    Address: '',
    Phone_Number: '',
    Email: '',
    Emergency_Contact: '',
    Blood_Group: '',
    Gender: '',
    Occupation: ''
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.Patient_Name.trim()) {
      newErrors.Patient_Name = 'Patient name is required';
    } else if (formData.Patient_Name.length < 2) {
      newErrors.Patient_Name = 'Name must be at least 2 characters';
    }
    
    if (!formData.DOB) {
      newErrors.DOB = 'Date of birth is required';
    } else {
      const dob = new Date(formData.DOB);
      const today = new Date();
      if (dob > today) {
        newErrors.DOB = 'Date of birth cannot be in the future';
      }
      
      const age = today.getFullYear() - dob.getFullYear();
      if (age > 120) {
        newErrors.DOB = 'Age cannot exceed 120 years';
      }
    }
    
    if (!formData.Phone_Number) {
      newErrors.Phone_Number = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.Phone_Number)) {
      newErrors.Phone_Number = 'Phone must be exactly 10 digits';
    }
    
    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      newErrors.Email = 'Invalid email address';
    }
    
    if (!formData.Address.trim()) {
      newErrors.Address = 'Address is required';
    }
    
    if (formData.Emergency_Contact && !/^\d{10}$/.test(formData.Emergency_Contact)) {
      newErrors.Emergency_Contact = 'Emergency contact must be 10 digits';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      // Format data for API
      const submitData = {
        ...formData,
        Patient_Name: formData.Patient_Name.trim(),
        Address: formData.Address.trim(),
        Email: formData.Email.trim() || null,
        Emergency_Contact: formData.Emergency_Contact.trim() || null,
        Occupation: formData.Occupation.trim() || null
      };
      
      const response = await receptionApi.createPatient(submitData);
      
      if (response.data) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/reception/patients/list');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error adding patient:', error);
      
      if (error.response?.data) {
        // Handle API validation errors
        const apiErrors = error.response.data;
        if (typeof apiErrors === 'object') {
          setErrors(apiErrors);
        } else if (typeof apiErrors === 'string') {
          alert(apiErrors);
        }
      } else {
        alert('Failed to add patient. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      Patient_Name: '',
      DOB: '',
      Address: '',
      Phone_Number: '',
      Email: '',
      Emergency_Contact: '',
      Blood_Group: '',
      Gender: '',
      Occupation: ''
    });
    setErrors({});
    setSuccess(false);
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="container-fluid">
      
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-1">Register New Patient</h3>
                  <p className="text-muted mb-0">
                    Fill in all required patient details
                  </p>
                </div>
                <div>
                  <span className="badge bg-primary">Required Fields: *</span>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {success ? (
                <div className="text-center py-5">
                  <div className="alert alert-success">
                    <i className="bi bi-check-circle-fill fs-1"></i>
                    <h4 className="mt-3">Patient Registered Successfully!</h4>
                    <p>Redirecting to patients list...</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Personal Information */}
                    <div className="col-md-6">
                      <h5 className="mb-3 border-bottom pb-2">
                        <i className="bi bi-person me-2"></i>
                        Personal Information
                      </h5>
                      
                      <div className="mb-3">
                        <label className="form-label">
                          Full Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          name="Patient_Name"
                          className={`form-control ${errors.Patient_Name ? 'is-invalid' : ''}`}
                          placeholder="Enter patient's full name"
                          value={formData.Patient_Name}
                          onChange={handleChange}
                          maxLength="100"
                          required
                        />
                        {errors.Patient_Name && (
                          <div className="invalid-feedback">{errors.Patient_Name}</div>
                        )}
                      </div>
                      
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label">
                            Date of Birth <span className="text-danger">*</span>
                          </label>
                          <input
                            type="date"
                            name="DOB"
                            className={`form-control ${errors.DOB ? 'is-invalid' : ''}`}
                            value={formData.DOB}
                            onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                          {errors.DOB && (
                            <div className="invalid-feedback">{errors.DOB}</div>
                          )}
                          {formData.DOB && (
                            <small className="text-muted">
                              Age: {calculateAge(formData.DOB)} years
                            </small>
                          )}
                        </div>
                        
                        <div className="col-6">
                          <label className="form-label">Gender</label>
                          <select
                            name="Gender"
                            className="form-control"
                            value={formData.Gender}
                            onChange={handleChange}
                          >
                            <option value="">Select Gender</option>
                            {genders.map(gender => (
                              <option key={gender} value={gender}>{gender}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label">Blood Group</label>
                          <select
                            name="Blood_Group"
                            className="form-control"
                            value={formData.Blood_Group}
                            onChange={handleChange}
                          >
                            <option value="">Select Blood Group</option>
                            {bloodGroups.map(group => (
                              <option key={group} value={group}>{group}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="col-6">
                          <label className="form-label">Occupation</label>
                          <input
                            type="text"
                            name="Occupation"
                            className="form-control"
                            placeholder="Patient's occupation"
                            value={formData.Occupation}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Information */}
                    <div className="col-md-6">
                      <h5 className="mb-3 border-bottom pb-2">
                        <i className="bi bi-telephone me-2"></i>
                        Contact Information
                      </h5>
                      
                      <div className="mb-3">
                        <label className="form-label">
                          Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          name="Phone_Number"
                          className={`form-control ${errors.Phone_Number ? 'is-invalid' : ''}`}
                          placeholder="10-digit mobile number"
                          value={formData.Phone_Number}
                          onChange={handleChange}
                          pattern="[0-9]{10}"
                          required
                        />
                        {errors.Phone_Number && (
                          <div className="invalid-feedback">{errors.Phone_Number}</div>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                          type="email"
                          name="Email"
                          className={`form-control ${errors.Email ? 'is-invalid' : ''}`}
                          placeholder="patient@example.com"
                          value={formData.Email}
                          onChange={handleChange}
                        />
                        {errors.Email && (
                          <div className="invalid-feedback">{errors.Email}</div>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">
                          Address <span className="text-danger">*</span>
                        </label>
                        <textarea
                          name="Address"
                          className={`form-control ${errors.Address ? 'is-invalid' : ''}`}
                          placeholder="Full residential address"
                          rows="3"
                          value={formData.Address}
                          onChange={handleChange}
                          required
                        ></textarea>
                        {errors.Address && (
                          <div className="invalid-feedback">{errors.Address}</div>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Emergency Contact</label>
                        <input
                          type="tel"
                          name="Emergency_Contact"
                          className={`form-control ${errors.Emergency_Contact ? 'is-invalid' : ''}`}
                          placeholder="10-digit emergency number"
                          value={formData.Emergency_Contact}
                          onChange={handleChange}
                          pattern="[0-9]{10}"
                        />
                        {errors.Emergency_Contact && (
                          <div className="invalid-feedback">{errors.Emergency_Contact}</div>
                        )}
                        <small className="text-muted">
                          Contact person in case of emergency
                        </small>
                      </div>
                    </div>
                  </div>
                  
                  {/* Form Actions */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="d-flex justify-content-between">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => navigate('/reception/patients')}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Back to Patient Hub
                        </button>
                        
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={handleReset}
                            disabled={loading}
                          >
                            <i className="bi bi-x-circle me-1"></i> Clear Form
                          </button>
                          
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1"></span>
                                Registering...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-person-plus me-1"></i> Register Patient
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
            
            {/* Form Guidelines */}
            <div className="card-footer bg-light border-0">
              <div className="alert alert-info mb-0">
                <h6 className="alert-heading">
                  <i className="bi bi-info-circle me-2"></i>
                  Important Guidelines:
                </h6>
                <ul className="mb-0">
                  <li>All fields marked with <span className="text-danger">*</span> are required</li>
                  <li>Double-check phone numbers before submission</li>
                  <li>Patient ID will be automatically generated</li>
                  <li>Email is optional but recommended for communication</li>
                  <li>Emergency contact should be different from patient's phone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPatientPage;