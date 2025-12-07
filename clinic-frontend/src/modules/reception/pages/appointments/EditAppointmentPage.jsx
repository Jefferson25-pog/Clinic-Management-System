import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const EditAppointmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errors, setErrors] = useState({});
  const [appointment, setAppointment] = useState(null);
  const [doctors, setDoctors] = useState([]);
  
  const [formData, setFormData] = useState({
    DOC_ID: '',
    Date: '',
    Time: '',
    Priority: 'normal',
    Reason: '',
    Notes: ''
  });

  useEffect(() => {
    fetchAppointmentDetails();
    fetchDoctors();
  }, [id]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      const response = await receptionApi.getAppointmentById(id);
      
      if (response.data) {
        setAppointment(response.data);
        
        // Format date for input field
        const date = response.data.Date ? 
          new Date(response.data.Date).toISOString().split('T')[0] : '';
        
        // Extract doctor ID
        let doctorId = '';
        if (response.data.DOC_ID) {
          if (typeof response.data.DOC_ID === 'object') {
            doctorId = response.data.DOC_ID.STAFF_ID || response.data.DOC_ID.id;
          } else {
            doctorId = response.data.DOC_ID;
          }
        }
        
        setFormData({
          DOC_ID: doctorId,
          Date: date,
          Time: response.data.Time || '09:00',
          Priority: response.data.Priority || 'normal',
          Reason: response.data.Reason || '',
          Notes: response.data.Notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      alert('Failed to load appointment details');
      navigate('/reception/appointments/list');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await receptionApi.getDoctors();
      if (response.data) {
        const doctorsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        setDoctors(doctorsList);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
    
    if (!formData.DOC_ID) {
      newErrors.DOC_ID = 'Please select a doctor';
    }
    
    if (!formData.Date) {
      newErrors.Date = 'Appointment date is required';
    } else {
      const selectedDate = new Date(formData.Date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.Date = 'Appointment date cannot be in the past';
      }
    }
    
    if (!formData.Time) {
      newErrors.Time = 'Appointment time is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if appointment can be edited
    if (appointment?.Status !== 'Scheduled') {
      alert('Only scheduled appointments can be edited');
      return;
    }
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setUpdating(true);
    setErrors({});
    
    try {
      const updateData = {
        ...formData,
        // Ensure we're only updating allowed fields
      };
      
      await receptionApi.updateAppointment(id, updateData);
      
      alert('Appointment updated successfully!');
      navigate(`/reception/appointments/view/${id}`);
      
    } catch (error) {
      console.error('Error updating appointment:', error);
      
      if (error.response?.data) {
        const apiErrors = error.response.data;
        if (typeof apiErrors === 'object') {
          setErrors(apiErrors);
        } else {
          alert(apiErrors);
        }
      } else {
        alert('Failed to update appointment. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to discard changes?')) {
      navigate(`/reception/appointments/view/${id}`);
    }
  };

  // Time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          Appointment not found. Please check the appointment ID.
        </div>
      </div>
    );
  }

  if (appointment.Status !== 'Scheduled') {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          <h5 className="alert-heading">Cannot Edit Appointment</h5>
          <p>
            This appointment is {appointment.Status.toLowerCase()} and cannot be edited.
            Only scheduled appointments can be modified.
          </p>
          <div className="mt-3">
            <button 
              className="btn btn-outline-secondary"
              onClick={() => navigate(`/reception/appointments/view/${id}`)}
            >
              <i className="bi bi-arrow-left me-1"></i> Back to View
            </button>
          </div>
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
                  <h3 className="mb-1">Edit Appointment</h3>
                  <p className="text-muted mb-0">
                    Update details for APID-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
                  </p>
                </div>
                <div>
                  <span className="badge bg-warning">Editing Mode</span>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {/* Appointment Info Header */}
              <div className="alert alert-primary mb-4">
                <div className="row">
                  <div className="col-md-6">
                    <small className="text-muted">Appointment ID</small>
                    <div className="fw-bold">
                      APID-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">Token Number</small>
                    <div className="fw-bold">
                      TOK-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
                    </div>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Patient Info (Read-only) */}
                  <div className="col-12 mb-4">
                    <h5 className="border-bottom pb-2">
                      <i className="bi bi-person me-2"></i>
                      Patient Information (Cannot be changed)
                    </h5>
                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <strong>Patient Name:</strong> {appointment.patient_name || 'N/A'}
                          </div>
                          <div className="col-md-6">
                            <strong>Patient ID:</strong> PAT-{appointment.PAT_ID || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Editable Fields */}
                  <div className="col-md-6">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-person-badge me-2"></i>
                      Doctor Selection
                    </h5>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        Select Doctor <span className="text-danger">*</span>
                      </label>
                      <select
                        name="DOC_ID"
                        className={`form-select ${errors.DOC_ID ? 'is-invalid' : ''}`}
                        value={formData.DOC_ID}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select a doctor...</option>
                        {doctors.map(doctor => (
                          <option key={doctor.STAFF_ID || doctor.id} value={doctor.STAFF_ID || doctor.id}>
                            Dr. {doctor.Name} - {doctor.Department?.Department_Name || 'General'} 
                            ({doctor.Status || 'Available'})
                          </option>
                        ))}
                      </select>
                      {errors.DOC_ID && (
                        <div className="invalid-feedback">{errors.DOC_ID}</div>
                      )}
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Reason for Visit</label>
                      <input
                        type="text"
                        name="Reason"
                        className="form-control"
                        placeholder="Brief reason for appointment"
                        value={formData.Reason}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-clock me-2"></i>
                      Scheduling
                    </h5>
                    
                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Appointment Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          name="Date"
                          className={`form-control ${errors.Date ? 'is-invalid' : ''}`}
                          value={formData.Date}
                          onChange={handleChange}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                        {errors.Date && (
                          <div className="invalid-feedback">{errors.Date}</div>
                        )}
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">
                          Appointment Time <span className="text-danger">*</span>
                        </label>
                        <select
                          name="Time"
                          className={`form-select ${errors.Time ? 'is-invalid' : ''}`}
                          value={formData.Time}
                          onChange={handleChange}
                          required
                        >
                          {timeSlots.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        {errors.Time && (
                          <div className="invalid-feedback">{errors.Time}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Priority Level</label>
                      <div className="btn-group w-100" role="group">
                        <input
                          type="radio"
                          className="btn-check"
                          name="Priority"
                          id="priority-normal"
                          value="normal"
                          checked={formData.Priority === 'normal'}
                          onChange={handleChange}
                        />
                        <label className="btn btn-outline-secondary" htmlFor="priority-normal">
                          <i className="bi bi-circle me-1"></i> Normal
                        </label>
                        
                        <input
                          type="radio"
                          className="btn-check"
                          name="Priority"
                          id="priority-urgent"
                          value="urgent"
                          checked={formData.Priority === 'urgent'}
                          onChange={handleChange}
                        />
                        <label className="btn btn-outline-warning" htmlFor="priority-urgent">
                          <i className="bi bi-exclamation-triangle me-1"></i> Urgent
                        </label>
                        
                        <input
                          type="radio"
                          className="btn-check"
                          name="Priority"
                          id="priority-critical"
                          value="critical"
                          checked={formData.Priority === 'critical'}
                          onChange={handleChange}
                        />
                        <label className="btn btn-outline-danger" htmlFor="priority-critical">
                          <i className="bi bi-heart-pulse me-1"></i> Critical
                        </label>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Additional Notes</label>
                      <textarea
                        name="Notes"
                        className="form-control"
                        rows="3"
                        placeholder="Any special notes or requirements"
                        value={formData.Notes}
                        onChange={handleChange}
                      ></textarea>
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
                          onClick={() => navigate(`/reception/appointments/view/${id}`)}
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

export default EditAppointmentPage;