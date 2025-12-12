// src/modules/doctor/pages/Appointments.jsx - REFACTORED VERSION
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import doctorApi from "../services/doctorApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "pending",
    search: "",
    date: new Date().toISOString().split('T')[0]
  });
  const navigate = useNavigate();
  const { staffDetail } = useAuth();

  const fetchAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch appointments from different endpoints based on filter
      let response;
      
      switch(filters.status) {
        case 'today':
          response = await doctorApi.getTodayAppointments();
          break;
        case 'upcoming':
          response = await doctorApi.getUpcomingAppointments();
          break;
        case 'all':
          response = await doctorApi.getMyAppointments();
          break;
        case 'pending':
        default:
          response = await doctorApi.getTodayAppointments();
      }
      
      let appointmentsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          appointmentsData = response.data;
        } else if (response.data.appointments) {
          appointmentsData = response.data.appointments;
        } else if (response.data.results) {
          appointmentsData = response.data.results;
        }
      }
      
      // Apply additional filters if needed
      if (filters.search) {
        appointmentsData = appointmentsData.filter(appt => 
          (appt.patient_name && appt.patient_name.toLowerCase().includes(filters.search.toLowerCase())) ||
          (appt.PAT_ID?.Patient_Name && appt.PAT_ID.Patient_Name.toLowerCase().includes(filters.search.toLowerCase())) ||
          (appt.TOKEN_NO && appt.TOKEN_NO.toString().includes(filters.search))
        );
      }
      
      setAppointments(appointmentsData);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to load appointments data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filters.status]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAppointments();
  };

  const clearFilters = () => {
    setFilters({
      status: "pending",
      search: "",
      date: new Date().toISOString().split('T')[0]
    });
    fetchAppointments();
  };

  const handleStartConsultation = (appointment) => {
    navigate(`/doctor/consultation/${appointment.id || appointment.APPOINTMENT_ID}`, {
      state: {
        appointment: {
          ...appointment,
          TOKEN_NO: appointment.TOKEN_NO || appointment.token_no,
          APPOINTMENT_ID: appointment.id || appointment.APPOINTMENT_ID,
          PAT_ID: appointment.patient_id || appointment.PAT_ID,
          patient_name: appointment.patient_name || 
                        appointment.PAT_ID?.Patient_Name || 
                        `Patient #${appointment.patient_id || appointment.PAT_ID}`,
          patient_age: appointment.patient_age,
          patient_gender: appointment.patient_gender,
          patient_phone: appointment.patient_phone
        }
      }
    });
  };

  const handleViewConsultation = (appointment) => {
    if (appointment.consultation_id) {
      navigate(`/doctor/consultation/view/${appointment.consultation_id}`);
    } else {
      handleStartConsultation(appointment);
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await doctorApi.markAppointmentCompleted(appointmentId);
      fetchAppointments();
    } catch (err) {
      console.error("Error completing appointment:", err);
      alert("Failed to mark appointment as completed");
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return timeString;
      }
    } catch {
      return "Invalid time";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Scheduled': { color: 'primary', icon: 'bi-calendar-check' },
      'Completed': { color: 'success', icon: 'bi-check-circle' },
      'In Progress': { color: 'warning', icon: 'bi-arrow-clockwise' },
      'Pending': { color: 'secondary', icon: 'bi-hourglass' },
      'Cancelled': { color: 'danger', icon: 'bi-x-circle' },
      'Waiting': { color: 'info', icon: 'bi-person' }
    };
    
    const config = statusConfig[status] || { color: 'secondary', icon: 'bi-circle' };
    
    return <span className={`badge bg-${config.color}`}>
      <i className={`bi ${config.icon} me-1`}></i>
      {status}
    </span>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'Emergency': { color: 'danger', icon: 'bi-exclamation-triangle' },
      'High': { color: 'warning', icon: 'bi-exclamation-circle' },
      'Normal': { color: 'info', icon: 'bi-info-circle' },
      'Routine': { color: 'secondary', icon: 'bi-clock' }
    };
    
    const config = priorityConfig[priority] || { color: 'secondary', icon: 'bi-circle' };
    
    return <span className={`badge bg-${config.color}`}>
      <i className={`bi ${config.icon} me-1`}></i>
      {priority || 'Routine'}
    </span>;
  };

  const filterOptions = [
    { key: 'pending', label: 'Pending Today', icon: 'bi-clock' },
    { key: 'today', label: "Today's", icon: 'bi-calendar-day' },
    { key: 'upcoming', label: 'Upcoming', icon: 'bi-calendar-week' },
    { key: 'completed', label: 'Completed', icon: 'bi-check-circle' },
    { key: 'all', label: 'All', icon: 'bi-list' }
  ];

  // Calculate stats
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.Status === 'Scheduled' || a.Status === 'Pending').length,
    today: appointments.filter(a => {
      const today = new Date().toISOString().split('T')[0];
      return a.Date === today;
    }).length,
    completed: appointments.filter(a => a.Status === 'Completed').length
  };

  return (
    <div className="appointments-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Appointments Management</h3>
          {/* <p className="text-muted mb-0">Manage and track patient appointments</p> */}
        </div>
        <div className="text-end">
          <div className="d-flex align-items-center gap-2">
            {/* <div className="text-end">
              <div className="text-muted small">Logged in as</div>
              <div className="fw-semibold">Dr. {staffDetail?.Name?.split(' ')[0] || 'Doctor'}</div>
            </div> */}
            {/* <div className="avatar-sm bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center">
              <i className="bi bi-person fs-5 text-primary"></i>
            </div> */}
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      {/* <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3"><i className="bi bi-funnel me-2"></i>Quick Filters</h5>
          <form onSubmit={handleSearch}>
            <div className="row g-2">
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Search patient name or token..." 
                  name="search" value={filters.search} onChange={handleFilterChange} />
              </div>
              <div className="col-md-3">
                <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
                  {filterOptions.map(option => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <input type="date" className="form-control" name="date" 
                  value={filters.date} onChange={handleFilterChange} />
              </div>
              <div className="col-md-2 d-flex gap-2">
                <button type="submit" className="btn btn-primary">Apply Filters</button>
                <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>Clear</button>
              </div>
            </div>
          </form>
        </div>
      </div> */}

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Total</h6>
              <h3>{stats.total}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Pending</h6>
              <h3 className="text-warning">{stats.pending}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Today</h6>
              <h3 className="text-info">{stats.today}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Completed</h6>
              <h3 className="text-success">{stats.completed}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error}</div>}
          
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-3">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x display-1 text-muted"></i>
              <h5 className="mt-3">No Appointments Found</h5>
              <p className="text-muted">No appointments match your criteria</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Token</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.TOKEN_NO || appointment.id}>
                      <td>
                        <div className="fw-medium">{formatTime(appointment.Time || appointment.appointment_time)}</div>
                        <small className="text-muted">{formatDate(appointment.Date || appointment.appointment_time)}</small>
                      </td>
                      <td>
                        <div className="fw-medium">
                          {appointment.patient_name || 
                           appointment.PAT_ID?.Patient_Name || 
                           `Patient #${appointment.patient_id || appointment.PAT_ID}`}
                        </div>
                        <small className="text-muted d-block">
                          {appointment.patient_age && `${appointment.patient_age} yrs`}
                          {appointment.patient_gender && ` • ${appointment.patient_gender}`}
                          {appointment.patient_phone && ` • ${appointment.patient_phone}`}
                        </small>
                      </td>
                      <td>
                        <span className="badge bg-secondary">#{appointment.TOKEN_NO || 'N/A'}</span>
                      </td>
                      <td>
                        {getPriorityBadge(appointment.priority)}
                      </td>
                      <td>
                        {getStatusBadge(appointment.Status || appointment.status)}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {(appointment.Status === 'Scheduled' || appointment.status === 'Scheduled') && (
                            <button
                              className="btn btn-primary"
                              onClick={() => handleStartConsultation(appointment)}
                              title="Start Consultation"
                            >
                              <i className="bi bi-play-circle me-1"></i>
                              Start
                            </button>
                          )}
                          {appointment.Status === 'Completed' && (
                            <button
                              className="btn btn-outline-success"
                              onClick={() => handleViewConsultation(appointment)}
                              title="View Consultation"
                            >
                              <i className="bi bi-eye me-1"></i>
                              View
                            </button>
                          )}
                          {(appointment.Status === 'In Progress' || appointment.status === 'In Progress') && (
                            <button
                              className="btn btn-warning"
                              onClick={() => handleStartConsultation(appointment)}
                              title="Continue Consultation"
                            >
                              <i className="bi bi-play me-1"></i>
                              Continue
                            </button>
                          )}
                          {/* <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(`/doctor/patient/${appointment.patient_id || appointment.PAT_ID}`)}
                            title="Patient Details"
                          >
                            <i className="bi bi-person"></i>
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-3">
              <div className="row text-center">
                <div className="col-md-4 border-end">
                  <div className="text-muted small">Total Appointments</div>
                  <div className="fw-bold">{stats.total}</div>
                </div>
                <div className="col-md-4 border-end">
                  <div className="text-muted small">Completed Today</div>
                  <div className="fw-bold text-success">
                    {appointments.filter(a => 
                      a.Date === new Date().toISOString().split('T')[0] && 
                      a.Status === 'Completed'
                    ).length}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Avg. Duration</div>
                  <div className="fw-bold text-info">20 mins</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;