import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const ViewPatientPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchPatientDetails();
    fetchPatientAppointments();
    fetchPatientBills();
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      const response = await receptionApi.getPatientById(id);
      if (response.data) {
        setPatient(response.data);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      alert('Patient not found');
      navigate('/reception/patients/list');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientAppointments = async () => {
    try {
      const response = await receptionApi.getAppointments({ patient_id: id });
      if (response.data) {
        setAppointments(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchPatientBills = async () => {
    try {
      const response = await receptionApi.getBills({ patient_id: id });
      if (response.data) {
        setBills(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${patient?.Patient_Name}? This action cannot be undone.`)) {
      try {
        await receptionApi.deletePatient(id);
        alert('Patient deleted successfully');
        navigate('/reception/patients/list');
      } catch (error) {
        alert('Failed to delete patient');
      }
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return `${phone.substring(0, 5)} ${phone.substring(5)}`;
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

  const patientId = patient.PAT_ID || patient.id;
  const patientAge = calculateAge(patient.DOB);

  return (
    <div className="container-fluid">
      
      {/* Patient Header */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div className="d-flex align-items-start">
            <div className="avatar-xxl me-4">
              <div className="avatar-title bg-primary bg-opacity-10 rounded-circle">
                <i className="bi bi-person-fill fs-1 text-primary"></i>
              </div>
            </div>
            <div className="flex-grow-1">
              <h1 className="h2 mb-1">{patient.Patient_Name}</h1>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className="badge bg-primary">
                  PAT-{patientId.toString().padStart(6, '0')}
                </span>
                <span className="badge bg-info">{patientAge} years</span>
                {patient.Blood_Group && (
                  <span className="badge bg-danger">Blood Group: {patient.Blood_Group}</span>
                )}
                {patient.Gender && (
                  <span className="badge bg-secondary">{patient.Gender}</span>
                )}
              </div>
              <p className="text-muted mb-0">
                <i className="bi bi-telephone me-1"></i>
                {formatPhone(patient.Phone_Number)}
                {patient.Email && (
                  <>
                    {' | '}
                    <i className="bi bi-envelope me-1 ms-2"></i>
                    {patient.Email}
                  </>
                )}
              </p>
            </div>
            <div className="text-end">
              <div className="btn-group">
                <Link 
                  to={`/reception/patients/edit/${id}`}
                  className="btn btn-outline-warning"
                >
                  <i className="bi bi-pencil me-1"></i> Edit
                </Link>
                <button 
                  className="btn btn-outline-danger"
                  onClick={handleDelete}
                >
                  <i className="bi bi-trash me-1"></i> Delete
                </button>
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
                <i className="bi bi-person me-1"></i> Patient Details
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setActiveTab('appointments')}
              >
                <i className="bi bi-calendar me-1"></i> Appointments ({appointments.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'bills' ? 'active' : ''}`}
                onClick={() => setActiveTab('bills')}
              >
                <i className="bi bi-cash-stack me-1"></i> Bills ({bills.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'medical' ? 'active' : ''}`}
                onClick={() => setActiveTab('medical')}
              >
                <i className="bi bi-heart-pulse me-1"></i> Medical Info
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
              {/* Patient Details Tab */}
              {activeTab === 'details' && (
                <div className="row">
                  <div className="col-md-6">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-person-lines-fill me-2"></i>
                      Personal Information
                    </h5>
                    
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
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Blood Group</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{patient.Blood_Group || 'Unknown'}</strong>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Occupation</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{patient.Occupation || 'Not specified'}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-geo-alt me-2"></i>
                      Contact Information
                    </h5>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Phone Number</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{formatPhone(patient.Phone_Number)}</strong>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Email Address</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{patient.Email || 'Not provided'}</strong>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Emergency Contact</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{formatPhone(patient.Emergency_Contact) || 'Not provided'}</strong>
                      </div>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-sm-4">
                        <small className="text-muted">Address</small>
                      </div>
                      <div className="col-sm-8">
                        <strong>{patient.Address || 'Not provided'}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 mt-4">
                    <h5 className="border-bottom pb-2 mb-3">
                      <i className="bi bi-clock-history me-2"></i>
                      Registration Details
                    </h5>
                    
                    <div className="row">
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body">
                            <small className="text-muted">Patient Since</small>
                            <div className="fw-bold">
                              {formatDate(patient.Created_Date || patient.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body">
                            <small className="text-muted">Last Updated</small>
                            <div className="fw-bold">
                              {formatDate(patient.Updated_Date || patient.updated_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="card bg-light">
                          <div className="card-body">
                            <small className="text-muted">Total Visits</small>
                            <div className="fw-bold">{appointments.length}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Appointments Tab */}
              {activeTab === 'appointments' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>
                      <i className="bi bi-calendar me-2"></i>
                      Appointment History
                    </h5>
                    <Link 
                      to={`/reception/appointments/create?patient=${id}`}
                      className="btn btn-primary btn-sm"
                    >
                      <i className="bi bi-plus-circle me-1"></i> New Appointment
                    </Link>
                  </div>
                  
                  {appointments.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-calendar-x display-6 text-muted"></i>
                      <p className="mt-3">No appointments found for this patient</p>
                      <Link 
                        to={`/reception/appointments/create?patient=${id}`}
                        className="btn btn-primary"
                      >
                        Schedule First Appointment
                      </Link>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Token No</th>
                            <th>Date</th>
                            <th>Doctor</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments.map((appointment) => (
                            <tr key={appointment.TOKEN_NO || appointment.id}>
                              <td>
                                <strong>APID-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}</strong>
                              </td>
                              <td>{formatDate(appointment.Date)}</td>
                              <td>Dr. {appointment.doctor_name || 'N/A'}</td>
                              <td>
                                <span className={`badge ${
                                  appointment.Priority === 'urgent' ? 'bg-warning' :
                                  appointment.Priority === 'critical' ? 'bg-danger' :
                                  'bg-secondary'
                                }`}>
                                  {appointment.Priority || 'normal'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  appointment.Status === 'Scheduled' ? 'bg-info' :
                                  appointment.Status === 'Completed' ? 'bg-success' :
                                  appointment.Status === 'Cancelled' ? 'bg-danger' :
                                  'bg-secondary'
                                }`}>
                                  {appointment.Status}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => navigate(`/reception/appointments/view/${appointment.TOKEN_NO || appointment.id}`)}
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* Bills Tab */}
              {activeTab === 'bills' && (
                <div>
                  <h5 className="mb-3">
                    <i className="bi bi-cash-stack me-2"></i>
                    Billing History
                  </h5>
                  
                  {bills.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-cash display-6 text-muted"></i>
                      <p className="mt-3">No bills found for this patient</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Bill ID</th>
                            <th>Date</th>
                            <th>Total Amount</th>
                            <th>Payment Status</th>
                            <th>Payment Mode</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bills.map((bill) => (
                            <tr key={bill.BILL_ID || bill.id}>
                              <td>
                                <strong>BILL-{(bill.BILL_ID || bill.id).toString().padStart(6, '0')}</strong>
                              </td>
                              <td>{formatDate(bill.Created_Date)}</td>
                              <td>
                                <strong>₹{parseFloat(bill.Total_Amount || 0).toFixed(2)}</strong>
                              </td>
                              <td>
                                <span className={`badge ${
                                  bill.Pay_Status === 'Paid' ? 'bg-success' :
                                  bill.Pay_Status === 'Pending' ? 'bg-warning' :
                                  bill.Pay_Status === 'Partial' ? 'bg-info' :
                                  'bg-danger'
                                }`}>
                                  {bill.Pay_Status}
                                </span>
                              </td>
                              <td>{bill.Payment_Mode || 'N/A'}</td>
                              <td>
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => navigate(`/reception/billing/view/${bill.BILL_ID || bill.id}`)}
                                >
                                  <i className="bi bi-eye"></i> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* Medical Info Tab */}
              {activeTab === 'medical' && (
                <div>
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Medical information can only be edited by doctors. Please contact the medical staff for updates.
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header">
                          <h6 className="mb-0">Medical History</h6>
                        </div>
                        <div className="card-body">
                          <p className="text-muted">
                            No medical history recorded yet.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="card">
                        <div className="card-header">
                          <h6 className="mb-0">Allergies</h6>
                        </div>
                        <div className="card-body">
                          <p className="text-muted">
                            No allergies recorded.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Actions Footer */}
            <div className="card-footer bg-light border-0">
              <div className="d-flex justify-content-between">
                <div>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => window.print()}
                  >
                    <i className="bi bi-printer me-1"></i> Print Details
                  </button>
                </div>
                <div className="d-flex gap-2">
                  <Link 
                    to={`/reception/appointments/create?patient=${id}`}
                    className="btn btn-success"
                  >
                    <i className="bi bi-calendar-plus me-1"></i> New Appointment
                  </Link>
                  <Link 
                    to="/reception/patients/list"
                    className="btn btn-outline-secondary"
                  >
                    <i className="bi bi-arrow-left me-1"></i> Back to Patients
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

export default ViewPatientPage;