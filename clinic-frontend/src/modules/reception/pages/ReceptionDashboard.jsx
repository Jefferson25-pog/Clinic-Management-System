// src/modules/reception/pages/ReceptionDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { receptionApi } from "../services/receptionApi";

const ReceptionDashboard = () => {
  const { user, staffDetail } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingBills: 0,
    totalPatients: 0,
    activeDoctors: 0,
    todayRegistrations: 0
  });
  
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [todayToken, setTodayToken] = useState({ tokenNo: 1, appointmentCount: 0 });
  const [loading, setLoading] = useState({
    stats: true,
    appointments: true,
    patients: true
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Quick action tiles - Updated to link to management pages
  const quickActions = [
    {
      title: "Manage Patients",
      description: "Add, edit, view all patients",
      to: "/reception/patients/list",
      icon: "bi-people",
      color: "primary",
      badge: "Manage"
    },
    {
      title: "Schedule Appointments",
      description: "Create and manage appointments",
      to: "/reception/appointments/list",
      icon: "bi-calendar-week",
      color: "success",
      badge: "Today"
    },
    {
      title: "Process Bills",
      description: "View and manage payments",
      to: "/reception/billing/list",
      icon: "bi-credit-card",
      color: "warning",
      badge: `${stats.pendingBills} pending`
    },
    {
      title: "Quick Search",
      description: "Find anything quickly",
      to: "#",
      icon: "bi-search",
      color: "info",
      badge: "Search",
      onClick: () => document.getElementById('globalSearch').focus()
    }
  ];

  // Dashboard stats cards
  const statCards = [
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: "bi-calendar-check",
      color: "primary",
      link: "/reception/appointments/list?filter=today",
      linkText: "View Schedule"
    },
    {
      title: "Active Doctors",
      value: stats.activeDoctors,
      icon: "bi-person-check",
      color: "success",
      link: "/reception/doctors",
      linkText: "Check Availability"
    },
    {
      title: "Total Patients",
      value: stats.totalPatients,
      icon: "bi-people",
      color: "warning",
      link: "/reception/patients/list",
      linkText: "Manage Patients"
    },
    {
      title: "Pending Bills",
      value: stats.pendingBills,
      icon: "bi-cash-stack",
      color: "danger",
      link: "/reception/billing/list?status=pending",
      linkText: "Process Payments"
    }
  ];

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading({ stats: true, appointments: true, patients: true });
      
      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const appointmentsRes = await receptionApi.getAppointments({ 
        date: today,
        status: 'Scheduled'
      });
      
      if (appointmentsRes.data) {
        const appointments = Array.isArray(appointmentsRes.data) 
          ? appointmentsRes.data 
          : appointmentsRes.data.results || [];
        
        setRecentAppointments(appointments.slice(0, 5));
        setStats(prev => ({ ...prev, todayAppointments: appointments.length }));
        
        // Calculate today's token
        setTodayToken({
          tokenNo: appointments.length + 1,
          appointmentCount: appointments.length
        });
      }
      
      // Fetch recent patients
      const patientsRes = await receptionApi.getPatients({ 
        page_size: 5,
        ordering: '-PAT_ID'
      });
      
      if (patientsRes.data) {
        const patients = Array.isArray(patientsRes.data)
          ? patientsRes.data
          : patientsRes.data.results || [];
        
        setRecentPatients(patients);
        setStats(prev => ({ 
          ...prev, 
          totalPatients: patientsRes.data.count || patients.length 
        }));
      }
      
      // Fetch available doctors
      const doctorsRes = await receptionApi.getDoctors({ status: 'Available' });
      if (doctorsRes.data) {
        const doctors = Array.isArray(doctorsRes.data)
          ? doctorsRes.data
          : doctorsRes.data.results || [];
        
        setStats(prev => ({ 
          ...prev, 
          activeDoctors: doctors.length 
        }));
      }
      
      // Fetch pending bills count
      const billsRes = await receptionApi.getBills({ pay_status: 'Pending' });
      if (billsRes.data) {
        const bills = Array.isArray(billsRes.data)
          ? billsRes.data
          : billsRes.data.results || [];
        
        setStats(prev => ({ ...prev, pendingBills: bills.length }));
      }
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading({ stats: false, appointments: false, patients: false });
    }
  };

  // Handle quick patient registration
  const handleQuickRegistration = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const patientData = {
      Patient_Name: formData.get('quick_name'),
      DOB: formData.get('quick_dob') || null,
      Phone_Number: formData.get('quick_phone'),
      Address: formData.get('quick_address') || '',
      Email: formData.get('quick_email') || ''
    };
    
    try {
      await receptionApi.createPatient(patientData);
      alert('Patient registered successfully!');
      e.target.reset();
      fetchDashboardData();
    } catch (error) {
      alert('Error registering patient: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle patient search
  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/reception/patients?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Cancel an appointment
  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await receptionApi.updateAppointment(appointmentId, { Status: 'Cancelled' });
        alert('Appointment cancelled successfully');
        fetchDashboardData();
      } catch (error) {
        alert('Failed to cancel appointment');
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format date/time
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get priority badge
  const getPriorityBadge = (priority) => {
    const colors = {
      normal: "secondary",
      urgent: "warning",
      critical: "danger"
    };
    
    return (
      <span className={`badge bg-${colors[priority] || 'secondary'}`}>
        {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Normal'}
      </span>
    );
  };

  // Format patient age
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

  return (
    <div className="container-fluid">
      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-1">Reception Dashboard</h1>
              <p className="text-muted mb-0">
                Welcome back, <strong>{staffDetail?.Name || user?.username || 'Receptionist'}</strong>
              </p>
            </div>
            <div className="text-end">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <small className="text-muted d-block">Today is</small>
                  <strong>{new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</strong>
                </div>
                <div className="card bg-primary text-white shadow-sm">
                  <div className="card-body py-2 px-3">
                    <small className="opacity-75">Next Token</small>
                    <h4 className="mb-0">
                      {loading.stats ? (
                        <span className="placeholder col-6 bg-white bg-opacity-50"></span>
                      ) : (
                        `TOK-${todayToken.tokenNo.toString().padStart(4, '0')}`
                      )}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mt-3 mt-lg-0">
          <div className="input-group">
            <input
              type="text"
              id="globalSearch"
              className="form-control"
              placeholder="Search patients, appointments, bills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePatientSearch(e)}
            />
            <button 
              className="btn btn-primary"
              type="button"
              onClick={handlePatientSearch}
            >
              <i className="bi bi-search"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        {statCards.map((stat, index) => (
          <div key={index} className="col-xl-3 col-lg-6">
            <div className={`card border-start border-${stat.color} border-4 shadow-sm h-100`}>
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="text-muted mb-1">{stat.title}</h6>
                    <h2 className="mb-0">
                      {loading.stats ? (
                        <span className="placeholder col-6"></span>
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </h2>
                  </div>
                  <div className="avatar-sm">
                    <div className={`avatar-title bg-${stat.color} bg-opacity-10 rounded`}>
                      <i className={`bi ${stat.icon} fs-4 text-${stat.color}`}></i>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Link to={stat.link} className={`btn btn-outline-${stat.color} btn-sm`}>
                    <i className="bi bi-arrow-right me-1"></i> {stat.linkText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
              <p className="text-muted mb-0 small">Frequently used tasks</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickActions.map((action, index) => (
                  <div key={index} className="col-xl-3 col-lg-6">
                    {action.to === '#' ? (
                      <div 
                        className="card border-0 shadow-sm hover-lift transition-all h-100 cursor-pointer"
                        onClick={action.onClick}
                      >
                        <div className="card-body">
                          <div className="d-flex align-items-start">
                            <div className={`bg-${action.color} bg-opacity-10 rounded-circle p-3 me-3`}>
                              <i className={`bi ${action.icon} fs-4 text-${action.color}`}></i>
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start">
                                <h6 className="mb-1 fw-semibold">{action.title}</h6>
                                <span className={`badge bg-${action.color}`}>
                                  {action.badge}
                                </span>
                              </div>
                              <p className="text-muted small mb-0">{action.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">Click to search</span>
                            <i className={`bi bi-arrow-right text-${action.color}`}></i>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link to={action.to} className="text-decoration-none text-dark">
                        <div className="card border-0 shadow-sm hover-lift transition-all h-100">
                          <div className="card-body">
                            <div className="d-flex align-items-start">
                              <div className={`bg-${action.color} bg-opacity-10 rounded-circle p-3 me-3`}>
                                <i className={`bi ${action.icon} fs-4 text-${action.color}`}></i>
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start">
                                  <h6 className="mb-1 fw-semibold">{action.title}</h6>
                                  <span className={`badge bg-${action.color}`}>
                                    {action.badge}
                                  </span>
                                </div>
                                <p className="text-muted small mb-0">{action.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="card-footer bg-transparent border-0 pt-0">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">Click to open</span>
                              <i className={`bi bi-arrow-right text-${action.color}`}></i>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="row g-4">
        {/* Today's Appointments */}
        <div className="col-xl-8">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">
                  <i className="bi bi-calendar-day me-2"></i>
                  Today's Appointments
                </h5>
                <p className="text-muted mb-0 small">
                  {stats.todayAppointments} appointments scheduled for today
                </p>
              </div>
              <div>
                <button 
                  className="btn btn-primary btn-sm me-2"
                  onClick={() => navigate('/reception/appointments/create')}
                >
                  <i className="bi bi-plus-circle me-1"></i> New Appointment
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={fetchDashboardData}
                  disabled={loading.appointments}
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {loading.appointments ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading appointments...</p>
                </div>
              ) : recentAppointments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x display-6 text-muted"></i>
                  <p className="mt-3 text-muted">No appointments scheduled for today</p>
                  <button 
                    className="btn btn-primary mt-2"
                    onClick={() => navigate('/reception/appointments/create')}
                  >
                    <i className="bi bi-plus-circle me-1"></i> Schedule First Appointment
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Time</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointments.map((appointment) => (
                        <tr key={appointment.TOKEN_NO || appointment.id}>
                          <td className="align-middle">
                            <strong className="text-primary">
                              APID-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
                            </strong>
                          </td>
                          <td className="align-middle">
                            <div>
                              <div className="fw-medium">{appointment.patient_name || 'N/A'}</div>
                              <small className="text-muted">
                                ID: PAT-{appointment.PAT_ID || 'N/A'}
                              </small>
                            </div>
                          </td>
                          <td className="align-middle">
                            <div>
                              <div className="fw-medium">Dr. {appointment.doctor_name || 'N/A'}</div>
                              <small className="text-muted">
                                Dept: {appointment.doctor_department || 'General'}
                              </small>
                            </div>
                          </td>
                          <td className="align-middle">
                            <div>
                              <div>{appointment.Date || 'Today'}</div>
                              <small className="text-muted">
                                {appointment.Time || 'Scheduled'}
                              </small>
                            </div>
                          </td>
                          <td className="align-middle">
                            {getPriorityBadge(appointment.Priority)}
                          </td>
                          <td className="align-middle">
                            <span className={`badge ${
                              appointment.Status === 'Scheduled' ? 'bg-info' : 
                              appointment.Status === 'Completed' ? 'bg-success' : 
                              appointment.Status === 'Cancelled' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {appointment.Status || 'Scheduled'}
                            </span>
                          </td>
                          <td className="align-middle">
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => navigate(`/reception/appointments/view/${appointment.TOKEN_NO || appointment.id}`)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button 
                                className="btn btn-outline-warning"
                                onClick={() => navigate(`/reception/appointments/edit/${appointment.TOKEN_NO || appointment.id}/edit`)}
                                disabled={appointment.Status === 'Completed' || appointment.Status === 'Cancelled'}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => handleCancelAppointment(appointment.TOKEN_NO || appointment.id)}
                                disabled={appointment.Status === 'Completed' || appointment.Status === 'Cancelled'}
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer bg-transparent border-0">
              <Link to="/reception/appointments/list" className="btn btn-outline-primary w-100">
                <i className="bi bi-calendar-week me-1"></i> View All Appointments
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="col-xl-4">
          {/* Quick Patient Registration */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">
                <i className="bi bi-person-plus me-2"></i>
                Quick Patient Registration
              </h5>
              <p className="text-muted mb-0 small">Register new patient in 30 seconds</p>
            </div>
            <div className="card-body">
              <form onSubmit={handleQuickRegistration}>
                <div className="mb-3">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    name="quick_name"
                    className="form-control" 
                    placeholder="Patient's full name"
                    required
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label">Date of Birth</label>
                    <input 
                      type="date" 
                      name="quick_dob"
                      className="form-control" 
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Phone *</label>
                    <input 
                      type="tel" 
                      name="quick_phone"
                      className="form-control" 
                      placeholder="9876543210"
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <textarea 
                    name="quick_address"
                    className="form-control" 
                    rows="2"
                    placeholder="Current address"
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Email (Optional)</label>
                  <input 
                    type="email" 
                    name="quick_email"
                    className="form-control" 
                    placeholder="patient@email.com"
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-person-plus me-1"></i> Register Patient
                  </button>
                  <Link to="/reception/patients/add" className="btn btn-outline-secondary">
                    <i className="bi bi-file-earmark-text me-1"></i> Advanced Registration
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Recent Patients */}
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Patients
              </h5>
              <span className="badge bg-primary">{recentPatients.length}</span>
            </div>
            <div className="card-body p-0">
              {loading.patients ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : recentPatients.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-people display-6 text-muted"></i>
                  <p className="mt-2 text-muted small">No patients registered yet</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentPatients.map((patient) => (
                    <div key={patient.PAT_ID || patient.id} className="list-group-item border-0 py-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{patient.Patient_Name}</h6>
                          <div className="small text-muted">
                            <span className="me-3">
                              <i className="bi bi-telephone me-1"></i>
                              {patient.Phone_Number}
                            </span>
                            <span>
                              <i className="bi bi-calendar me-1"></i>
                              {calculateAge(patient.DOB)} yrs
                            </span>
                          </div>
                        </div>
                        <div className="text-end">
                          <small className="text-muted d-block">
                            ID: PAT-{patient.PAT_ID}
                          </small>
                          <button 
                            className="btn btn-sm btn-outline-primary mt-1"
                            onClick={() => navigate(`/reception/patients/view/${patient.PAT_ID || patient.id}`)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer bg-transparent border-0">
              <Link to="/reception/patients/list" className="btn btn-outline-secondary w-100">
                <i className="bi bi-people me-1"></i> View All Patients
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body py-3">
              <div className="row text-center">
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Current Time</div>
                  <div className="fw-bold">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Logged In As</div>
                  <div className="fw-bold text-primary">
                    {staffDetail?.Name || user?.username || 'Receptionist'}
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end mt-2 mt-md-0">
                  <div className="text-muted small">Data Status</div>
                  <div className="fw-bold">
                    <span className={`badge ${loading.stats ? 'bg-warning' : 'bg-success'}`}>
                      <i className={`bi ${loading.stats ? 'bi-arrow-clockwise' : 'bi-check-circle'} me-1`}></i>
                      {loading.stats ? 'Syncing...' : 'Live'}
                    </span>
                  </div>
                </div>
                <div className="col-6 col-md-3 mt-2 mt-md-0">
                  <div className="text-muted small">Next Auto-Refresh</div>
                  <div className="fw-bold">
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    60 seconds
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;