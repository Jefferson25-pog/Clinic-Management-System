// src/modules/admin/pages/AdminDashboard.jsx - FIXED DEPARTMENT COUNT
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../services/adminApi.js";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total_staff: 0,
    today_logins: 0,
    total_departments: 0,
    active_sessions: 0,
    total_users: 0,
    successful_logins: 0,
    failed_logins: 0,
    active_staff: 0,
    doctors_count: 0,
    admins_count: 0
  });
  
  const [loading, setLoading] = useState({
    stats: true,
    loginHistory: true,
    departments: true
  });
  
  const [recentLogins, setRecentLogins] = useState([]);
  const [error, setError] = useState("");

  const adminTiles = [
    {
      title: "Staff Management",
      description: "Create, update and manage all staff members.",
      to: "/admin/staff",
      icon: "bi-people",
      color: "primary"
    },
    {
      title: "Department Management",
      description: "Organize clinical departments and mappings.",
      to: "/admin/departments",
      icon: "bi-building",
      color: "info"
    },
    {
      title: "System Logs",
      description: "View security & system activity logs.",
      to: "/admin/system-logs",
      icon: "bi-journal-text",
      color: "warning"
    },
    {
      title: "Login History",
      description: "Monitor login attempts and history.",
      to: "/admin/login-history",
      icon: "bi-clock-history",
      color: "success"
    },
    {
      title: "Credentials / Passwords",
      description: "Create accounts and change passwords.",
      to: "/admin/credentials",
      icon: "bi-key",
      color: "danger"
    },
    {
      title: "Reports",
      description: "Generate and view system reports.",
      to: "/admin/reports",
      icon: "bi-graph-up",
      color: "secondary"
    },
  ];

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      setError("");
      
      // Fetch dashboard stats
      const statsResponse = await adminApi.getDashboardStats();
      
      if (statsResponse.data.success) {
        const statsData = statsResponse.data.stats || {};
        
        console.log("Dashboard Stats Response:", statsResponse.data);
        console.log("Stats Data:", statsData);
        
        setStats(prev => ({
          ...prev,
          total_staff: statsData.total_staff || statsData.staff_count || 0,
          total_departments: statsData.total_departments || statsData.departments_count || 0,
          total_users: statsData.total_users || statsData.user_count || 0,
          doctors_count: statsData.doctors_count || 0,
          admins_count: statsData.admins_count || 0,
          active_staff: statsData.active_staff || 0,
          today_logins: statsData.today_logins || 0
        }));
      }
      
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Failed to load dashboard statistics");
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Fetch recent login history
  const fetchRecentLogins = async () => {
    try {
      setLoading(prev => ({ ...prev, loginHistory: true }));
      
      // Fetch recent login history (last 5)
      const loginResponse = await adminApi.getLoginHistory({
        page_size: 5,
        sort_by: '-timestamp'
      });
      
      if (loginResponse.data.success) {
        setRecentLogins(loginResponse.data.logs || []);
        
        // Update stats from login history
        if (loginResponse.data.stats) {
          setStats(prev => ({
            ...prev,
            active_sessions: loginResponse.data.stats.active_sessions || 0,
            successful_logins: loginResponse.data.stats.successful_logins || 0,
            failed_logins: loginResponse.data.stats.failed_logins || 0,
            today_logins: loginResponse.data.stats.today_logins || prev.today_logins
          }));
        }
      }
      
    } catch (err) {
      console.error("Error fetching recent logins:", err);
      // Don't show error for this - it's not critical
    } finally {
      setLoading(prev => ({ ...prev, loginHistory: false }));
    }
  };

  // Fetch department count - FIXED VERSION
  const fetchDepartmentCount = async () => {
    try {
      setLoading(prev => ({ ...prev, departments: true }));
      
      const deptResponse = await adminApi.getDepartments();
      console.log("Department API Response:", deptResponse.data);
      
      if (deptResponse.data) {
        // Handle different response formats
        let departmentCount = 0;
        
        if (deptResponse.data.count !== undefined) {
          // Format 1: { count: X, results: [...] }
          departmentCount = deptResponse.data.count;
        } else if (deptResponse.data.departments && Array.isArray(deptResponse.data.departments)) {
          // Format 2: { departments: [...] }
          departmentCount = deptResponse.data.departments.length;
        } else if (Array.isArray(deptResponse.data)) {
          // Format 3: Direct array response
          departmentCount = deptResponse.data.length;
        } else if (deptResponse.data.success && deptResponse.data.departments) {
          // Format 4: { success: true, departments: [...] }
          departmentCount = Array.isArray(deptResponse.data.departments) 
            ? deptResponse.data.departments.length 
            : 0;
        }
        
        console.log("Calculated Department Count:", departmentCount);
        
        setStats(prev => ({
          ...prev,
          total_departments: departmentCount
        }));
      }
    } catch (err) {
      console.error("Error fetching department count:", err);
      console.error("Error details:", err.response?.data || err.message);
    } finally {
      setLoading(prev => ({ ...prev, departments: false }));
    }
  };

  // Alternative: Fetch staff and get department count from staff data
  const fetchDepartmentCountFromStaff = async () => {
    try {
      const staffResponse = await adminApi.getStaff();
      console.log("Staff API Response:", staffResponse.data);
      
      if (staffResponse.data && staffResponse.data.success) {
        const staffList = staffResponse.data.staff || staffResponse.data.results || [];
        
        // Extract unique departments from staff
        const departments = new Set();
        staffList.forEach(staff => {
          if (staff.Department && staff.Department.Department_Name) {
            departments.add(staff.Department.Department_Name);
          }
        });
        
        console.log("Unique departments from staff:", Array.from(departments));
        
        setStats(prev => ({
          ...prev,
          total_departments: departments.size
        }));
      }
    } catch (err) {
      console.error("Error fetching staff for department count:", err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await fetchDashboardStats();
        await fetchRecentLogins();
        await fetchDepartmentCount();
        
        // If department count is still 0, try alternative method
        if (stats.total_departments === 0) {
          await fetchDepartmentCountFromStaff();
        }
      } catch (error) {
        console.error("Error in initial data fetch:", error);
      }
    };
    
    fetchAllData();
    
    // Refresh stats every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      await fetchDashboardStats();
      await fetchRecentLogins();
      await fetchDepartmentCount();
      
      // If department count is still 0, try alternative method
      if (stats.total_departments === 0) {
        await fetchDepartmentCountFromStaff();
      }
    } catch (error) {
      console.error("Error in manual refresh:", error);
    }
  };

  // Format date for display
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get status badge for login
  const getLoginStatusBadge = (log) => {
    if (!log.success) {
      return <span className="badge bg-danger"><i className="bi bi-x-circle me-1"></i>Failed</span>;
    }
    
    if (log.is_active) {
      return <span className="badge bg-success"><i className="bi bi-circle-fill me-1"></i>Active</span>;
    }
    
    return <span className="badge bg-danger"><i className="bi bi-check-circle me-1"></i>Logged Out</span>;
  };

  // Debug function to check API responses
  const debugAPIs = async () => {
    console.log("=== DEBUG API CALLS ===");
    
    try {
      console.log("1. Testing Dashboard Stats API:");
      const stats = await adminApi.getDashboardStats();
      console.log("Dashboard Stats:", stats.data);
      
      console.log("\n2. Testing Departments API:");
      const depts = await adminApi.getDepartments();
      console.log("Departments Response:", depts.data);
      
      console.log("\n3. Testing Staff API:");
      const staff = await adminApi.getStaff();
      console.log("Staff Response:", staff.data);
      
      console.log("\n4. Testing Login History API:");
      const logins = await adminApi.getLoginHistory({ page_size: 2 });
      console.log("Login History:", logins.data);
      
    } catch (err) {
      console.error("Debug API Error:", err);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Admin Dashboard</h3>
          <p className="text-muted mb-0">
            Central hub for managing staff, departments, and audit logs.
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

      {/* Quick Stats - Responsive Grid */}
      <div className="row g-3 mb-4">
        {/* Staff Count */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Staff</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.total_staff.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-person-check me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `${stats.active_staff || 0} active`
                      )}
                    </small>
                    <br />
                    <small className="text-muted">
                      <i className="bi bi-person-badge me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `${stats.doctors_count || 0} doctors`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-people fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <Link to="/admin/staff" className="btn btn-outline-primary btn-sm w-100">
                <i className="bi bi-arrow-right me-1"></i>Manage Staff
              </Link>
            </div>
          </div>
        </div>

        {/* Today's Logins */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Today's Logins</h6>
                  <h3 className="mb-0">
                    {loading.stats || loading.loginHistory ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      stats.today_logins.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      {loading.stats || loading.loginHistory ? (
                        <span className="placeholder col-4 bg-success bg-opacity-25"></span>
                      ) : (
                        `${stats.successful_logins || 0} successful`
                      )}
                    </small>
                    <br />
                    <small className="text-danger">
                      <i className="bi bi-x-circle me-1"></i>
                      {loading.stats || loading.loginHistory ? (
                        <span className="placeholder col-4 bg-danger bg-opacity-25"></span>
                      ) : (
                        `${stats.failed_logins || 0} failed`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-door-open fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <Link to="/admin/login-history" className="btn btn-outline-success btn-sm w-100">
                <i className="bi bi-clock-history me-1"></i>View History
              </Link>
            </div>
          </div>
        </div>

        {/* Departments - FIXED */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Departments</h6>
                  <h3 className="mb-0">
                    {loading.departments ? (
                      <span className="placeholder col-6 bg-info bg-opacity-25"></span>
                    ) : (
                      stats.total_departments.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-layers me-1"></i>
                      {loading.departments ? (
                        <span className="placeholder col-8 bg-info bg-opacity-25"></span>
                      ) : (
                        stats.total_departments === 0 
                          ? "No departments found" 
                          : "Clinical departments & units"
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-building fs-4 text-info"></i>
                  </div>
                </div>
              </div>
              {stats.total_departments === 0 && !loading.departments && (
                <div className="mt-2">
                  <small className="text-warning">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Check API response format
                  </small>
                </div>
              )}
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <Link to="/admin/departments" className="btn btn-outline-info btn-sm w-100">
                <i className="bi bi-gear me-1"></i>Manage
              </Link>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Active Sessions</h6>
                  <h3 className="mb-0">
                    {loading.loginHistory ? (
                      <span className="placeholder col-6 bg-warning bg-opacity-25"></span>
                    ) : (
                      stats.active_sessions.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-warning bg-opacity-25"></span>
                      ) : (
                        `${stats.total_users || 0} total users`
                      )}
                    </small>
                    <br />
                    <small className="text-muted">
                      <i className="bi bi-shield me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-warning bg-opacity-25"></span>
                      ) : (
                        `${stats.admins_count || 0} admins`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-person-check fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <button 
                className="btn btn-outline-warning btn-sm w-100"
                onClick={handleManualRefresh}
                disabled={loading.stats || loading.loginHistory || loading.departments}
              >
                {loading.stats || loading.loginHistory || loading.departments ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh Now
                  </>
                )}
              </button>
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
              Data Status: 
              <span className={`ms-2 badge ${loading.stats || loading.loginHistory || loading.departments ? 'bg-warning' : 'bg-success'}`}>
                {loading.stats || loading.loginHistory || loading.departments ? 'Loading...' : 'Live'}
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

      {/* Rest of the component remains the same... */}
      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Admin Tiles */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 pb-0">
              <h5 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                Administration
              </h5>
              <p className="text-muted mb-0 small">Manage all system components</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {adminTiles.map((tile) => (
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

        {/* Recent Activity Sidebar */}
        <div className="col-xl-4 col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Logins
              </h5>
              <span className="badge bg-primary">
                {loading.loginHistory ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  recentLogins.length
                )}
              </span>
            </div>
            <div className="card-body p-0">
              {loading.loginHistory ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading recent logins...</p>
                </div>
              ) : recentLogins.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-door-open display-6 text-muted"></i>
                  <p className="mt-3 text-muted">No recent login activity</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentLogins.map((log, index) => (
                    <div 
                      key={log.id || index}
                      className="list-group-item list-group-item-action border-0 py-3"
                    >
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0">
                          <div className={`avatar-sm rounded-circle d-flex align-items-center justify-content-center ${
                            log.success ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'
                          }`}>
                            <i className={`bi ${
                              log.success ? 'bi-check-circle' : 'bi-x-circle'
                            } fs-5 ${log.success ? 'text-success' : 'text-danger'}`}></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-0">{log.username || 'Unknown'}</h6>
                              <small className="text-muted">
                                {log.ip_address || 'N/A'}
                                {log.login_type === 'ADMIN' && (
                                  <span className="badge bg-primary ms-2">Admin</span>
                                )}
                                {log.login_type === 'STAFF' && (
                                  <span className="badge bg-info ms-2">Staff</span>
                                )}
                              </small>
                            </div>
                            <div className="text-end">
                              {getLoginStatusBadge(log)}
                              <div className="text-muted small mt-1">
                                {formatTimeAgo(log.timestamp)}
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
              <Link to="/admin/login-history" className="btn btn-outline-primary w-100">
                <i className="bi bi-eye me-1"></i>View All Login History
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
                  <div className="text-muted small">System Status</div>
                  <div className="fw-bold text-success">
                    <i className="bi bi-check-circle-fill me-1"></i>Operational
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Last Updated</div>
                  <div className="fw-bold">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end mt-2 mt-md-0">
                  <div className="text-muted small">Auto Refresh</div>
                  <div className="fw-bold">
                    <i className="bi bi-arrow-clockwise me-1"></i>Every 30s
                  </div>
                </div>
                <div className="col-6 col-md-3 mt-2 mt-md-0">
                  <div className="text-muted small">Data Source</div>
                  <div className="fw-bold">
                    <i className="bi bi-database me-1"></i>Live API
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

export default AdminDashboard;