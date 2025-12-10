// src/modules/doctor/pages/Appointments.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import doctorApi from "../services/doctorApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'today', 'upcoming', 'completed'
  const navigate = useNavigate();
  const { staffDetail } = useAuth();

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let response;
      
      switch(filter) {
        case 'today':
          response = await doctorApi.getTodayAppointments();
          break;
        case 'upcoming':
          response = await doctorApi.getUpcomingAppointments();
          break;
        case 'completed':
          response = await doctorApi.getMyAppointments();
          // Filter completed appointments
          const allApps = Array.isArray(response?.data) ? response.data : [];
          setAppointments(allApps.filter(app => app.status === 'Completed'));
          setLoading(false);
          return;
        default: // pending
          response = await doctorApi.getTodayAppointments();
      }
      
      const data = Array.isArray(response?.data) ? response.data : [];
      if (filter === 'pending') {
        setAppointments(data.filter(app => app.status !== 'Completed'));
      } else {
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = (appointment) => {
    navigate(`/doctor/consultation/${appointment.id}`, {
      state: { 
        appointment,
        patient: {
          id: appointment.patient_id,
          name: appointment.patient_name
        }
      }
    });
  };

  const markAppointmentCompleted = async (id) => {
    try {
      await doctorApi.markAppointmentCompleted(id);
      fetchAppointments(); // Refresh list
    } catch (error) {
      console.error("Error marking appointment as completed:", error);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  return (
    <div>
      {/* Header with back button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/doctor" className="btn btn-outline-secondary btn-sm me-2">
            <i className="bi bi-arrow-left"></i> Back to Dashboard
          </Link>
          <h3 className="mb-0 d-inline">Appointments</h3>
        </div>
        <div className="text-end">
          <small className="text-muted">
            Dr. {staffDetail?.Name?.split(' ')[0] || 'Doctor'}
          </small>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="card mb-4">
        <div className="card-body">
          <nav className="nav nav-pills">
            <button 
              className={`nav-link me-2 ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              <i className="bi bi-clock me-1"></i>
              Pending ({appointments.filter(a => a.status !== 'Completed').length})
            </button>
            <button 
              className={`nav-link me-2 ${filter === 'today' ? 'active' : ''}`}
              onClick={() => setFilter('today')}
            >
              <i className="bi bi-calendar-day me-1"></i>
              Today's
            </button>
            <button 
              className={`nav-link me-2 ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              <i className="bi bi-calendar-week me-1"></i>
              Upcoming
            </button>
            <button 
              className={`nav-link ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              <i className="bi bi-check-circle me-1"></i>
              Completed
            </button>
          </nav>
        </div>
      </div>

      {/* Appointments list */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-calendar-check me-2"></i>
            {filter === 'pending' ? 'Pending Appointments' :
             filter === 'today' ? "Today's Appointments" :
             filter === 'upcoming' ? 'Upcoming Appointments' : 'Completed Appointments'}
          </h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x display-6 text-muted"></i>
              <p className="mt-3 text-muted">No appointments found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{formatTime(appointment.appointment_time)}</td>
                      <td>
                        <strong>{appointment.patient_name || `Patient #${appointment.patient_id}`}</strong>
                        <br />
                        <small className="text-muted">
                          {appointment.patient_age && `${appointment.patient_age} yrs • `}
                          {appointment.patient_gender}
                        </small>
                      </td>
                      <td>
                        <span className={`badge ${
                          appointment.priority === 'Emergency' ? 'bg-danger' :
                          appointment.priority === 'High' ? 'bg-warning' : 'bg-info'
                        }`}>
                          {appointment.priority || 'Regular'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          appointment.status === 'Completed' ? 'bg-success' :
                          appointment.status === 'In Progress' ? 'bg-warning' :
                          'bg-primary'
                        }`}>
                          {appointment.status || 'Scheduled'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {appointment.status !== 'Completed' && (
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleStartConsultation(appointment)}
                            >
                              <i className="bi bi-play-circle me-1"></i>
                              Start Consult
                            </button>
                          )}
                          {appointment.status === 'Completed' && (
                            <button 
                              className="btn btn-outline-success"
                              onClick={() => navigate(`/doctor/consultation/${appointment.consultation_id}`)}
                            >
                              <i className="bi bi-eye me-1"></i>
                              View
                            </button>
                          )}
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
    </div>
  );
};

export default Appointments;