// src/modules/reception/pages/ReceptionDashboard.jsx - UPDATED VERSION
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { receptionApi } from "../services/receptionApi";

const ReceptionDashboard = () => {
  const { user, staffDetail } = useAuth();
  
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
  
  const [error, setError] = useState("");

  // Dashboard stats cards - Updated to match admin dashboard style
  const statCards = [
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: "bi-calendar-check",
      color: "primary",
      description: "Appointments scheduled for today"
    },
    {
      title: "Active Doctors",
      value: stats.activeDoctors,
      icon: "bi-person-check",
      color: "success",
      description: "Doctors available now"
    },
    {
      title: "Total Patients",
      value: stats.totalPatients,
      icon: "bi-people",
      color: "warning",
      description: "Registered patients in system"
    },
    {
      title: "Pending Bills",
      value: stats.pendingBills,
      icon: "bi-cash-stack",
      color: "danger",
      description: "Bills awaiting payment"
    }
  ];

  // Admin tiles style buttons for reception
  const receptionTiles = [
    {
      title: "Patient Management",
      description: "Add, edit, and manage patient records",
      to: "/reception/patients/list",
      icon: "bi-people",
      color: "primary"
    },
    {
      title: "Appointments",
      description: "Schedule and manage appointments",
      to: "/reception/appointments/list",
      icon: "bi-calendar-week",
      color: "info"
    },
    {
      title: "Billing & Payments",
      description: "Process bills and payments",
      to: "/reception/billing/list",
      icon: "bi-credit-card",
      color: "success"
    },
    {
      title: "Doctor Availability",
      description: "Check doctor schedules and availability",
      to: "/reception/doctors",
      icon: "bi-person-badge",
      color: "warning"
    },
    {
      title: "Today's Schedule",
      description: "View today's appointments and tokens",
      to: "/reception/appointments/list?filter=today",
      icon: "bi-calendar-day",
      color: "secondary"
    },
    {
      title: "Reports",
      description: "Generate daily reports and summaries",
      to: "/reception/reports",
      icon: "bi-graph-up",
      color: "danger"
    }
  ];

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading({ stats: true, appointments: true, patients: true });
      setError("");
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's appointments
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
      setError("Failed to load some dashboard data. Some features may be limited.");
    } finally {
      setLoading({ stats: false, appointments: false, patients: false });
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setError("");
      await fetchDashboardData();
    } catch (error) {
      console.error("Error in manual refresh:", error);
      setError("Failed to refresh data");
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
    
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboardData, 30000);
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
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Reception Dashboard</h3>
          <p className="text-muted mb-0">
            Welcome back, <strong>{staffDetail?.Name || user?.username || 'Receptionist'}</strong>
          </p>
        </div>
        <div className="text-end d-flex flex-wrap gap-2 align-items-center">
          <div>
            <small className="text-muted d-block">
              <i className="bi bi-calendar-check me-1"></i>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </small>
            <small className="text-muted">
              <i className="bi bi-clock me-1"></i>
              Auto-refresh: 30s
            </small>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Error:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {/* Quick Stats - Updated to match AdminDashboard style */}
      <div className="row g-3 mb-4">
        {statCards.map((stat, index) => (
          <div key={index} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
            <div className={`card bg-${stat.color} bg-opacity-10 border-${stat.color} border-opacity-25 h-100`}>
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="text-muted mb-1">{stat.title}</h6>
                    <h3 className="mb-0">
                      {loading.stats ? (
                        <span className={`placeholder col-6 bg-${stat.color} bg-opacity-25`}></span>
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </h3>
                    <div className="mt-2">
                      <small className="text-muted">
                        {stat.description}
                      </small>
                    </div>
                  </div>
                  <div className="avatar-sm">
                    <div className={`avatar-title bg-${stat.color} bg-opacity-25 rounded`}>
                      <i className={`bi ${stat.icon} fs-4 text-${stat.color}`}></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-footer bg-transparent border-0 py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    {stat.title === "Today's Appointments" && `Next Token: TOK-${todayToken.tokenNo.toString().padStart(4, '0')}`}
                    {stat.title === "Active Doctors" && "Available now"}
                    {stat.title === "Total Patients" && "Registered in system"}
                    {stat.title === "Pending Bills" && "Awaiting payment"}
                  </small>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Data Status Bar */}
      <div className="alert alert-light border mb-4">
        <div className="row align-items-center">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Data Status: 
              <span className={`ms-2 badge ${loading.stats || loading.appointments || loading.patients ? 'bg-warning' : 'bg-success'}`}>
                {loading.stats || loading.appointments || loading.patients ? 'Loading...' : 'Live'}
              </span>
              <span className="ms-3">
                <i className="bi bi-ticket-detailed me-1"></i>
                Next Token: 
                <span className="ms-1 badge bg-primary">
                  TOK-{loading.stats ? '...' : todayToken.tokenNo.toString().padStart(4, '0')}
                </span>
              </span>
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </small>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Reception Tiles */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 pb-0">
              <h5 className="mb-0">
                <i className="bi bi-speedometer2 me-2"></i>
                Quick Actions
              </h5>
              <p className="text-muted mb-0 small">Access common reception tasks</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {receptionTiles.map((tile) => (
                  <div key={tile.title} className="col-12 col-md-6 col-lg-4">
                    <Link to={tile.to} className="text-decoration-none text-dark">
                      <div className="card border-0 shadow-sm h-100 hover-lift transition-all">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <div className={`bg-${tile.color} bg-opacity-10 rounded-circle p-3 me-3`}>
                              <i className={`bi ${tile.icon} fs-4 text-${tile.color}`}></i>
                            </div>
                            <div>
                              <h6 className="card-title mb-0 fw-semibold">{tile.title}</h6>
                            </div>
                          </div>
                          <p className="text-muted small mb-0">{tile.description}</p>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">Click to open</span>
                            <i className={`bi bi-arrow-right text-${tile.color}`}></i>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar with Recent Activity */}
        <div className="col-xl-4 col-lg-5">
          {/* Recent Patients Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Patients
              </h5>
              <span className="badge bg-primary">
                {loading.patients ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  recentPatients.length
                )}
              </span>
            </div>
            <div className="card-body p-0">
              {loading.patients ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading recent patients...</p>
                </div>
              ) : recentPatients.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people display-6 text-muted"></i>
                  <p className="mt-3 text-muted">No recent patients</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentPatients.map((patient) => (
                    <div 
                      key={patient.PAT_ID || patient.id}
                      className="list-group-item list-group-item-action border-0 py-3"
                    >
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0">
                          <div className="avatar-sm rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center">
                            <i className="bi bi-person fs-5 text-primary"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-0">{patient.Patient_Name}</h6>
                              <small className="text-muted">
                                <i className="bi bi-telephone me-1"></i>
                                {patient.Phone_Number || 'No phone'}
                                <span className="ms-2">
                                  <i className="bi bi-calendar me-1"></i>
                                  {calculateAge(patient.DOB)} yrs
                                </span>
                              </small>
                            </div>
                            <div className="text-end">
                              <small className="text-muted d-block">
                                ID: {patient.PAT_ID || 'N/A'}
                              </small>
                              <Link 
                                to={`/reception/patients/view/${patient.PAT_ID || patient.id}`}
                                className="btn btn-sm btn-outline-primary mt-1"
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer bg-transparent border-0">
              <Link to="/reception/patients/list" className="btn btn-outline-primary w-100">
                <i className="bi bi-people me-1"></i>View All Patients
              </Link>
            </div>
          </div>

          {/* Refresh Button Card */}
          <div className="card shadow-sm border-0">
            <div className="card-body text-center">
              <div className="avatar-lg mx-auto mb-3">
                <div className="avatar-title bg-light rounded-circle">
                  <i className="bi bi-arrow-clockwise fs-2 text-primary"></i>
                </div>
              </div>
              <h5 className="card-title">Refresh Dashboard</h5>
              <p className="text-muted small mb-3">
                Update all dashboard data manually
              </p>
              <button 
                className="btn btn-primary w-100"
                onClick={handleManualRefresh}
                disabled={loading.stats || loading.appointments || loading.patients}
              >
                {loading.stats || loading.appointments || loading.patients ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-2"></i>Refresh Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Appointments Table */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">
                  <i className="bi bi-calendar-day me-2"></i>
                  Today's Appointments
                </h5>
                <p className="text-muted mb-0 small">
                  {loading.appointments ? 'Loading...' : `${stats.todayAppointments} appointments scheduled for today`}
                </p>
              </div>
              <div>
                <button 
                  className="btn btn-primary btn-sm me-2"
                  onClick={() => window.location.href = '/reception/appointments/create'}
                >
                  <i className="bi bi-plus-circle me-1"></i> New Appointment
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleManualRefresh}
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
                    onClick={() => window.location.href = '/reception/appointments/create'}
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
                              {(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
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
                                onClick={() => window.location.href = `/reception/appointments/view/${appointment.TOKEN_NO || appointment.id}`}
                              >
                                <i className="bi bi-eye"></i>
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
      </div>

      {/* Footer Stats */}
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
                    30 seconds
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