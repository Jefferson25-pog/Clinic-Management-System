import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const ViewAppointmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [bill, setBill] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientBills, setPatientBills] = useState([]);
  const [consultationNotes, setConsultationNotes] = useState([]);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [id]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch appointment details
      const appointmentRes = await receptionApi.getAppointmentById(id);
      if (appointmentRes.data) {
        setAppointment(appointmentRes.data);
        
        // Fetch patient details
        const patientId = appointmentRes.data.PAT_ID || appointmentRes.data.patient_id;
        if (patientId) {
          try {
            const patientRes = await receptionApi.getPatientById(patientId);
            setPatient(patientRes.data);
            
            // Fetch patient's appointments
            fetchPatientAppointments(patientId);
            // Fetch patient's bills
            fetchPatientBills(patientId);
          } catch (error) {
            console.error('Error fetching patient:', error);
          }
        }
        
        // Fetch doctor details
        const doctorId = appointmentRes.data.DOC_ID || appointmentRes.data.doctor_id;
        if (doctorId) {
          try {
            const doctorRes = await receptionApi.getDoctors({ id: doctorId });
            if (doctorRes.data && Array.isArray(doctorRes.data) && doctorRes.data.length > 0) {
              setDoctor(doctorRes.data[0]);
            }
          } catch (error) {
            console.error('Error fetching doctor:', error);
          }
        }
        
        // Fetch bill if exists
        try {
          const billsRes = await receptionApi.getBills({ appointment_id: id });
          if (billsRes.data && Array.isArray(billsRes.data) && billsRes.data.length > 0) {
            setBill(billsRes.data[0]);
          }
        } catch (billError) {
          console.log('No bill found for this appointment');
        }
        
        // Fetch consultation notes
        try {
          const notesRes = await receptionApi.getConsultationNotes({ appointment_id: id });
          if (notesRes.data && Array.isArray(notesRes.data) && notesRes.data.length > 0) {
            setConsultationNotes(notesRes.data);
          }
        } catch (notesError) {
          console.log('No consultation notes found');
        }
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
      alert('Appointment not found');
      navigate('/reception/appointments/list');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientAppointments = async (patientId) => {
    try {
      const response = await receptionApi.getAppointments({ patient_id: patientId });
      if (response.data) {
        setPatientAppointments(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
    }
  };

  const fetchPatientBills = async (patientId) => {
    try {
      const response = await receptionApi.getBills({ patient_id: patientId });
      if (response.data) {
        setPatientBills(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error fetching patient bills:', error);
    }
  };

  const handleCancelAppointment = async () => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await receptionApi.updateAppointment(id, { 
          Status: 'Cancelled',
          Cancelled_By: 'Receptionist',
          Cancelled_At: new Date().toISOString()
        });
        alert('Appointment cancelled successfully');
        fetchAppointmentDetails();
      } catch (error) {
        alert('Failed to cancel appointment');
      }
    }
  };

  const handleCompleteAppointment = async () => {
    if (window.confirm('Mark this appointment as completed?')) {
      try {
        await receptionApi.updateAppointment(id, { 
          Status: 'Completed',
          Completed_At: new Date().toISOString()
        });
        alert('Appointment marked as completed');
        fetchAppointmentDetails();
      } catch (error) {
        alert('Failed to update appointment');
      }
    }
  };

  const handlePrintAppointment = () => {
    // Create a print-friendly version
    const printContent = `
      <html>
        <head>
          <title>Appointment Details - APID-${(appointment?.TOKEN_NO || appointment?.id).toString().padStart(4, '0')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-bottom: 10px; }
            .badge { padding: 5px 10px; border-radius: 3px; font-size: 12px; }
            .badge-scheduled { background: #0dcaf0; color: white; }
            .badge-completed { background: #198754; color: white; }
            .badge-cancelled { background: #dc3545; color: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Appointment Details</h1>
            <h3>APID-${(appointment?.TOKEN_NO || appointment?.id).toString().padStart(4, '0')}</h3>
          </div>
          
          <div class="section">
            <h2>Basic Information</h2>
            <div class="value">
              <span class="label">Date:</span> ${formatDate(appointment?.Date)} at ${appointment?.Time || 'N/A'}
            </div>
            <div class="value">
              <span class="label">Status:</span> 
              <span class="badge badge-${appointment?.Status?.toLowerCase()}">
                ${appointment?.Status}
              </span>
            </div>
            <div class="value">
              <span class="label">Priority:</span> ${appointment?.Priority}
            </div>
          </div>
          
          <div class="section">
            <h2>Patient Information</h2>
            <div class="value">
              <span class="label">Name:</span> ${patient?.Patient_Name || 'N/A'}
            </div>
            <div class="value">
              <span class="label">Patient ID:</span> PAT-${patient.PAT_ID || `PAT-${patient.id.toString().padStart(6, '0')}`}
            </div>
            <div class="value">
              <span class="label">Phone:</span> ${patient?.Phone_Number || 'N/A'}
            </div>
          </div>
          
          <div class="section">
            <h2>Doctor Information</h2>
            <div class="value">
              <span class="label">Doctor:</span> Dr. ${doctor?.Name || 'N/A'}
            </div>
            <div class="value">
              <span class="label">Department:</span> ${doctor?.Department?.Department_Name || 'N/A'}
            </div>
            <div class="value">
              <span class="label">Consultation Fee:</span> ₹${doctor?.Consultation_fees || '0'}
            </div>
          </div>
          
          ${appointment?.Notes ? `
          <div class="section">
            <h2>Notes</h2>
            <div class="value">${appointment.Notes}</div>
          </div>
          ` : ''}
          
          ${bill ? `
          <div class="section">
            <h2>Billing Information</h2>
            <div class="value">
              <span class="label">Bill ID:</span> BILL-${(bill?.BILL_ID || bill?.id).toString().padStart(6, '0')}
            </div>
            <div class="value">
              <span class="label">Total Amount:</span> ₹${parseFloat(bill?.Total_Amount || 0).toFixed(2)}
            </div>
            <div class="value">
              <span class="label">Payment Status:</span> ${bill?.Pay_Status}
            </div>
          </div>
          ` : ''}
          
          <div class="footer" style="margin-top: 50px; text-align: center; color: #666; font-size: 12px;">
            <p>Printed on ${new Date().toLocaleString()}</p>
            <p>Hospital Management System</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    let formatted = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (timeString) {
      formatted += ` at ${timeString}`;
    }
    
    return formatted;
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Scheduled': { color: 'info', icon: 'bi-calendar-check', text: 'Scheduled' },
      'Completed': { color: 'success', icon: 'bi-check-circle', text: 'Completed' },
      'Cancelled': { color: 'danger', icon: 'bi-x-circle', text: 'Cancelled' },
      'Pending': { color: 'warning', icon: 'bi-clock', text: 'Pending' },
      'In Progress': { color: 'primary', icon: 'bi-hourglass-split', text: 'In Progress' }
    };
    
    const config = statusConfig[status] || { color: 'secondary', icon: 'bi-question-circle', text: status };
    
    return (
      <span className={`badge bg-${config.color} px-3 py-2 fs-6`}>
        <i className={`bi ${config.icon} me-2`}></i>
        {config.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'normal': { color: 'secondary', icon: 'bi-circle', text: 'Normal' },
      'urgent': { color: 'warning', icon: 'bi-exclamation-triangle', text: 'Urgent' },
      'critical': { color: 'danger', icon: 'bi-heart-pulse', text: 'Critical' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.normal;
    
    return (
      <span className={`badge bg-${config.color} px-3 py-2 fs-6`}>
        <i className={`bi ${config.icon} me-2`}></i>
        {config.text}
      </span>
    );
  };

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

  const appointmentId = appointment.TOKEN_NO || appointment.id;
  const patientAge = calculateAge(patient?.DOB);

  return (
    <div className="container-fluid">
      
      {/* Appointment Header */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div className="d-flex align-items-start">
            <div className="avatar-xxl me-4">
              <div className="avatar-title bg-primary bg-opacity-10 rounded-circle">
                <i className="bi bi-calendar-check fs-1 text-primary"></i>
              </div>
            </div>
            <div className="flex-grow-1">
              <h1 className="h2 mb-1">Appointment Details</h1>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className="badge bg-primary fs-6">
                  APID-{appointmentId.toString().padStart(4, '0')}
                </span>
                {getStatusBadge(appointment.Status)}
                {getPriorityBadge(appointment.Priority)}
              </div>
              <p className="text-muted mb-0">
                <i className="bi bi-clock me-1"></i>
                {formatDateTime(appointment.Date, appointment.Time)}
              </p>
            </div>
            <div className="text-end">
              <div className="btn-group">
                <Link 
                  to={`/reception/appointments/edit/${id}`}
                  className="btn btn-outline-warning"
                  disabled={appointment.Status !== 'Scheduled'}
                >
                  <i className="bi bi-pencil me-1"></i> Edit
                </Link>
                {appointment.Status === 'Scheduled' && (
                  <>
                    <button 
                      className="btn btn-outline-success"
                      onClick={handleCompleteAppointment}
                    >
                      <i className="bi bi-check-circle me-1"></i> Complete
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={handleCancelAppointment}
                    >
                      <i className="bi bi-x-circle me-1"></i> Cancel
                    </button>
                  </>
                )}
              </div>
              <div className="mt-2">
                <Link 
                  to="/reception/appointments/list"
                  className="btn btn-outline-secondary btn-sm"
                >
                  <i className="bi bi-arrow-left me-1"></i> Back to List
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <i className="bi bi-info-circle me-1"></i> Appointment Details
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'patient' ? 'active' : ''}`}
                onClick={() => setActiveTab('patient')}
              >
                <i className="bi bi-person me-1"></i> Patient Info
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'doctor' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctor')}
              >
                <i className="bi bi-person-badge me-1"></i> Doctor Info
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'billing' ? 'active' : ''}`}
                onClick={() => setActiveTab('billing')}
              >
                <i className="bi bi-cash-stack me-1"></i> Billing
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'consultation' ? 'active' : ''}`}
                onClick={() => setActiveTab('consultation')}
                disabled={consultationNotes.length === 0}
              >
                <i className="bi bi-journal-text me-1"></i> Consultation Notes
                {consultationNotes.length > 0 && (
                  <span className="badge bg-primary ms-1">{consultationNotes.length}</span>
                )}
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              {/* Appointment Details Tab */}
              {activeTab === 'details' && (
                <div className="row">
                  <div className="col-md-6">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-calendar3 me-2"></i>
                      Appointment Information
                    </h5>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Token Number</small>
                      </div>
                      <div className="col-sm-8">
                        <h4 className="mb-0">TOK-{appointmentId.toString().padStart(4, '0')}</h4>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Date & Time</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{formatDateTime(appointment.Date, appointment.Time)}</strong>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Priority Level</small>
                      </div>
                      <div className="col-sm-8">
                        {getPriorityBadge(appointment.Priority)}
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Status</small>
                      </div>
                      <div className="col-sm-8">
                        {getStatusBadge(appointment.Status)}
                      </div>
                    </div>
                    
                    {appointment.Reason && (
                      <div className="row mb-3">
                        <div className="col-sm-4">
                          <small className="text-muted">Reason for Visit</small>
                        </div>
                        <div className="col-sm-8">
                          <strong>{appointment.Reason}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-md-6">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-clock-history me-2"></i>
                      Timeline & History
                    </h5>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Created On</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>
                          {appointment.Created_Date 
                            ? new Date(appointment.Created_Date).toLocaleString()
                            : 'N/A'
                          }
                        </strong>
                      </div>
                    </div>
                    
                    {appointment.Status === 'Completed' && appointment.Completed_At && (
                      <div className="row mb-3">
                        <div className="col-sm-4">
                          <small className="text-muted">Completed On</small>
                        </div>
                        <div className="col-sm-8">
                          <strong>
                            {new Date(appointment.Completed_At).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    )}
                    
                    {appointment.Status === 'Cancelled' && appointment.Cancelled_At && (
                      <>
                        <div className="row mb-3">
                          <div className="col-sm-4">
                            <small className="text-muted">Cancelled On</small>
                          </div>
                          <div className="col-sm-8">
                            <strong>
                              {new Date(appointment.Cancelled_At).toLocaleString()}
                            </strong>
                          </div>
                        </div>
                        {appointment.Cancelled_By && (
                          <div className="row mb-3">
                            <div className="col-sm-4">
                              <small className="text-muted">Cancelled By</small>
                            </div>
                            <div className="col-sm-8">
                              <strong>{appointment.Cancelled_By}</strong>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {appointment.Notes && (
                      <div className="row mb-3">
                        <div className="col-sm-4">
                          <small className="text-muted">Additional Notes</small>
                        </div>
                        <div className="col-sm-8">
                          <div className="bg-light p-3 rounded">
                            {appointment.Notes}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Patient Information Tab */}
              {activeTab === 'patient' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">
                      <i className="bi bi-person me-2"></i>
                      Patient Information
                    </h5>
                    {patient && (
                      <Link 
                        to={`/reception/patients/view/${patient.PAT_ID || patient.id}`}
                        className="btn btn-outline-primary"
                      >
                        <i className="bi bi-eye me-1"></i> View Full Profile
                      </Link>
                    )}
                  </div>
                  
                  {patient ? (
                    <div className="row">
                      <div className="col-md-6">
                        <div className="card mb-4">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Personal Details</h6>
                          </div>
                          <div className="card-body">
                            <div className="row mb-3">
                              <div className="col-sm-4">
                                <small className="text-muted">Full Name</small>
                              </div>
                              <div className="col-sm-8">
                                <strong>{patient.Patient_Name}</strong>
                              </div>
                            </div>
                            
                            <div className="row mb-3">
                              <div className="col-sm-4">
                                <small className="text-muted">Patient ID</small>
                              </div>
                              <div className="col-sm-8">
                                <strong>PAT-{(patient.PAT_ID || patient.id).toString().padStart(6, '0')}</strong>
                              </div>
                            </div>
                            
                            <div className="row mb-3">
                              <div className="col-sm-4">
                                <small className="text-muted">Date of Birth</small>
                              </div>
                              <div className="col-sm-8">
                                <strong>{formatDate(patient.DOB)}</strong>
                                <div className="text-muted small">({patientAge} years)</div>
                              </div>
                            </div>
                            
                            <div className="row mb-3">
                              <div className="col-sm-4">
                                <small className="text-muted">Gender</small>
                              </div>
                              <div className="col-sm-8">
                                <strong>{patient.Gender || 'Not specified'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-6">
                        <div className="card mb-4">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Contact Information</h6>
                          </div>
                          <div className="card-body">
                            <div className="row mb-3">
                              <div className="col-sm-4">
                                <small className="text-muted">Phone Number</small>
                              </div>
                              <div className="col-sm-8">
                                <strong>{patient.Phone_Number}</strong>
                              </div>
                            </div>
                            
                            {patient.Email && (
                              <div className="row mb-3">
                                <div className="col-sm-4">
                                  <small className="text-muted">Email Address</small>
                                </div>
                                <div className="col-sm-8">
                                  <strong>{patient.Email}</strong>
                                </div>
                              </div>
                            )}
                            
                            {patient.Emergency_Contact && (
                              <div className="row mb-3">
                                <div className="col-sm-4">
                                  <small className="text-muted">Emergency Contact</small>
                                </div>
                                <div className="col-sm-8">
                                  <strong>{patient.Emergency_Contact}</strong>
                                </div>
                              </div>
                            )}
                            
                            {patient.Address && (
                              <div className="row mb-3">
                                <div className="col-sm-4">
                                  <small className="text-muted">Address</small>
                                </div>
                                <div className="col-sm-8">
                                  <strong>{patient.Address}</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Patient Appointments History */}
                      <div className="col-12">
                        <div className="card">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Recent Appointments</h6>
                            <small>Total: {patientAppointments.length}</small>
                          </div>
                          <div className="card-body">
                            {patientAppointments.length === 0 ? (
                              <p className="text-muted text-center mb-0">No previous appointments found</p>
                            ) : (
                              <div className="table-responsive">
                                <table className="table table-sm">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Token No</th>
                                      <th>Doctor</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {patientAppointments.slice(0, 5).map((apt) => (
                                      <tr key={apt.TOKEN_NO || apt.id}>
                                        <td>{formatDate(apt.Date)}</td>
                                        <td>APID-{(apt.TOKEN_NO || apt.id).toString().padStart(4, '0')}</td>
                                        <td>{apt.doctor_name || 'N/A'}</td>
                                        <td>
                                          <span className={`badge ${
                                            apt.Status === 'Scheduled' ? 'bg-info' :
                                            apt.Status === 'Completed' ? 'bg-success' :
                                            apt.Status === 'Cancelled' ? 'bg-danger' :
                                            'bg-secondary'
                                          }`}>
                                            {apt.Status}
                                          </span>
                                        </td>
                                        <td>
                                          <button 
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => navigate(`/reception/appointments/view/${apt.TOKEN_NO || apt.id}`)}
                                          >
                                            <i className="bi bi-eye"></i>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {patientAppointments.length > 5 && (
                                  <div className="text-center mt-2">
                                    <button 
                                      className="btn btn-link btn-sm"
                                      onClick={() => navigate(`/reception/patients/view/${patient.PAT_ID || patient.id}?tab=appointments`)}
                                    >
                                      View all appointments ({patientAppointments.length})
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-person-x display-6 text-muted"></i>
                      <p className="mt-3">Patient information not available</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Doctor Information Tab */}
              {activeTab === 'doctor' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">
                      <i className="bi bi-person-badge me-2"></i>
                      Doctor Information
                    </h5>
                    {doctor && (
                      <Link 
                        to={`/doctors/profile/${doctor.STAFF_ID || doctor.id}`}
                        className="btn btn-outline-primary"
                      >
                        <i className="bi bi-eye me-1"></i> View Doctor Profile
                      </Link>
                    )}
                  </div>
                  
                  {doctor ? (
                    <div className="row">
                      <div className="col-md-8">
                        <div className="card mb-4">
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-4 text-center">
                                <div className="avatar-xxl mb-3">
                                  <div className="avatar-title bg-info bg-opacity-10 rounded-circle">
                                    <i className="bi bi-person-badge fs-1 text-info"></i>
                                  </div>
                                </div>
                                <h4>Dr. {doctor.Name}</h4>
                                {doctor.Department?.Department_Name && (
                                  <span className="badge bg-info">
                                    {doctor.Department.Department_Name}
                                  </span>
                                )}
                              </div>
                              <div className="col-md-8">
                                <div className="row mb-3">
                                  <div className="col-sm-4">
                                    <small className="text-muted">Doctor ID</small>
                                  </div>
                                  <div className="col-sm-8">
                                    <strong>{doctor.STAFF_ID || doctor.id}</strong>
                                  </div>
                                </div>
                                
                                {doctor.Qualification && (
                                  <div className="row mb-3">
                                    <div className="col-sm-4">
                                      <small className="text-muted">Qualification</small>
                                    </div>
                                    <div className="col-sm-8">
                                      <strong>{doctor.Qualification}</strong>
                                    </div>
                                  </div>
                                )}
                                
                                {doctor.Specialization && (
                                  <div className="row mb-3">
                                    <div className="col-sm-4">
                                      <small className="text-muted">Specialization</small>
                                    </div>
                                    <div className="col-sm-8">
                                      <strong>{doctor.Specialization}</strong>
                                    </div>
                                  </div>
                                )}
                                
                                {doctor.Years_of_Experience && (
                                  <div className="row mb-3">
                                    <div className="col-sm-4">
                                      <small className="text-muted">Experience</small>
                                    </div>
                                    <div className="col-sm-8">
                                      <strong>{doctor.Years_of_Experience} years</strong>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="row mb-3">
                                  <div className="col-sm-4">
                                    <small className="text-muted">Consultation Fee</small>
                                  </div>
                                  <div className="col-sm-8">
                                    <h4 className="text-success mb-0">₹{doctor.Consultation_fees || '0'}</h4>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="row">
                          <div className="col-md-6">
                            <div className="card">
                              <div className="card-header bg-light">
                                <h6 className="mb-0">Contact Information</h6>
                              </div>
                              <div className="card-body">
                                {doctor.Phone && (
                                  <div className="row mb-3">
                                    <div className="col-sm-4">
                                      <small className="text-muted">Phone</small>
                                    </div>
                                    <div className="col-sm-8">
                                      <strong>{doctor.Phone}</strong>
                                    </div>
                                  </div>
                                )}
                                
                                {doctor.Email && (
                                  <div className="row mb-3">
                                    <div className="col-sm-4">
                                      <small className="text-muted">Email</small>
                                    </div>
                                    <div className="col-sm-8">
                                      <strong>{doctor.Email}</strong>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-6">
                            <div className="card">
                              <div className="card-header bg-light">
                                <h6 className="mb-0">Availability</h6>
                              </div>
                              <div className="card-body">
                                <div className="row mb-3">
                                  <div className="col-sm-4">
                                    <small className="text-muted">Current Status</small>
                                  </div>
                                  <div className="col-sm-8">
                                    <span className={`badge ${
                                      doctor.Status === 'Available' ? 'bg-success' :
                                      doctor.Status === 'Busy' ? 'bg-warning' :
                                      doctor.Status === 'On Leave' ? 'bg-danger' :
                                      'bg-secondary'
                                    }`}>
                                      {doctor.Status || 'Unknown'}
                                    </span>
                                  </div>
                                </div>
                                
                                {doctor.Working_Hours && (
                                  <div className="row mb-3">
                                    <div className="col-sm-4">
                                      <small className="text-muted">Working Hours</small>
                                    </div>
                                    <div className="col-sm-8">
                                      <strong>{doctor.Working_Hours}</strong>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Quick Actions</h6>
                          </div>
                          <div className="card-body">
                            <div className="d-grid gap-2">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => window.open(`tel:${doctor.Phone}`)}
                                disabled={!doctor.Phone}
                              >
                                <i className="bi bi-telephone me-1"></i> Call Doctor
                              </button>
                              
                              <button 
                                className="btn btn-outline-success"
                                onClick={() => window.open(`mailto:${doctor.Email}`)}
                                disabled={!doctor.Email}
                              >
                                <i className="bi bi-envelope me-1"></i> Send Email
                              </button>
                              
                              <Link 
                                to={`/reception/appointments/create?doctor=${doctor.STAFF_ID || doctor.id}`}
                                className="btn btn-outline-warning"
                              >
                                <i className="bi bi-calendar-plus me-1"></i> New Appointment
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-person-x display-6 text-muted"></i>
                      <p className="mt-3">Doctor information not available</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">
                      <i className="bi bi-cash-stack me-2"></i>
                      Billing Information
                    </h5>
                    {!bill && appointment.Status === 'Completed' && (
                      <Link 
                        to={`/reception/billing/create?appointment=${id}`}
                        className="btn btn-success"
                      >
                        <i className="bi bi-plus-circle me-1"></i> Create Bill
                      </Link>
                    )}
                  </div>
                  
                  {bill ? (
                    <div className="row">
                      <div className="col-md-8">
                        <div className="card mb-4">
                          <div className="card-header bg-light d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">Bill Details</h6>
                            <span className="badge bg-success">Bill Generated</span>
                          </div>
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-6">
                                <div className="mb-3">
                                  <small className="text-muted">Bill ID</small>
                                  <h4>BILL-{(bill.BILL_ID || bill.id).toString().padStart(6, '0')}</h4>
                                </div>
                                
                                <div className="mb-3">
                                  <small className="text-muted">Generated On</small>
                                  <h5>{formatDate(bill.Created_Date)}</h5>
                                </div>
                                
                                <div className="mb-3">
                                  <small className="text-muted">Payment Status</small>
                                  <div>
                                    <span className={`badge ${
                                      bill.Pay_Status === 'Paid' ? 'bg-success' :
                                      bill.Pay_Status === 'Pending' ? 'bg-warning' :
                                      bill.Pay_Status === 'Partial' ? 'bg-info' :
                                      'bg-danger'
                                    }`}>
                                      {bill.Pay_Status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-md-6">
                                <div className="mb-3">
                                  <small className="text-muted">Total Amount</small>
                                  <h2 className="text-success">₹{parseFloat(bill.Total_Amount || 0).toFixed(2)}</h2>
                                </div>
                                
                                {bill.Payment_Mode && (
                                  <div className="mb-3">
                                    <small className="text-muted">Payment Mode</small>
                                    <h5>{bill.Payment_Mode}</h5>
                                  </div>
                                )}
                                
                                {bill.Paid_Amount !== undefined && (
                                  <div className="mb-3">
                                    <small className="text-muted">Amount Paid</small>
                                    <h5 className="text-success">₹{parseFloat(bill.Paid_Amount || 0).toFixed(2)}</h5>
                                  </div>
                                )}
                                
                                {bill.Due_Amount !== undefined && bill.Due_Amount > 0 && (
                                  <div className="mb-3">
                                    <small className="text-muted">Due Amount</small>
                                    <h5 className="text-danger">₹{parseFloat(bill.Due_Amount || 0).toFixed(2)}</h5>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <Link 
                                to={`/reception/billing/view/${bill.BILL_ID || bill.id}`}
                                className="btn btn-primary"
                              >
                                <i className="bi bi-eye me-1"></i> View Full Bill Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Quick Actions</h6>
                          </div>
                          <div className="card-body">
                            <div className="d-grid gap-2">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => window.print()}
                              >
                                <i className="bi bi-printer me-1"></i> Print Bill
                              </button>
                              
                              {bill.Pay_Status === 'Pending' && (
                                <Link 
                                  to={`/reception/billing/collect/${bill.BILL_ID || bill.id}`}
                                  className="btn btn-outline-success"
                                >
                                  <i className="bi bi-cash me-1"></i> Collect Payment
                                </Link>
                              )}
                              
                              {bill.Pay_Status === 'Partial' && (
                                <Link 
                                  to={`/reception/billing/collect/${bill.BILL_ID || bill.id}`}
                                  className="btn btn-outline-warning"
                                >
                                  <i className="bi bi-currency-exchange me-1"></i> Collect Balance
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="row">
                      <div className="col-md-8">
                        <div className="card">
                          <div className="card-body text-center py-5">
                            <i className="bi bi-cash display-6 text-muted mb-3"></i>
                            <h4 className="mb-3">No Bill Generated Yet</h4>
                            
                            {appointment.Status === 'Scheduled' && (
                              <div className="alert alert-info">
                                <i className="bi bi-info-circle me-1"></i>
                                Bill can be created only after appointment is completed.
                              </div>
                            )}
                            
                            {appointment.Status === 'Completed' && (
                              <>
                                <p className="text-muted mb-4">
                                  This appointment has been completed. You can now generate a bill.
                                </p>
                                <Link 
                                  to={`/reception/billing/create?appointment=${id}`}
                                  className="btn btn-success btn-lg"
                                >
                                  <i className="bi bi-plus-circle me-1"></i> Generate Bill
                                </Link>
                              </>
                            )}
                            
                            {appointment.Status === 'Cancelled' && (
                              <div className="alert alert-warning">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                This appointment was cancelled. No bill can be generated.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card">
                          <div className="card-header bg-light">
                            <h6 className="mb-0">Fee Information</h6>
                          </div>
                          <div className="card-body">
                            {doctor && (
                              <>
                                <div className="mb-3">
                                  <small className="text-muted">Doctor Consultation Fee</small>
                                  <h4 className="text-success">₹{doctor.Consultation_fees || '0'}</h4>
                                </div>
                                
                                <div className="mb-3">
                                  <small className="text-muted">Additional Charges</small>
                                  <h5 className="text-muted">₹0.00</h5>
                                </div>
                                
                                <div className="border-top pt-3">
                                  <small className="text-muted">Estimated Total</small>
                                  <h3 className="text-primary">₹{doctor.Consultation_fees || '0'}</h3>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Consultation Notes Tab */}
              {activeTab === 'consultation' && (
                <div>
                  <h5 className="mb-4">
                    <i className="bi bi-journal-text me-2"></i>
                    Consultation Notes
                  </h5>
                  
                  {consultationNotes.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-journal display-6 text-muted"></i>
                      <h4 className="mt-3">No Consultation Notes</h4>
                      <p className="text-muted">
                        Consultation notes will appear here once added by the doctor.
                      </p>
                    </div>
                  ) : (
                    <div className="row">
                      {consultationNotes.map((note, index) => (
                        <div className="col-md-6 mb-4" key={note.id || index}>
                          <div className="card h-100">
                            <div className="card-header bg-light d-flex justify-content-between align-items-center">
                              <h6 className="mb-0">
                                <i className="bi bi-journal-check me-1"></i>
                                Note {index + 1}
                              </h6>
                              <small className="text-muted">
                                {formatDate(note.Created_Date)}
                              </small>
                            </div>
                            <div className="card-body">
                              <div className="mb-3">
                                <small className="text-muted">Diagnosis</small>
                                <p className="mb-2">{note.Diagnosis || 'Not specified'}</p>
                              </div>
                              
                              <div className="mb-3">
                                <small className="text-muted">Prescription</small>
                                <p className="mb-2">{note.Prescription || 'None'}</p>
                              </div>
                              
                              <div className="mb-3">
                                <small className="text-muted">Follow-up Date</small>
                                <p className="mb-0">
                                  {note.Follow_up_Date ? formatDate(note.Follow_up_Date) : 'Not specified'}
                                </p>
                              </div>
                              
                              {note.Additional_Notes && (
                                <div className="mt-3 pt-3 border-top">
                                  <small className="text-muted">Additional Notes</small>
                                  <div className="bg-light p-3 rounded mt-2">
                                    {note.Additional_Notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Actions Footer */}
            <div className="card-footer bg-light border-0">
              <div className="d-flex justify-content-between">
                <div>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={handlePrintAppointment}
                  >
                    <i className="bi bi-printer me-1"></i> Print Details
                  </button>
                  {appointment.Status === 'Scheduled' && (
                    <button 
                      className="btn btn-outline-success ms-2"
                      onClick={handleCompleteAppointment}
                    >
                      <i className="bi bi-check-circle me-1"></i> Mark as Completed
                    </button>
                  )}
                </div>
                <div className="d-flex gap-2">
                  {patient && (
                    <Link 
                      to={`/reception/appointments/create?patient=${patient.PAT_ID || patient.id}`}
                      className="btn btn-success"
                    >
                      <i className="bi bi-calendar-plus me-1"></i> New Appointment
                    </Link>
                  )}
                  <Link 
                    to="/reception/appointments/list"
                    className="btn btn-outline-secondary"
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Appointments
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAppointmentPage;