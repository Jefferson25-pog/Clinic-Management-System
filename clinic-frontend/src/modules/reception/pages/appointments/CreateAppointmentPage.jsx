import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const CreateAppointmentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [todayToken, setTodayToken] = useState(1);
  
  const [formData, setFormData] = useState({
    PAT_ID: '',
    DOC_ID: '',
    Date: new Date().toISOString().split('T')[0],
    Time: '09:00',
    Priority: 'normal',
    Reason: '',
    Notes: ''
  });

  // Check URL for pre-selected patient
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patientId = params.get('patient');
    
    if (patientId) {
      setFormData(prev => ({ ...prev, PAT_ID: patientId }));
    }
    
    fetchPatients();
    fetchDoctors();
    fetchTodayToken();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await receptionApi.getPatients({ page_size: 50 });
      if (response.data) {
        const patientsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        setPatients(patientsList);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await receptionApi.getDoctors({ status: 'Available' });
      if (response.data) {
        const doctorsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        setDoctors(doctorsList);
        setFilteredDoctors(doctorsList);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchTodayToken = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await receptionApi.getAppointments({ date: today });
      if (response.data) {
        const count = Array.isArray(response.data) 
          ? response.data.length 
          : response.data.count || 0;
        setTodayToken(count + 1);
      }
    } catch (error) {
      console.error('Error fetching token:', error);
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
    
    // Filter doctors by department if patient is selected
    if (name === 'PAT_ID' && value) {
      // You could add department-based filtering here
      // For now, just use all available doctors
      setFilteredDoctors(doctors);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.PAT_ID) {
      newErrors.PAT_ID = 'Please select a patient';
    }
    
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
      
      // Optional: Restrict to next 30 days
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      if (selectedDate > maxDate) {
        newErrors.Date = 'Appointments can only be scheduled up to 30 days in advance';
      }
    }
    
    if (!formData.Time) {
      newErrors.Time = 'Appointment time is required';
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
      // Prepare appointment data - DO NOT include TOKEN_NO or APPOINTMENT_ID
      const appointmentData = {
        PAT_ID: formData.PAT_ID,
        DOC_ID: formData.DOC_ID,
        Date: formData.Date,
        Time: `${formData.Time}:00`, // Add seconds for backend
        Priority: formData.Priority,
        Reason: formData.Reason || "",
        Notes: formData.Notes || "",
        Status: "Scheduled" // Explicitly set status
      };
      
      console.log("Sending appointment data:", appointmentData); // Debug log
      
      // Use createAppointment (not scheduleAppointment)
      const response = await receptionApi.createAppointment(appointmentData);
      
      if (response.data) {
        const tokenNo = response.data.token_no || response.data.TOKEN_NO;
        const appointmentId = response.data.appointment_id || response.data.APPOINTMENT_ID;
        
        alert(`Appointment scheduled successfully!\nAppointment ID: ${appointmentId}\nToken Number: ${tokenNo}`);
        
        navigate('/reception/appointments/list?filter=today');
      }
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      console.error('Error response:', error.response?.data); // Debug
      
      if (error.response?.data) {
        // Handle API validation errors
        const apiErrors = error.response.data;
        
        if (typeof apiErrors === 'object') {
          // Convert backend field names to frontend field names if needed
          const fieldMapping = {
            'PAT_ID': 'PAT_ID',
            'DOC_ID': 'DOC_ID',
            'Date': 'Date',
            'Time': 'Time'
          };
          
          const formattedErrors = {};
          Object.keys(apiErrors).forEach(key => {
            const frontendKey = fieldMapping[key] || key;
            if (Array.isArray(apiErrors[key])) {
              formattedErrors[frontendKey] = apiErrors[key].join(', ');
            } else {
              formattedErrors[frontendKey] = apiErrors[key];
            }
          });
          
          setErrors(formattedErrors);
          
          // Show general error if no field-specific errors
          if (Object.keys(formattedErrors).length === 0 && apiErrors.error) {
            alert(apiErrors.error);
          }
        } else if (typeof apiErrors === 'string') {
          alert(apiErrors);
        }
      } else {
        alert('Failed to schedule appointment. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      PAT_ID: '',
      DOC_ID: '',
      Date: new Date().toISOString().split('T')[0],
      Time: '09:00',
      Priority: 'normal',
      Reason: '',
      Notes: ''
    });
    setErrors({});
  };

  // Get selected patient details
  const selectedPatient = patients.find(p => (p.PAT_ID || p.id) === formData.PAT_ID);

  // Time slots (9 AM to 5 PM, every 30 minutes)
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  return (
    <div className="container-fluid">
      
      <div className="row">
        <div className="col-lg-10 mx-auto">
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-1">Schedule New Appointment</h3>
                  <p className="text-muted mb-0">
                    Book appointment for patient consultation
                  </p>
                </div>
                <div className="text-end">
                  <div className="alert alert-primary mb-0 py-2">
                    <small>Today's Token:</small>
                    <h4 className="mb-0">TOK-{todayToken.toString().padStart(4, '0')}</h4>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Left Column - Patient Selection & Details */}
                  <div className="col-md-6">
                    <h5 className="mb-3 border-bottom pb-2">
                      <i className="bi bi-person me-2"></i>
                      Patient Information
                    </h5>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        Select Patient <span className="text-danger">*</span>
                      </label>
                      <select
                        name="PAT_ID"
                        className={`form-select ${errors.PAT_ID ? 'is-invalid' : ''}`}
                        value={formData.PAT_ID}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select a patient...</option>
                        {patients.map(patient => (
                          <option key={patient.PAT_ID || patient.id} value={patient.PAT_ID || patient.id}>
                            {patient.Patient_Name} (PAT-{(patient.PAT_ID || patient.id).toString().padStart(6, '0')})
                          </option>
                        ))}
                      </select>
                      {errors.PAT_ID && (
                        <div className="invalid-feedback">{errors.PAT_ID}</div>
                      )}
                      <small className="text-muted">
                        Can't find patient? <Link to="/reception/patients/add">Register new patient</Link>
                      </small>
                    </div>
                    
                    {/* Patient Details Card (if patient selected) */}
                    {selectedPatient && (
                      <div className="card bg-light mb-3">
                        <div className="card-body">
                          <h6 className="card-title">Selected Patient Details</h6>
                          <div className="row small">
                            <div className="col-6">
                              <strong>Name:</strong><br/>
                              {selectedPatient.Patient_Name}
                            </div>
                            <div className="col-6">
                              <strong>Phone:</strong><br/>
                              {selectedPatient.Phone_Number}
                            </div>
                            <div className="col-6 mt-2">
                              <strong>Age:</strong><br/>
                              {(() => {
                                if (!selectedPatient.DOB) return 'N/A';
                                const dob = new Date(selectedPatient.DOB);
                                const today = new Date();
                                return today.getFullYear() - dob.getFullYear();
                              })()} years
                            </div>
                            <div className="col-6 mt-2">
                              <strong>Gender:</strong><br/>
                              {selectedPatient.Gender || 'Not specified'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* <div className="mb-3">
                      <label className="form-label">Reason for Visit</label>
                      <input
                        type="text"
                        name="Reason"
                        className="form-control"
                        placeholder="Brief reason for appointment"
                        value={formData.Reason}
                        onChange={handleChange}
                      />
                    </div> */}
                    
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
                  
                  {/* Right Column - Doctor & Scheduling */}
                  <div className="col-md-6">
                    <h5 className="mb-3 border-bottom pb-2">
                      <i className="bi bi-person-badge me-2"></i>
                      Doctor & Scheduling
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
                        {filteredDoctors.map(doctor => (
                          <option key={doctor.STAFF_ID || doctor.id} value={doctor.STAFF_ID || doctor.id}>
                            Dr. {doctor.Name} - {doctor.Department?.Department_Name || 'General'} 
                            (₹{doctor.Consultation_fees || 'N/A'})
                          </option>
                        ))}
                      </select>
                      {errors.DOC_ID && (
                        <div className="invalid-feedback">{errors.DOC_ID}</div>
                      )}
                      <small className="text-muted">
                        Only available doctors are shown
                      </small>
                    </div>
                    
                    {/* Selected Doctor Details */}
                    {formData.DOC_ID && (
                      <div className="card bg-info bg-opacity-10 mb-3">
                        <div className="card-body py-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <small className="text-muted">Selected Doctor</small>
                              <div className="fw-medium">
                                {doctors.find(d => (d.STAFF_ID || d.id) === formData.DOC_ID)?.Name}
                              </div>
                            </div>
                            <div className="text-end">
                              <small className="text-muted">Consultation Fee</small>
                              <div className="fw-bold text-success">
                                ₹{doctors.find(d => (d.STAFF_ID || d.id) === formData.DOC_ID)?.Consultation_fees || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                          max={new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}
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
                    
                    {/* Appointment Summary */}
                    <div className="card bg-primary bg-opacity-10 mb-3">
                      <div className="card-body">
                        <h6 className="card-title">
                          <i className="bi bi-clipboard-check me-2"></i>
                          Appointment Summary
                        </h6>
                        <div className="row small">
                          <div className="col-6">
                            <strong>Token:</strong><br/>
                            TOK-{todayToken.toString().padStart(4, '0')}
                          </div>
                          <div className="col-6">
                            <strong>Date:</strong><br/>
                            {formData.Date ? new Date(formData.Date).toLocaleDateString() : 'Not set'}
                          </div>
                          <div className="col-6 mt-2">
                            <strong>Time:</strong><br/>
                            {formData.Time}
                          </div>
                          <div className="col-6 mt-2">
                            <strong>Priority:</strong><br/>
                            <span className={`badge bg-${
                              formData.Priority === 'normal' ? 'secondary' :
                              formData.Priority === 'urgent' ? 'warning' :
                              'danger'
                            }`}>
                              {formData.Priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="d-flex justify-content-between">
                      <div>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => navigate('/reception/')}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Back to Appointment Hub
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger ms-2"
                          onClick={handleReset}
                          disabled={loading}
                        >
                          <i className="bi bi-x-circle me-1"></i> Clear Form
                        </button>
                      </div>
                      
                      <div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-lg"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Scheduling...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-calendar-plus me-1"></i> Schedule Appointment
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Important Information */}
            <div className="card-footer bg-light border-0">
              <div className="alert alert-warning mb-0">
                <h6 className="alert-heading">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Important Information:
                </h6>
                <ul className="mb-0 small">
                  <li>Appointments can only be scheduled up to 30 days in advance</li>
                  <li>Token numbers reset daily and are auto-generated</li>
                  <li>Critical appointments will be prioritized in the queue</li>
                  <li>Doctor availability is checked in real-time</li>
                  <li>Patients will receive SMS/email notifications for confirmed appointments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAppointmentPage;