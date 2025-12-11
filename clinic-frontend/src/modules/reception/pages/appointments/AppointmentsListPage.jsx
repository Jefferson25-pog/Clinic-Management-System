import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const AppointmentsListPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    date: "",
    filter_type: "all"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  });
  const navigate = useNavigate();
  const location = useLocation();
  
  const itemsPerPage = 10;

  // Initialize filters from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFilter = params.get('filter');
    const searchQuery = params.get('search');
    const statusFilter = params.get('status');
    
    const newFilters = { ...filters };
    
    if (urlFilter) newFilters.filter_type = urlFilter;
    if (searchQuery) newFilters.search = searchQuery;
    if (statusFilter) newFilters.status = statusFilter;
    
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
    fetchAppointments();
    fetchAppointmentStats();
  }, [location.search]);

  // Fetch appointments when currentPage changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchAppointments();
    }
  }, [currentPage]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      // Build query parameters according to backend API
      const params = {};
      
      // Apply search filter (matches backend search_fields)
      if (filters.search) {
        params.search = filters.search;
      }
      
      // Apply status filter (exact match)
      if (filters.status) {
        params.status = filters.status;
      } else if (filters.filter_type !== 'all' && filters.filter_type !== 'today') {
        // If using filter_type for status
        params.status = filters.filter_type.charAt(0).toUpperCase() + filters.filter_type.slice(1);
      }
      
      // Apply priority filter
      if (filters.priority) {
        params.priority = filters.priority;
      }
      
      // Apply date filter
      if (filters.date) {
        params.date = filters.date;
      } else if (filters.filter_type === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.date = today;
      }
      
      console.log("Fetching appointments with params:", params); // Debug log
      
      // Call the API
      const response = await receptionApi.getAppointments(params);
      
      if (response.data) {
        let appointmentsList = [];
        let totalCount = 0;
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          appointmentsList = response.data;
          totalCount = response.data.length;
        } else if (response.data.results) {
          appointmentsList = response.data.results;
          totalCount = response.data.count || response.data.results.length;
        } else if (response.data.data) {
          appointmentsList = response.data.data;
          totalCount = response.data.total || response.data.data.length;
        }
        
        // Apply client-side pagination if needed
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedAppointments = appointmentsList.slice(startIndex, endIndex);
        
        setAppointments(paginatedAppointments);
        setTotalPages(Math.ceil(totalCount / itemsPerPage));
      }
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
      alert('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to fetch stats from the API
      try {
        // Use the stats endpoint if available
        const response = await receptionApi.getAppointments({});
        if (response.data) {
          const allAppointments = Array.isArray(response.data) 
            ? response.data 
            : response.data.results || [];
          
          setStats({
            total: allAppointments.length,
            today: allAppointments.filter(a => a.Date === today).length,
            scheduled: allAppointments.filter(a => a.Status === 'Scheduled').length,
            completed: allAppointments.filter(a => a.Status === 'Completed').length,
            cancelled: allAppointments.filter(a => a.Status === 'Cancelled').length
          });
          return;
        }
      } catch (error) {
        console.log('Could not fetch all appointments for stats:', error);
      }
      
      // Fallback: Use current filtered appointments for stats
      const allResponse = await receptionApi.getAppointments({});
      const allData = allResponse.data ? 
        (Array.isArray(allResponse.data) ? allResponse.data : allResponse.data.results || []) : [];
      
      setStats({
        total: allData.length,
        today: allData.filter(a => a.Date === today).length,
        scheduled: allData.filter(a => a.Status === 'Scheduled').length,
        completed: allData.filter(a => a.Status === 'Completed').length,
        cancelled: allData.filter(a => a.Status === 'Cancelled').length
      });
      
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      // Use current appointments for stats as last resort
      setStats({
        total: appointments.length,
        today: appointments.filter(a => a.Date === new Date().toISOString().split('T')[0]).length,
        scheduled: appointments.filter(a => a.Status === 'Scheduled').length,
        completed: appointments.filter(a => a.Status === 'Completed').length,
        cancelled: appointments.filter(a => a.Status === 'Cancelled').length
      });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    updateURL();
    fetchAppointments();
  };

  const updateURL = () => {
    const queryParams = new URLSearchParams();
    
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.filter_type !== 'all') queryParams.append('filter', filters.filter_type);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.priority) queryParams.append('priority', filters.priority);
    if (filters.date) queryParams.append('date', filters.date);
    
    const queryString = queryParams.toString();
    navigate(`/reception/appointments/list${queryString ? `?${queryString}` : ''}`, { replace: true });
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      priority: "",
      date: "",
      filter_type: "all"
    });
    setCurrentPage(1);
    navigate('/reception/appointments/list', { replace: true });
    setTimeout(() => fetchAppointments(), 100);
  };

  const handleCancelAppointment = async (appointmentId, patientName) => {
    if (window.confirm(`Are you sure you want to cancel appointment for ${patientName}?`)) {
      try {
        await receptionApi.updateAppointment(appointmentId, { 
          Status: 'Cancelled',
          Cancelled_By: 'Receptionist',
          Cancelled_At: new Date().toISOString()
        });
        alert('Appointment cancelled successfully');
        fetchAppointments();
        fetchAppointmentStats();
      } catch (error) {
        alert('Failed to cancel appointment');
      }
    }
  };

  // REMOVED: handleCompleteAppointment function
  // Receptionist should NOT be able to mark appointments as completed

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Scheduled': { color: 'info', icon: 'bi-calendar-check' },
      'Completed': { color: 'success', icon: 'bi-check-circle' },
      'Cancelled': { color: 'danger', icon: 'bi-x-circle' }
    };
    
    const config = statusConfig[status] || { color: 'secondary', icon: 'bi-question-circle' };
    
    return (
      <span className={`badge bg-${config.color}`}>
        <i className={`bi ${config.icon} me-1`}></i>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'normal': { color: 'secondary', icon: 'bi-circle' },
      'urgent': { color: 'warning', icon: 'bi-exclamation-triangle' },
      'critical': { color: 'danger', icon: 'bi-heart-pulse' }
    };
    
    const config = priorityConfig[priority] || priorityConfig.normal;
    
    return (
      <span className={`badge bg-${config.color}`}>
        <i className={`bi ${config.icon} me-1`}></i>
        {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Normal'}
      </span>
    );
  };

  // Add this function for date input
  const handleDateFilterChange = (e) => {
    const dateValue = e.target.value;
    setFilters(prev => ({ ...prev, date: dateValue, filter_type: 'all' }));
    setCurrentPage(1);
  };

  // Add this function for manual refresh
  const handleRefresh = () => {
    setCurrentPage(1);
    fetchAppointments();
    fetchAppointmentStats();
  };

  // Apply filter immediately when dropdown changes
  const handleFilterChangeAndApply = (e) => {
    handleFilterChange(e);
    const { name, value } = e.target;
    
    // If it's a significant filter change, apply immediately
    if (name === 'status' || name === 'priority' || name === 'filter_type') {
      setCurrentPage(1);
      setTimeout(() => {
        updateURL();
        fetchAppointments();
      }, 100);
    }
  };

  return (
    <div className="appointments-management">
      {/* Header - Matching StaffList style */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Appointments Management</h3>
          <p className="text-muted mb-0">Manage all patient appointments in the system</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/reception/appointments/create" className="btn btn-primary">
            <i className="bi bi-calendar-plus me-1"></i> New Appointment
          </Link>
          <Link to="/reception/" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filters - Matching StaffList style */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3"><i className="bi bi-funnel me-2"></i>Quick Filters</h5>
          <form onSubmit={handleSearch}>
            <div className="row g-2">
              <div className="col-md-3">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search patient, doctor, token..." 
                  name="search" 
                  value={filters.search} 
                  onChange={handleFilterChange} 
                />
              </div>
              <div className="col-md-2">
                <select className="form-select" name="status" value={filters.status} onChange={handleFilterChangeAndApply}>
                  <option value="">All Status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" name="priority" value={filters.priority} onChange={handleFilterChangeAndApply}>
                  <option value="">All Priorities</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" name="filter_type" value={filters.filter_type} onChange={handleFilterChangeAndApply}>
                  <option value="all">All Appointments</option>
                  <option value="today">Today Only</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search me-1"></i> Search
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
                  <i className="bi bi-x-circle me-1"></i> Clear
                </button>
              </div>
            </div>
            
            {/* Date Filter Row */}
            <div className="row mt-3">
              <div className="col-md-3">
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-calendar"></i></span>
                  <input 
                    type="date" 
                    className="form-control" 
                    name="date" 
                    value={filters.date} 
                    onChange={handleDateFilterChange}
                  />
                </div>
                <small className="text-muted">Filter by specific date</small>
              </div>
              <div className="col-md-9 d-flex align-items-end">
                <div className="d-flex gap-2 flex-wrap">
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        date: new Date().toISOString().split('T')[0],
                        filter_type: 'all'
                      }));
                      setCurrentPage(1);
                      updateURL();
                      fetchAppointments();
                    }}
                  >
                    Today
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setFilters(prev => ({ 
                        ...prev, 
                        date: tomorrow.toISOString().split('T')[0],
                        filter_type: 'all'
                      }));
                      setCurrentPage(1);
                      updateURL();
                      fetchAppointments();
                    }}
                  >
                    Tomorrow
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-info"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setFilters(prev => ({ 
                        ...prev, 
                        date: yesterday.toISOString().split('T')[0],
                        filter_type: 'all'
                      }));
                      setCurrentPage(1);
                      updateURL();
                      fetchAppointments();
                    }}
                  >
                    Yesterday
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Stats and Controls Row */}
      <div className="row mb-4">
        <div className="col-md-9">
          <div className="row">
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
                  <h6 className="text-muted">Today's</h6>
                  <h3 className="text-info">{stats.today}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-light">
                <div className="card-body text-center">
                  <h6 className="text-muted">Scheduled</h6>
                  <h3 className="text-warning">{stats.scheduled}</h3>
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
        </div>
        <div className="col-md-3">
          <div className="card bg-light h-100">
            <div className="card-body d-flex flex-column justify-content-center">
              <button 
                className="btn btn-primary w-100"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Loading...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh Data
                  </>
                )}
              </button>
              <div className="mt-2 text-center">
                <small className="text-muted">
                  {filters.search ? `Search: "${filters.search}"` : 
                   filters.status ? `Status: ${filters.status}` : 
                   filters.date ? `Date: ${filters.date}` : 
                   filters.filter_type !== 'all' ? `Filter: ${filters.filter_type}` : 'All appointments'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="btn-group flex-wrap" role="group">
            <button
              type="button"
              className={`btn ${filters.filter_type === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                setFilters({ search: "", status: "", priority: "", date: "", filter_type: 'today' });
                setCurrentPage(1);
                updateURL();
                fetchAppointments();
              }}
            >
              <i className="bi bi-calendar-day me-1"></i> Today
            </button>
            <button
              type="button"
              className={`btn ${filters.status === 'Scheduled' || filters.filter_type === 'scheduled' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => {
                setFilters({ search: "", status: 'Scheduled', priority: "", date: "", filter_type: 'scheduled' });
                setCurrentPage(1);
                updateURL();
                fetchAppointments();
              }}
            >
              <i className="bi bi-calendar-check me-1"></i> Scheduled
            </button>
            <button
              type="button"
              className={`btn ${filters.status === 'Completed' || filters.filter_type === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => {
                setFilters({ search: "", status: 'Completed', priority: "", date: "", filter_type: 'completed' });
                setCurrentPage(1);
                updateURL();
                fetchAppointments();
              }}
            >
              <i className="bi bi-check-circle me-1"></i> Completed
            </button>
            <button
              type="button"
              className={`btn ${filters.status === 'Cancelled' || filters.filter_type === 'cancelled' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => {
                setFilters({ search: "", status: 'Cancelled', priority: "", date: "", filter_type: 'cancelled' });
                setCurrentPage(1);
                updateURL();
                fetchAppointments();
              }}
            >
              <i className="bi bi-x-circle me-1"></i> Cancelled
            </button>
            <button
              type="button"
              className={`btn ${filters.priority === 'urgent' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => {
                setFilters({ search: "", status: "", priority: 'urgent', date: "", filter_type: 'all' });
                setCurrentPage(1);
                updateURL();
                fetchAppointments();
              }}
            >
              <i className="bi bi-exclamation-triangle me-1"></i> Urgent
            </button>
          </div>
        </div>
      </div>

      {/* Appointments Table - Matching StaffList style */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {/* Loading State */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-3">Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x display-1 text-muted"></i>
              <h5 className="mt-3">No Appointments Found</h5>
              <p className="text-muted">
                {filters.search 
                  ? `No appointments match your search "${filters.search}"` 
                  : filters.filter_type !== 'all'
                    ? `No ${filters.filter_type} appointments found`
                    : filters.date
                    ? `No appointments found for ${filters.date}`
                    : 'No appointments scheduled yet'
                }
              </p>
              <Link to="/reception/appointments/create" className="btn btn-primary">
                <i className="bi bi-calendar-plus me-1"></i> Create First Appointment
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date & Time</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.TOKEN_NO || appointment.id}>
                      <td>
                        <div>
                          <span className="badge bg-secondary">
                            #{appointment.APPOINTMENT_ID || appointment.id}
                          </span>
                        </div>
                        <small className="text-muted">
                          Token: {appointment.TOKEN_NO || `TOK-${appointment.id}`}
                        </small>
                      </td>
                      <td>
                        <div className="fw-medium">{appointment.patient_name || 'N/A'}</div>
                        <small className="text-muted">
                          ID: {appointment.PAT_ID || 'N/A'}
                        </small>
                      </td>
                      <td>
                        <div className="fw-medium">Dr. {appointment.doctor_name || 'N/A'}</div>
                        <small className="text-muted">
                          Dept: {appointment.doctor_department || 'General'}
                        </small>
                      </td>
                      <td>
                        <div>{formatDate(appointment.Date)}</div>
                        <small className="text-muted">
                          {appointment.Time || appointment.Created_Date 
                            ? new Date(appointment.Time || appointment.Created_Date).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            : 'Time not set'
                          }
                        </small>
                      </td>
                      <td>
                        {getPriorityBadge(appointment.Priority)}
                      </td>
                      <td>
                        {getStatusBadge(appointment.Status)}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link 
                            to={`/reception/appointments/view/${appointment.TOKEN_NO || appointment.id}`}
                            className="btn btn-outline-info"
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </Link>
                          
                          {appointment.Status === 'Scheduled' && (
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleCancelAppointment(
                                appointment.TOKEN_NO || appointment.id,
                                appointment.patient_name
                              )}
                              title="Cancel Appointment"
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          )}
                          
                          {appointment.Status === 'Completed' && (
                            <Link
                              to={`/reception/billing/create?appointment=${appointment.TOKEN_NO}`}
                              className="btn btn-outline-warning"
                              title="Create Bill"
                            >
                              <i className="bi bi-cash"></i>
                            </Link>
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
        
        {/* Pagination */}
        {!loading && appointments.length > 0 && totalPages > 1 && (
          <div className="card-footer bg-white border-0">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body py-3">
              <div className="row">
                <div className="col-md-3 text-center border-end">
                  <Link to="/reception/appointments/create" className="btn btn-primary w-100">
                    <i className="bi bi-calendar-plus me-1"></i> New Appointment
                  </Link>
                </div>
                <div className="col-md-3 text-center border-end">
                  <button 
                    onClick={() => {
                      setFilters({ search: "", status: "", priority: "", date: "", filter_type: 'today' });
                      setCurrentPage(1);
                      updateURL();
                      fetchAppointments();
                    }}
                    className="btn btn-outline-info w-100"
                  >
                    <i className="bi bi-calendar-day me-1"></i> Today's Appointments
                  </button>
                </div>
                <div className="col-md-3 text-center border-end">
                  <button 
                    className="btn btn-outline-warning w-100"
                    onClick={() => window.print()}
                  >
                    <i className="bi bi-printer me-1"></i> Print Schedule
                  </button>
                </div>
                <div className="col-md-3 text-center">
                  <Link to="/reception/" className="btn btn-outline-secondary w-100">
                    <i className="bi bi-house-door me-1"></i> Back to Dashboard
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

export default AppointmentsListPage;