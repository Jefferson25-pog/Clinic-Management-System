import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const EditPatientPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState({});
  const [patient, setPatient] = useState(null);
  
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

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const response = await receptionApi.getPatientById(id);
      
      if (response.data) {
        setPatient(response.data);
        
        // Format date for input field
        const dob = response.data.DOB ? 
          new Date(response.data.DOB).toISOString().split('T')[0] : '';
        
        setFormData({
          Patient_Name: response.data.Patient_Name || '',
          DOB: dob,
          Address: response.data.Address || '',
          Phone_Number: response.data.Phone_Number || '',
          Email: response.data.Email || '',
          Emergency_Contact: response.data.Emergency_Contact || '',
          Blood_Group: response.data.Blood_Group || '',
          Gender: response.data.Gender || '',
          Occupation: response.data.Occupation || ''
        });
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      alert('Failed to load patient details');
      navigate('/reception/patients/list');
    } finally {
      setLoading(false);
    }
  };

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
    }
    
    if (!formData.DOB) {
      newErrors.DOB = 'Date of birth is required';
    } else {
      const dob = new Date(formData.DOB);
      const today = new Date();
      if (dob > today) {
        newErrors.DOB = 'Date of birth cannot be in the future';
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
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setUpdating(true);
    setErrors({});
    
    try {
      const submitData = {
        ...formData,
        Patient_Name: formData.Patient_Name.trim(),
        Address: formData.Address.trim(),
        Email: formData.Email.trim() || null,
        Emergency_Contact: formData.Emergency_Contact.trim() || null,
        Occupation: formData.Occupation.trim() || null
      };
      
      await receptionApi.updatePatient(id, submitData);
      
      alert('Patient updated successfully!');
      navigate(`/reception/patients/view/${id}`);
      
    } catch (error) {
      console.error('Error updating patient:', error);
      
      if (error.response?.data) {
        const apiErrors = error.response.data;
        if (typeof apiErrors === 'object') {
          setErrors(apiErrors);
        } else {
          alert(apiErrors);
        }
      } else {
        alert('Failed to update patient. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to discard changes?')) {
      navigate(`/reception/patients/view/${id}`);
    }
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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          Patient not found. Please check the patient ID.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      
      <div className="row">
        <div className="col-lg-8 mx-auto">
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-1">Edit Patient Details</h3>
                  <p className="text-muted mb-0">
                    Update information for PAT-{id.toString().padStart(6, '0')}
                  </p>
                </div>
                <div>
                  <span className="badge bg-warning">Editing Mode</span>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Patient Info Header */}
                  <div className="col-12 mb-4">
                    <div className="alert alert-primary">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="mb-0">{patient.Patient_Name}</h5>
                          <small className="text-muted">
                            Patient ID: PAT-{patient.PAT_ID.toString().padStart(6, '0')}
                          </small>
                        </div>
                        <div className="text-end">
                          <small className="text-muted">Last Updated:</small><br/>
                          <small>{new Date().toLocaleDateString()}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
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
                        value={formData.Patient_Name}
                        onChange={handleChange}
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
                        value={formData.Emergency_Contact}
                        onChange={handleChange}
                        pattern="[0-9]{10}"
                      />
                      {errors.Emergency_Contact && (
                        <div className="invalid-feedback">{errors.Emergency_Contact}</div>
                      )}
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
                        onClick={handleCancel}
                        disabled={updating}
                      >
                        <i className="bi bi-x-circle me-1"></i> Cancel
                      </button>
                      
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => navigate(`/reception/patients/view/${id}`)}
                          disabled={updating}
                        >
                          <i className="bi bi-eye me-1"></i> View Mode
                        </button>
                        
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={updating}
                        >
                          {updating ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Updating...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-1"></i> Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPatientPage;