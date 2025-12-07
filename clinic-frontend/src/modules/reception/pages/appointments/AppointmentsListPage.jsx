import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const AppointmentsListPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, scheduled, completed, cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    today: 0
  });
  const navigate = useNavigate();
  const location = useLocation();
  
  const itemsPerPage = 10;

  // Check URL for filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFilter = params.get('filter');
    const searchQuery = params.get('search');
    
    if (urlFilter) {
      setFilter(urlFilter);
    }
    
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
    
    fetchAppointments();
    fetchAppointmentStats();
  }, [location.search, currentPage]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      let params = {
        page: currentPage,
        page_size: itemsPerPage
      };
      
      // Apply filters
      if (filter !== 'all') {
        if (filter === 'today') {
          params.date = new Date().toISOString().split('T')[0];
        } else {
          params.status = filter.charAt(0).toUpperCase() + filter.slice(1);
        }
      }
      
      // Apply search
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await receptionApi.getAppointments(params);
      
      if (response.data) {
        const appointmentsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        
        setAppointments(appointmentsList);
        
        // Update pagination
        if (response.data.count) {
          setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        }
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
      
      // Get all appointments for stats
      const allResponse = await receptionApi.getAppointments({ page_size: 1 });
      const todayResponse = await receptionApi.getAppointments({ 
        date: today,
        page_size: 1
      });
      const scheduledResponse = await receptionApi.getAppointments({ 
        status: 'Scheduled',
        page_size: 1
      });
      const completedResponse = await receptionApi.getAppointments({ 
        status: 'Completed',
        page_size: 1
      });
      const cancelledResponse = await receptionApi.getAppointments({ 
        status: 'Cancelled',
        page_size: 1
      });
      
      setStats({
        total: allResponse.data?.count || 0,
        today: todayResponse.data?.count || 0,
        scheduled: scheduledResponse.data?.count || 0,
        completed: completedResponse.data?.count || 0,
        cancelled: cancelledResponse.data?.count || 0
      });
      
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/reception/appointments/list?search=${encodeURIComponent(searchTerm)}&filter=${filter}`);
    } else {
      navigate(`/reception/appointments/list?filter=${filter}`);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    navigate(`/reception/appointments/list?filter=${newFilter}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`);
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

  const handleCompleteAppointment = async (appointmentId) => {
    if (window.confirm('Mark this appointment as completed?')) {
      try {
        await receptionApi.updateAppointment(appointmentId, { 
          Status: 'Completed',
          Completed_At: new Date().toISOString()
        });
        alert('Appointment marked as completed');
        fetchAppointments();
        fetchAppointmentStats();
      } catch (error) {
        alert('Failed to update appointment');
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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

  return (
    <div className="container-fluid">
      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div>
            <h1 className="h2 mb-1">All Appointments</h1>
            <p className="text-muted mb-0">
              Manage patient appointments, view schedules, and update status
            </p>
          </div>
        </div>
        <div className="col-lg-4 text-lg-end">
          <Link to="/reception/appointments/create" className="btn btn-primary">
            <i className="bi bi-calendar-plus me-1"></i> New Appointment
          </Link>
          <Link to="/reception/" className="btn btn-outline-secondary ms-2">
            <i className="bi bi-arrow-left me-1"></i> Back to Appointment Hub
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="row mb-4">
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-primary border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Total</h6>
                <h3 className="mb-0">{stats.total}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-info border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Today</h6>
                <h3 className="mb-0">{stats.today}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-warning border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Scheduled</h6>
                <h3 className="mb-0">{stats.scheduled}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-success border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Completed</h6>
                <h3 className="mb-0">{stats.completed}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-danger border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Cancelled</h6>
                <h3 className="mb-0">{stats.cancelled}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-secondary border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Pages</h6>
                <h3 className="mb-0">{totalPages}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-4">
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn ${filter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`btn ${filter === 'scheduled' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('scheduled')}
                >
                  Scheduled
                </button>
              </div>
            </div>
            
            <div className="col-md-4 mt-2 mt-md-0">
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('completed')}
                >
                  Completed
                </button>
                <button
                  type="button"
                  className={`btn ${filter === 'cancelled' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('cancelled')}
                >
                  Cancelled
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                    navigate('/reception/appointments/list');
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="col-md-4 mt-2 mt-md-0">
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by patient, doctor, or token..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="mt-3">
            <small className="text-muted">
              <i className="bi bi-filter me-1"></i>
              Filter: {filter === 'all' ? 'All Appointments' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              {searchTerm && ` | Searching: "${searchTerm}"`}
            </small>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-white border-0">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-calendar-week me-2"></i>
              Appointments ({appointments.length})
            </h5>
            <div className="d-flex align-items-center">
              <small className="text-muted me-3">Auto-refresh: 30s</small>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={fetchAppointments}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
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
              <h5 className="mt-3">No appointments found</h5>
              <p className="text-muted">
                {searchTerm 
                  ? `No appointments match your search "${searchTerm}"` 
                  : filter !== 'all' 
                    ? `No ${filter} appointments found`
                    : 'No appointments scheduled yet'
                }
              </p>
              <Link to="/reception/appointments/create" className="btn btn-primary mt-2">
                <i className="bi bi-calendar-plus me-1"></i> Create First Appointment
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Token No</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date & Time</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.TOKEN_NO || appointment.id}>
                      <td className="align-middle">
                        <strong className="text-primary">
                          APID-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
                        </strong>
                        <div className="text-muted small">
                          TOK-{(appointment.TOKEN_NO || appointment.id).toString().padStart(4, '0')}
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="fw-medium">{appointment.patient_name || 'N/A'}</div>
                        <small className="text-muted">
                          ID: PAT-{appointment.PAT_ID || 'N/A'}
                        </small>
                      </td>
                      <td className="align-middle">
                        <div className="fw-medium">Dr. {appointment.doctor_name || 'N/A'}</div>
                        <small className="text-muted">
                          Dept: {appointment.doctor_department || 'General'}
                        </small>
                      </td>
                      <td className="align-middle">
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
                      <td className="align-middle">
                        {getPriorityBadge(appointment.Priority)}
                      </td>
                      <td className="align-middle">
                        {getStatusBadge(appointment.Status)}
                      </td>
                      <td className="align-middle">
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => navigate(`/reception/appointments/view/${appointment.TOKEN_NO || appointment.id}`)}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          
                          {appointment.Status === 'Scheduled' && (
                            <>
                              <button 
                                className="btn btn-outline-success"
                                onClick={() => handleCompleteAppointment(appointment.TOKEN_NO || appointment.id)}
                                title="Mark as Completed"
                              >
                                <i className="bi bi-check"></i>
                              </button>
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
                            </>
                          )}
                          
                          {appointment.Status === 'Completed' && (
                            <button 
                              className="btn btn-outline-info"
                              onClick={() => navigate(`/reception/billing/create?appointment=${appointment.TOKEN_NO}`)}
                              title="Create Bill"
                            >
                              <i className="bi bi-cash"></i>
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
                  <Link to="/reception/appointments/list?filter=today" className="btn btn-outline-info w-100">
                    <i className="bi bi-calendar-day me-1"></i> Today's Appointments
                  </Link>
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
                  <Link to="/reception/appointments" className="btn btn-outline-secondary w-100">
                    <i className="bi bi-house-door me-1"></i> Appointment Hub
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