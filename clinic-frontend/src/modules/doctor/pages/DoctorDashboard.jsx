// src/modules/doctor/pages/DoctorDashboard.jsx - Fixed Version
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import doctorApi from "../services/doctorApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const DoctorDashboard = () => {
  const [stats, setStats] = useState({
    today_appointments: 0,
    pending_lab_tests: 0,
    pending_consultations: 0,
    lab_results_pending: 0,
    completed_consultations: 0,
    waiting_patients: 0
  });
  
  const [loading, setLoading] = useState({
    stats: true,
    appointments: true,
    recentActivity: true
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const { staffDetail } = useAuth();

  // Doctor Dashboard Tiles
  const doctorTiles = [
    {
      title: "Appointments",
      description: "Manage today's appointments and schedule",
      to: "/doctor/appointments",
      icon: "bi-calendar-check",
      color: "primary",
      statKey: "today_appointments",
      statLabel: "Today"
    },
    {
      title: "Consultation",
      description: "Start new patient consultation",
      to: "/doctor/consultation",
      icon: "bi-clipboard-heart",
      color: "success",
      statKey: "pending_consultations",
      statLabel: "Pending"
    },
    {
      title: "Lab Requests",
      description: "Create and manage lab test requests",
      to: "/doctor/lab-requests",
      icon: "bi-vial",
      color: "info",
      statKey: "pending_lab_tests",
      statLabel: "Pending"
    },
    {
      title: "Lab Results",
      description: "View and analyze lab test results",
      to: "/doctor/lab-results",
      icon: "bi-file-earmark-medical",
      color: "warning",
      statKey: "lab_results_pending",
      statLabel: "Awaiting"
    },
    {
      title: "Patient Search",
      description: "Search patient medical records",
      to: "/doctor/patient-search",
      icon: "bi-search",
      color: "secondary"
    },
    {
      title: "Consultation History",
      description: "Review past consultations and notes",
      to: "/doctor/history",
      icon: "bi-clock-history",
      color: "dark",
      statKey: "completed_consultations",
      statLabel: "Completed"
    },
  ];

  // Fetch dashboard statistics using available API methods
  const fetchDashboardStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      // Only call APIs that exist
      const [appointmentsRes, labRequestsRes, consultationsRes, resultsRes] = await Promise.all([
        doctorApi.getTodayAppointments().catch(() => ({ data: [] })),
        doctorApi.getLabTestRequests().catch(() => ({ data: [] })),
        doctorApi.getTodayConsultations().catch(() => ({ data: [] })),
        doctorApi.getPendingLabResults().catch(() => ({ data: [] }))
      ]);

      // Process appointments
      const appointments = Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [];
      const upcoming = appointments.filter(a => {
        if (!a.appointment_time) return false;
        return new Date(a.appointment_time) > new Date();
      });
      
      // Process lab requests
      const labRequests = Array.isArray(labRequestsRes?.data) ? labRequestsRes.data : [];
      
      // Process consultations
      const consultations = Array.isArray(consultationsRes?.data) ? consultationsRes.data : [];
      const pendingConsultations = consultations.filter(c => c.status === 'In Progress' || c.status === 'Pending');
      const completedConsultations = consultations.filter(c => c.status === 'Completed');
      
      // Process lab results
      const pendingResults = Array.isArray(resultsRes?.data) ? resultsRes.data : [];
      
      // Count waiting patients (appointments with status 'Scheduled' or 'Waiting')
      const waitingPatients = appointments.filter(a => 
        a.status === 'Scheduled' || a.status === 'Waiting' || a.status === 'Pending'
      ).length;

      setStats({
        today_appointments: appointments.length,
        pending_lab_tests: labRequests.filter(r => r.status === 'Pending').length,
        pending_consultations: pendingConsultations.length,
        lab_results_pending: pendingResults.length,
        completed_consultations: completedConsultations.length,
        waiting_patients: waitingPatients,
        upcoming_appointments: upcoming.length
      });

      // Store appointments for upcoming list
      setUpcomingAppointments(upcoming.slice(0, 5));

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Simulate recent activity from existing data
  const fetchRecentActivity = async () => {
    try {
      setLoading(prev => ({ ...prev, recentActivity: true }));
      
      // Create simulated recent activity from appointments and consultations
      const [appointmentsRes, consultationsRes] = await Promise.all([
        doctorApi.getTodayAppointments().catch(() => ({ data: [] })),
        doctorApi.getTodayConsultations().catch(() => ({ data: [] }))
      ]);

      const appointments = Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : [];
      const consultations = Array.isArray(consultationsRes?.data) ? consultationsRes.data : [];

      // Create activity items from recent data
      const activities = [
        ...appointments.slice(0, 3).map(app => ({
          id: `app_${app.id || Date.now()}`,
          action: `Appointment: ${app.patient_name || 'Patient'}`,
          type: 'appointment',
          patient_name: app.patient_name,
          timestamp: app.appointment_time || new Date().toISOString()
        })),
        ...consultations.slice(0, 3).map(cons => ({
          id: `cons_${cons.id || Date.now()}`,
          action: `Consultation: ${cons.patient_name || 'Patient'}`,
          type: 'consultation',
          patient_name: cons.patient_name,
          timestamp: cons.consultation_date || new Date().toISOString()
        }))
      ];

      // Sort by timestamp and take latest 6
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 6);
      
      setRecentActivity(sortedActivities);
      
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoading(prev => ({ ...prev, recentActivity: false }));
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return "Invalid time";
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Recently";
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return "Recently";
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Scheduled': { color: 'info', icon: 'bi-clock' },
      'In Progress': { color: 'warning', icon: 'bi-arrow-clockwise' },
      'Completed': { color: 'success', icon: 'bi-check-circle' },
      'Cancelled': { color: 'danger', icon: 'bi-x-circle' },
      'Pending': { color: 'secondary', icon: 'bi-hourglass' },
      'Waiting': { color: 'primary', icon: 'bi-person' }
    };
    
    const config = statusConfig[status] || { color: 'secondary', icon: 'bi-circle' };
    
    return (
      <span className={`badge bg-${config.color}`}>
        <i className={`bi ${config.icon} me-1`}></i>
        {status}
      </span>
    );
  };

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await fetchDashboardStats();
        await fetchRecentActivity();
      } catch (error) {
        console.error("Error in initial data fetch:", error);
      }
    };
    
    fetchAllData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setLoading({
        stats: true,
        appointments: true,
        recentActivity: true
      });
      
      await fetchDashboardStats();
      await fetchRecentActivity();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Doctor Dashboard</h3>
          <p className="text-muted mb-0">
            Welcome back, Dr. {staffDetail?.Name?.split(' ')[0] || 'Doctor'} • 
            <span className="text-primary ms-2">
              {staffDetail?.Department?.Department_Name || 'General Medicine'}
            </span>
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

      {/* Quick Stats Grid */}
      <div className="row g-3 mb-4">
        {/* Today's Appointments */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Today's Appointments</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.today_appointments
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `${stats.waiting_patients} waiting`
                      )}
                    </small>
                    <br />
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `${stats.upcoming_appointments} upcoming`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-calendar-check fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <Link to="/doctor/appointments" className="btn btn-outline-primary btn-sm w-100">
                <i className="bi bi-eye me-1"></i>View Schedule
              </Link>
            </div>
          </div>
        </div>

        {/* Active Consultations */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Active Consultations</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      stats.pending_consultations
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-success bg-opacity-25"></span>
                      ) : (
                        `${stats.completed_consultations} completed`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-clipboard-heart fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <Link to="/doctor/consultation" className="btn btn-outline-success btn-sm w-100">
                <i className="bi bi-plus-circle me-1"></i>New Consultation
              </Link>
            </div>
          </div>
        </div>

        {/* Lab Tests */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Lab Tests</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-info bg-opacity-25"></span>
                    ) : (
                      stats.pending_lab_tests
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-hourglass me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-8 bg-info bg-opacity-25"></span>
                      ) : (
                        `${stats.pending_lab_tests} pending requests`
                      )}
                    </small>
                    <br />
                    <small className="text-warning">
                      <i className="bi bi-file-earmark-text me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-6 bg-warning bg-opacity-25"></span>
                      ) : (
                        `${stats.lab_results_pending} results pending`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-vial fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <div className="d-flex gap-2">
                <Link to="/doctor/lab-requests" className="btn btn-outline-info btn-sm flex-grow-1">
                  <i className="bi bi-plus me-1"></i>New Request
                </Link>
                <Link to="/doctor/lab-results" className="btn btn-outline-warning btn-sm flex-grow-1">
                  <i className="bi bi-eye me-1"></i>Results
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Quick Actions</h6>
                  <div className="mt-2">
                    <small className="text-muted d-block mb-2">
                      <i className="bi bi-lightning me-1"></i>
                      Frequently used features
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-lightning-charge fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
              <div className="mt-3 d-grid gap-2">
                <button 
                  className="btn btn-outline-warning btn-sm"
                  onClick={handleRefresh}
                  disabled={loading.stats || loading.recentActivity}
                >
                  {loading.stats || loading.recentActivity ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-clockwise me-1"></i>Refresh Dashboard
                    </>
                  )}
                </button>
                <Link to="/doctor/patient-search" className="btn btn-outline-secondary btn-sm">
                  <i className="bi bi-search me-1"></i>Search Patient
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Status Bar */}
      <div className="alert alert-light border mb-4">
        <div className="row align-items-center">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Dashboard Status: 
              <span className={`ms-2 badge ${
                loading.stats || loading.recentActivity 
                ? 'bg-warning' 
                : 'bg-success'
              }`}>
                {loading.stats || loading.recentActivity 
                  ? 'Loading...' 
                  : 'Live'}
              </span>
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
              })}
            </small>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Doctor Tiles */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 pb-0">
              <h5 className="mb-0">
                <i className="bi bi-grid me-2"></i>
                Clinical Tools
              </h5>
              <p className="text-muted mb-0 small">Access medical features and tools</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {doctorTiles.map((tile, index) => (
                  <div key={index} className="col-12 col-md-6 col-lg-4">
                    <Link to={tile.to} className="text-decoration-none text-dark">
                      <div className="card border-0 shadow-sm h-100 hover-lift transition-all">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <div className={`bg-${tile.color} bg-opacity-10 rounded-circle p-3 me-3`}>
                              <i className={`bi ${tile.icon} fs-4 text-${tile.color}`}></i>
                            </div>
                            <div>
                              <h6 className="card-title mb-0 fw-semibold">{tile.title}</h6>
                              {tile.statKey && (
                                <div className="text-muted small">
                                  {stats[tile.statKey]} {tile.statLabel}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-muted small mb-0">{tile.description}</p>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">Click to access</span>
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

        {/* Sidebar - Upcoming Appointments & Recent Activity */}
        <div className="col-xl-4 col-lg-5">
          {/* Upcoming Appointments */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock me-2"></i>
                Upcoming Appointments
              </h5>
              <span className="badge bg-primary">
                {loading.stats ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  upcomingAppointments.length
                )}
              </span>
            </div>
            <div className="card-body p-0">
              {loading.stats ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading appointments...</p>
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x display-6 text-muted"></i>
                  <p className="mt-3 text-muted">No upcoming appointments</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingAppointments.map((appointment, index) => (
                    <div 
                      key={appointment.id || index}
                      className="list-group-item list-group-item-action border-0 py-3"
                    >
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0">
                          <div className="avatar-sm bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center">
                            <i className="bi bi-person fs-5 text-primary"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-0">{appointment.patient_name || 'Patient'}</h6>
                              <small className="text-muted">
                                Appointment ID: {appointment.id || 'N/A'}
                              </small>
                            </div>
                            <div className="text-end">
                              {getStatusBadge(appointment.status || 'Scheduled')}
                              <div className="text-primary small mt-1 fw-semibold">
                                <i className="bi bi-clock me-1"></i>
                                {formatTime(appointment.appointment_time)}
                              </div>
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
              <Link to="/doctor/appointments" className="btn btn-outline-primary w-100">
                <i className="bi bi-calendar-plus me-1"></i>View All
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-activity me-2"></i>
                Recent Activity
              </h5>
              <span className="badge bg-success">
                {loading.recentActivity ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  recentActivity.length
                )}
              </span>
            </div>
            <div className="card-body p-0">
              {loading.recentActivity ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-activity display-6 text-muted"></i>
                  <p className="mt-3 text-muted">No recent activity</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentActivity.map((activity, index) => (
                    <div 
                      key={activity.id || index}
                      className="list-group-item list-group-item-action border-0 py-3"
                    >
                      <div className="d-flex">
                        <div className={`avatar-sm rounded-circle d-flex align-items-center justify-content-center me-3 ${
                          activity.type === 'consultation' ? 'bg-success bg-opacity-10' :
                          activity.type === 'appointment' ? 'bg-primary bg-opacity-10' :
                          'bg-secondary bg-opacity-10'
                        }`}>
                          <i className={`bi ${
                            activity.type === 'consultation' ? 'bi-clipboard-heart' :
                            'bi-calendar-check'
                          } fs-5 ${
                            activity.type === 'consultation' ? 'text-success' : 'text-primary'
                          }`}></i>
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between">
                            <div>
                              <h6 className="mb-0 small">{activity.action}</h6>
                              <small className="text-muted">
                                {activity.patient_name || 'Patient'}
                              </small>
                            </div>
                            <div className="text-muted small">
                              {formatTimeAgo(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <div className="text-muted small">Last Updated</div>
                  <div className="fw-bold">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Today's Consultations</div>
                  <div className="fw-bold text-primary">
                    {stats.completed_consultations} completed
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Active Lab Tests</div>
                  <div className="fw-bold text-info">
                    {stats.pending_lab_tests} pending
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

export default DoctorDashboard;