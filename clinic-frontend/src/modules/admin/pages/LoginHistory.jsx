// src/modules/admin/pages/LoginHistory.jsx - FINAL FIXED VERSION
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../services/adminApi.js";
import debounce from "lodash/debounce";

const LoginHistory = () => {
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    username: "",
    role: "",
    start_date: "",
    end_date: "",
    show_active: false
  });
  const [sortConfig, setSortConfig] = useState({
    key: "timestamp",
    direction: "desc"
  });
  const [stats, setStats] = useState({
    total_logins: 0,
    successful_logins: 0,
    failed_logins: 0,
    today_logins: 0,
    active_sessions: 0,
    avg_session_duration: 0
  });

  const fetchLoginHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...filters,
        ...(filters.role && filters.role !== "FAILED" && { login_type: filters.role }),
        ...(filters.role === "FAILED" && { success: "false" }),
        show_active: filters.show_active ? "true" : "false",
        page_size: 50
      };

      Object.keys(params).forEach(key => {
        if (params[key] === "" || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      console.log("Fetching login history with params:", params);
      
      const response = await adminApi.getLoginHistory(params);
      console.log("API Response:", response.data);
      
      if (response.data.success) {
        let logs = response.data.logs || [];
        
        logs = sortData(logs, sortConfig.key, sortConfig.direction);
        
        setLoginHistory(logs);
        setStats(response.data.stats || {
          total_logins: logs.length,
          successful_logins: logs.filter(log => log.success).length,
          failed_logins: logs.filter(log => !log.success).length,
          today_logins: logs.filter(log => {
            if (!log.timestamp) return false;
            const logDate = new Date(log.timestamp).toDateString();
            const todayDate = new Date().toDateString();
            return logDate === todayDate;
          }).length,
          active_sessions: logs.filter(log => log.is_active).length,
          avg_session_duration: 0
        });
      } else {
        setError(response.data.error || response.data.detail || "Failed to load login history");
        setLoginHistory([]);
      }
      
    } catch (err) {
      console.error("Error fetching login history:", err);
      
      if (err.response) {
        if (err.response.status === 401) {
          setError("Your session has expired. Please log in again.");
          setTimeout(() => {
            window.location.href = '/login/admin';
          }, 2000);
        } else if (err.response.status === 403) {
          setError("You don't have permission to view login history.");
        } else if (err.response.status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Error ${err.response.status}: ${err.response.data?.detail || 'Failed to load data'}`);
        }
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError("Failed to load login history. Please try again.");
      }
      
      setLoginHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(
    debounce(() => {
      fetchLoginHistory();
    }, 500),
    []
  );

  useEffect(() => {
    fetchLoginHistory();
    
    // Auto-refresh every 60 seconds for real-time updates
    const interval = setInterval(fetchLoginHistory, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoginHistory();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.role, filters.start_date, filters.end_date, filters.show_active]);

  useEffect(() => {
    if (filters.username !== undefined) {
      debouncedFetch();
    }
    return () => debouncedFetch.cancel();
  }, [filters.username, debouncedFetch]);

  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      if (!a[key] && !b[key]) return 0;
      if (!a[key]) return direction === 'asc' ? -1 : 1;
      if (!b[key]) return direction === 'asc' ? 1 : -1;
      
      if (key.includes('timestamp') || key === 'timestamp' || key === 'logout_timestamp') {
        const dateA = new Date(a[key]);
        const dateB = new Date(b[key]);
        if (dateA < dateB) return direction === 'asc' ? -1 : 1;
        if (dateA > dateB) return direction === 'asc' ? 1 : -1;
        return 0;
      }
      
      if (key === 'session_duration') {
        return direction === 'asc' ? (a[key] || 0) - (b[key] || 0) : (b[key] || 0) - (a[key] || 0);
      }
      
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const sortedData = sortData(loginHistory, key, direction);
    setLoginHistory(sortedData);
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLoginHistory();
  };

  const clearFilters = () => {
    setFilters({
      username: "",
      role: "",
      start_date: "",
      end_date: "",
      show_active: false
    });
    setSortConfig({
      key: "timestamp",
      direction: "desc"
    });
    fetchLoginHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatTimeOnly = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getRoleBadge = (log) => {
    if (!log.success) {
      return <span className="badge bg-danger"><i className="bi bi-x-circle me-1"></i>Failed</span>;
    }
    
    switch(log.login_type) {
      case 'ADMIN':
        return <span className="badge bg-primary"><i className="bi bi-shield-lock me-1"></i>Admin</span>;
      case 'STAFF':
        const role = log.details?.role || 'Staff';
        const color = role === 'Doctor' ? 'info' : 
                      role === 'Receptionist' ? 'success' : 
                      role === 'Pharmacist' ? 'warning' :
                      role === 'Lab Technician' ? 'secondary' : 'primary';
        return <span className={`badge bg-${color}`}><i className="bi bi-person me-1"></i>{role}</span>;
      default:
        return <span className="badge bg-secondary">{log.login_type || 'Unknown'}</span>;
    }
  };

  const getStatusBadge = (log) => {
    if (!log.success) {
      return <span className="badge bg-danger"><i className="bi bi-x-circle me-1"></i>Failed</span>;
    }
    
    if (log.is_active) {
      return <span className="badge bg-success"><i className="bi bi-circle-fill me-1"></i>Active</span>;
    }
    
    return <span className="badge bg-secondary"><i className="bi bi-check-circle me-1"></i>Completed</span>;
  };

  const getSessionBadge = (log) => {
    if (!log.success) {
      return <span className="badge bg-light text-dark">N/A</span>;
    }
    
    if (log.is_active) {
      return <span className="badge bg-warning text-dark">
        <i className="bi bi-clock me-1"></i>
        Still Active
      </span>;
    }
    
    return (
      <span className="badge bg-info text-dark">
        <i className="bi bi-stopwatch me-1"></i>
        {log.session_duration_display || "N/A"}
      </span>
    );
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <i className="bi bi-arrow-down-up ms-1 text-muted"></i>;
    return sortConfig.direction === 'asc' ? 
      <i className="bi bi-arrow-up ms-1"></i> : 
      <i className="bi bi-arrow-down ms-1"></i>;
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleForceLogout = async (log) => {
    if (window.confirm(`Force logout for ${log.username}?\n\nThis will mark their session as ended.`)) {
      try {
        await adminApi.forceLogout(log.id);
        alert(`User ${log.username} logged out successfully.`);
        fetchLoginHistory();
      } catch (err) {
        alert(`Failed to force logout: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Username,Role,Status,IP Address,Login Time,Logout Time,Session Duration,Active"].concat(
          loginHistory.map(log => 
            `"${log.username || ''}","${log.login_type || ''}","${log.success ? 'Success' : 'Failed'}","${log.ip_address || ''}","${formatDate(log.timestamp)}","${log.logout_timestamp ? formatDate(log.logout_timestamp) : 'Still Active'}","${log.session_duration_display || ''}","${log.is_active ? 'Yes' : 'No'}"`
          )
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `login_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center mb-2">
            <Link to="/admin" className="btn btn-outline-secondary btn-sm me-2">
              <i className="bi bi-arrow-left"></i>
            </Link>
            <h4 className="mb-0">Login History with Logout Tracking</h4>
          </div>
          <p className="text-muted mb-0">
            Monitor all login attempts with logout timestamps and session durations.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-success"
            onClick={exportToCSV}
            disabled={loginHistory.length === 0 || loading}
          >
            <i className="bi bi-download me-1"></i>Export CSV
          </button>
          <button 
            className="btn btn-outline-primary"
            onClick={fetchLoginHistory}
            title="Refresh Data"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Loading...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Error:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-3 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted">Total Logins</h6>
                  <h4 className="mb-0">{stats.total_logins}</h4>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-door-open fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted">Active Sessions</h6>
                  <h4 className="mb-0">{stats.active_sessions}</h4>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-person-check fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted">Avg. Session</h6>
                  <h4 className="mb-0">{formatDuration(Math.round(stats.avg_session_duration || 0))}</h4>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-clock-history fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted">Today</h6>
                  <h4 className="mb-0">{stats.today_logins}</h4>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-calendar-day fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-funnel me-2"></i>
            Filters & Search
          </h5>
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">Search by Username</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter username..."
                    name="username"
                    value={filters.username}
                    onChange={handleFilterChange}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="col-6 col-md-2">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  name="role"
                  value={filters.role}
                  onChange={handleFilterChange}
                  disabled={loading}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Lab Technician">Lab Technician</option>
                  <option value="FAILED">Failed Logins</option>
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  disabled={loading}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="col-6 col-md-2 d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="show_active"
                    id="show_active"
                    checked={filters.show_active}
                    onChange={handleFilterChange}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="show_active">
                    Show Active Only
                  </label>
                </div>
              </div>

              <div className="col-12 d-flex gap-2 mt-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-funnel me-1"></i>Apply Filters
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle me-1"></i>Clear All
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading && loginHistory.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading login history...</p>
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clock-history display-1 text-muted"></i>
              <h5 className="mt-3">No Login History Found</h5>
              <p className="text-muted">
                {filters.username || filters.role || filters.start_date
                  ? "No login records match your filters. Try different criteria." 
                  : "No login history available yet."}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('username')}
                      className={sortConfig.key === 'username' ? 'table-active' : ''}
                    >
                      Username <SortIcon columnKey="username" />
                    </th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('timestamp')}
                      className={sortConfig.key === 'timestamp' ? 'table-active' : ''}
                    >
                      Login Time <SortIcon columnKey="timestamp" />
                    </th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('logout_timestamp')}
                      className={sortConfig.key === 'logout_timestamp' ? 'table-active' : ''}
                    >
                      Logout Time <SortIcon columnKey="logout_timestamp" />
                    </th>
                    <th 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSort('session_duration')}
                      className={sortConfig.key === 'session_duration' ? 'table-active' : ''}
                    >
                      Session <SortIcon columnKey="session_duration" />
                    </th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((log) => (
                    <tr key={log.id} className={log.is_active ? "table-success" : (!log.success ? "table-warning" : "")}>
                      <td><span className="badge bg-secondary">#{log.id}</span></td>
                      <td>
                        <div className="fw-medium">
                          {log.username || 'N/A'}
                          {log.is_active && <span className="badge bg-success ms-2"><i className="bi bi-circle-fill"></i></span>}
                        </div>
                      </td>
                      <td>{getRoleBadge(log)}</td>
                      <td>{getStatusBadge(log)}</td>
                      <td><code className="small">{log.ip_address || 'N/A'}</code></td>
                      <td>
                        <div className="small">
                          <div className="fw-medium">{formatDate(log.timestamp)}</div>
                          <div className="text-muted">{formatTimeOnly(log.timestamp)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="small">
                          {log.logout_timestamp ? (
                            <>
                              <div className="fw-medium">{formatDate(log.logout_timestamp)}</div>
                              <div className="text-muted">{formatTimeOnly(log.logout_timestamp)}</div>
                            </>
                          ) : (
                            <span className="badge bg-warning text-dark">
                              <i className="bi bi-clock me-1"></i>Still Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{getSessionBadge(log)}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-info"
                            onClick={() => {
                              const details = {
                                'Username': log.username || 'N/A',
                                'Role': log.login_type || 'N/A',
                                'Status': log.success ? (log.is_active ? 'Active' : 'Completed') : 'Failed',
                                'IP Address': log.ip_address || 'N/A',
                                'Login Time': formatDate(log.timestamp),
                                'Logout Time': log.logout_timestamp ? formatDate(log.logout_timestamp) : 'Still Active',
                                'Session Duration': log.session_duration_display || 'N/A',
                                'User Agent': log.user_agent || 'N/A',
                                'Details': JSON.stringify(log.details || {}, null, 2)
                              };
                              
                              alert(
                                Object.entries(details)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join('\n\n')
                              );
                            }}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          {log.is_active && (
                            <button
                              className="btn btn-outline-warning"
                              onClick={() => handleForceLogout(log)}
                              title="Force Logout"
                            >
                              <i className="bi bi-power"></i>
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
        
        {loginHistory.length > 0 && (
          <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              Showing {loginHistory.length} login record{loginHistory.length !== 1 ? 's' : ''}
              {filters.show_active && ` (Active sessions only)`}
              {sortConfig.key && (
                <span className="ms-2">
                  Sorted by {sortConfig.key.replace('_', ' ')} ({sortConfig.direction})
                </span>
              )}
            </div>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchLoginHistory}
              title="Refresh Now"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginHistory;