// src/modules/reception/components/AppointmentForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { receptionApi } from "../services/receptionApi";

const AppointmentForm = ({ patientId, onSuccess }) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    PAT_ID: patientId || "",
    DOC_ID: "",
    Date: new Date().toISOString().split('T')[0],
    Priority: "normal",
    Notes: ""
  });
  
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState({
    patients: false,
    doctors: false,
    submitting: false
  });
  const [errors, setErrors] = useState({});

  // Fetch available patients
  const fetchPatients = async () => {
    try {
      setLoading(prev => ({ ...prev, patients: true }));
      const response = await receptionApi.getPatients({ page_size: 50 });
      const patientsData = response.data?.results || response.data || [];
      setPatients(patientsData);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(prev => ({ ...prev, patients: false }));
    }
  };

  // Fetch available doctors
  const fetchDoctors = async () => {
    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      const response = await receptionApi.getAvailableDoctors();
      const doctorsData = response.data?.doctors || response.data || [];
      setDoctors(Array.isArray(doctorsData) ? doctorsData : [doctorsData]);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.PAT_ID) newErrors.PAT_ID = "Patient is required";
    if (!formData.DOC_ID) newErrors.DOC_ID = "Doctor is required";
    if (!formData.Date) newErrors.Date = "Date is required";
    
    const selectedDate = new Date(formData.Date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.Date = "Appointment date cannot be in the past";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submitting: true }));
      
      // Format data for API
      const appointmentData = {
        PAT_ID: formData.PAT_ID,
        DOC_ID: formData.DOC_ID,
        Date: formData.Date,
        Priority: formData.Priority,
        Notes: formData.Notes || undefined
      };
      
      const response = await receptionApi.createAppointment(appointmentData);
      
      if (response.data) {
        alert(`Appointment scheduled successfully! Token No: ${response.data.TOKEN_NO}`);
        
        if (onSuccess) {
          onSuccess(response.data);
        } else {
          navigate(`/reception/appointments/${response.data.TOKEN_NO}`);
        }
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      
      // Show backend validation errors
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors) {
          setErrors(errorData.errors);
        } else if (errorData.non_field_errors) {
          alert(errorData.non_field_errors.join(', '));
        } else {
          alert(errorData.error || errorData.detail || "Failed to create appointment");
        }
      } else {
        alert("Failed to create appointment. Please try again.");
      }
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  // Get selected patient details
  const selectedPatient = patients.find(p => p.PAT_ID === formData.PAT_ID);

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        {/* Patient Selection */}
        <div className="col-md-6">
          <label className="form-label">Select Patient *</label>
          <div className="input-group">
            <select
              name="PAT_ID"
              className={`form-select ${errors.PAT_ID ? 'is-invalid' : ''}`}
              value={formData.PAT_ID}
              onChange={handleChange}
              disabled={loading.patients || loading.submitting}
            >
              <option value="">Choose patient...</option>
              {patients.map(patient => (
                <option key={patient.PAT_ID} value={patient.PAT_ID}>
                  PAT-{patient.PAT_ID}: {patient.Patient_Name} ({patient.Phone_Number})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => navigate('/reception/patients/new')}
              disabled={loading.submitting}
            >
              <i className="bi bi-person-plus"></i>
            </button>
          </div>
          {errors.PAT_ID && (
            <div className="invalid-feedback d-block">{errors.PAT_ID}</div>
          )}
          {loading.patients && (
            <small className="text-muted">
              <span className="spinner-border spinner-border-sm me-1"></span>
              Loading patients...
            </small>
          )}
        </div>

        {/* Doctor Selection */}
        <div className="col-md-6">
          <label className="form-label">Select Doctor *</label>
          <select
            name="DOC_ID"
            className={`form-select ${errors.DOC_ID ? 'is-invalid' : ''}`}
            value={formData.DOC_ID}
            onChange={handleChange}
            disabled={loading.doctors || loading.submitting}
          >
            <option value="">Choose doctor...</option>
            {doctors.map(doctor => (
              <option key={doctor.STAFF_ID} value={doctor.STAFF_ID}>
                Dr. {doctor.Name} - {doctor.Department?.Department_Name || "No Dept"} 
                (₹{doctor.Consultation_fees || 0})
              </option>
            ))}
          </select>
          {errors.DOC_ID && (
            <div className="invalid-feedback d-block">{errors.DOC_ID}</div>
          )}
          {loading.doctors && (
            <small className="text-muted">
              <span className="spinner-border spinner-border-sm me-1"></span>
              Loading doctors...
            </small>
          )}
        </div>

        {/* Date and Priority */}
        <div className="col-md-4">
          <label className="form-label">Appointment Date *</label>
          <input
            type="date"
            name="Date"
            className={`form-control ${errors.Date ? 'is-invalid' : ''}`}
            value={formData.Date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            disabled={loading.submitting}
          />
          {errors.Date && (
            <div className="invalid-feedback d-block">{errors.Date}</div>
          )}
        </div>

        <div className="col-md-4">
          <label className="form-label">Priority</label>
          <select
            name="Priority"
            className="form-select"
            value={formData.Priority}
            onChange={handleChange}
            disabled={loading.submitting}
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label">Estimated Time</label>
          <div className="form-control text-muted">
            <i className="bi bi-clock me-1"></i>
            Based on priority
          </div>
        </div>

        {/* Patient Details (if selected) */}
        {selectedPatient && (
          <div className="col-12">
            <div className="card border-info">
              <div className="card-header bg-info bg-opacity-10 py-2">
                <h6 className="mb-0">
                  <i className="bi bi-person-badge me-2"></i>
                  Selected Patient Details
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <small className="text-muted d-block">Patient ID</small>
                    <strong>PAT-{selectedPatient.PAT_ID}</strong>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">Age</small>
                    <strong>
                      {(() => {
                        if (!selectedPatient.DOB) return "N/A";
                        const birthDate = new Date(selectedPatient.DOB);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        return `${age} years`;
                      })()}
                    </strong>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">Phone</small>
                    <strong>{selectedPatient.Phone_Number}</strong>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted d-block">Email</small>
                    <strong>{selectedPatient.Email || "N/A"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="col-12">
          <label className="form-label">Notes (Optional)</label>
          <textarea
            name="Notes"
            className="form-control"
            rows="3"
            placeholder="Any special instructions or notes for the appointment..."
            value={formData.Notes}
            onChange={handleChange}
            disabled={loading.submitting}
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="col-12">
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onSuccess ? onSuccess() : navigate('/reception/appointments')}
              disabled={loading.submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading.submitting}
            >
              {loading.submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  Scheduling...
                </>
              ) : (
                <>
                  <i className="bi bi-calendar-plus me-1"></i>
                  Schedule Appointment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Info */}
        <div className="col-12">
          <div className="alert alert-light border">
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Appointment will generate a unique Token No
                </small>
              </div>
              <div className="col-md-6 text-md-end">
                <small className="text-muted">
                  * Required fields
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AppointmentForm;