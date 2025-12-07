// src/modules/admin/pages/CredentialsManagement.jsx - COMPLETE FIXED
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../services/adminApi.js";
import AddAccountModal from "../components/AddAccountModal.jsx";

const CredentialsManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    account_status: "",
  });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      
      const response = await adminApi.getUsers(params);
      
      let usersData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          usersData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          usersData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          usersData = response.data.data;
        } else if (response.data.users && Array.isArray(response.data.users)) {
          usersData = response.data.users;
        }
      }
      
      // Filter by account status if needed
      if (filters.account_status === 'linked') {
        usersData = usersData.filter(user => 
          user.has_staff_account || 
          (user.profile && user.profile.staff_detail)
        );
      } else if (filters.account_status === 'unlinked') {
        usersData = usersData.filter(user => 
          !user.has_staff_account && 
          !(user.profile && user.profile.staff_detail)
        );
      }
      
      // Process users to extract staff information
      usersData = usersData.map(user => {
        let staffName = null;
        let staffId = null;
        let staffRole = null;
        
        if (user.profile && user.profile.staff_detail) {
          staffName = user.profile.staff_detail.Name || 
                     user.profile.staff_detail.name;
          staffId = user.profile.staff_detail.STAFF_ID || 
                   user.profile.staff_detail.id || 
                   user.profile.staff_detail.staff_id;
          staffRole = user.profile.staff_detail.Role || 
                     user.profile.staff_detail.role;
        }
        else if (user.staff_detail) {
          staffName = user.staff_detail.Name || 
                     user.staff_detail.name;
          staffId = user.staff_detail.STAFF_ID || 
                   user.staff_detail.id || 
                   user.staff_detail.staff_id;
          staffRole = user.staff_detail.Role || 
                     user.staff_detail.role;
        }
        
        return {
          ...user,
          staff_name: staffName,
          staff_id: staffId,
          staff_role: staffRole,
          has_staff_link: !!staffName
        };
      });
      
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load user credentials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      role: "",
      account_status: "",
    });
    fetchUsers();
  };

  // Function to handle reset password navigation
  const handleResetPassword = (user) => {
    const isStaffLinked = user.has_staff_link || 
                         (user.profile && user.profile.staff_detail);
    
    if (isStaffLinked) {
      // User is linked to staff
      const staffId = user.staff_id;
      if (staffId) {
        navigate(`/admin/reset-password/staff/${staffId}`, {
          state: { 
            type: 'staff',
            user: user,
            staffName: user.staff_name,
            staffId: staffId,
            username: user.username
          }
        });
      } else {
        alert("Cannot reset password: No staff ID found.");
      }
    } else {
      // Standalone user
      const userId = user.id;
      if (userId) {
        navigate(`/admin/reset-password/user/${userId}`, {
          state: { 
            type: 'user',
            user: user,
            username: user.username
          }
        });
      } else {
        alert("Cannot reset password: No user ID found.");
      }
    }
  };

  const handleUserCreated = (newUser) => {
    fetchUsers();
  };

  const getStaffNameDisplay = (user) => {
    if (user.staff_name) {
      return (
        <div>
          <div className="fw-medium">{user.staff_name}</div>
          {user.staff_role && (
            <small className="text-muted">{user.staff_role}</small>
          )}
          {user.staff_id && (
            <small className="text-muted ms-2">Staff ID: #{user.staff_id}</small>
          )}
        </div>
      );
    }
    return <span className="text-muted">-</span>;
  };

  const getRoleBadge = (role) => {
    const badgeClasses = {
      'Super Admin': 'bg-danger',
      'Admin': 'bg-warning',
      'Doctor': 'bg-info',
      'Receptionist': 'bg-success',
      'Pharmacist': 'bg-primary',
      'Lab Technician': 'bg-purple',
      'default': 'bg-secondary'
    };
    
    return badgeClasses[role] || badgeClasses.default;
  };

  const getAccountStatusBadge = (user) => {
    if (user.is_active === false) {
      return <span className="badge bg-danger">Inactive</span>;
    }
    
    if (user.has_staff_link || (user.profile && user.profile.staff_detail)) {
      return <span className="badge bg-success">Linked to Staff</span>;
    }
    
    return <span className="badge bg-secondary">Standalone</span>;
  };

  return (
    <div className="credentials-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">User Credentials Management</h3>
          <p className="text-muted mb-0">
            Manage all user accounts, reset passwords, and view account status.
          </p>
        </div>
        <div className="btn-group">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admin/users/create')}
          >
            <i className="bi bi-person-plus me-2"></i>Create New User
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters & Search</h5>
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">Search by Username, Email, or Name</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search..."
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
              
              <div className="col-6 col-md-3">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  name="role"
                  value={filters.role}
                  onChange={handleFilterChange}
                >
                  <option value="">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Lab Technician">Lab Technician</option>
                  <option value="Staff">Staff</option>
                  <option value="User">User</option>
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">Account Type</label>
                <select
                  className="form-select"
                  name="account_status"
                  value={filters.account_status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Accounts</option>
                  <option value="linked">Linked to Staff</option>
                  <option value="unlinked">Standalone Users</option>
                </select>
              </div>

              <div className="col-12 d-flex gap-2 mt-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-funnel me-1"></i>Apply Filters
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={clearFilters}
                >
                  <i className="bi bi-x-circle me-1"></i>Clear All
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-info"
                  onClick={fetchUsers}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Refresh
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && (
            <div className="alert alert-danger m-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading user credentials...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people display-1 text-muted"></i>
              <h5 className="mt-3">No Users Found</h5>
              <p className="text-muted">
                {filters.search || filters.role || filters.account_status
                  ? "No users match your filters. Try different criteria." 
                  : "No users found."}
              </p>
              <button 
                className="btn btn-primary mt-2"
                onClick={() => navigate('/admin/users/create')}
              >
                <i className="bi bi-person-plus me-1"></i>Create New User
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Username</th>
                    <th>Staff Name</th>
                    <th>Email</th>
                    <th>User Role</th>
                    <th>Account Status</th>
                    <th>Staff Link</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="fw-medium">{user.username}</div>
                        <small className="text-muted">User ID: #{user.id}</small>
                      </td>
                      <td>{getStaffNameDisplay(user)}</td>
                      <td>{user.email || <span className="text-muted">-</span>}</td>
                      <td>
                        <span className={`badge ${getRoleBadge(user.role)}`}>
                          {user.role || 'User'}
                        </span>
                      </td>
                      <td>
                        {getAccountStatusBadge(user)}
                        {user.is_superuser && (
                          <span className="badge bg-dark ms-1">Superuser</span>
                        )}
                      </td>
                      <td>
                        {user.has_staff_link ? (
                          <span className="badge bg-success">
                            <i className="bi bi-link-45deg me-1"></i>
                            Linked
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            <i className="bi bi-unlink me-1"></i>
                            Not Linked
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm" style={{ gap: '5px' }}>
                          {/* Reset Password Button */}
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleResetPassword(user)}
                            title="Reset Password"
                          >
                            <i className="bi bi-key"></i> 
                          </button>
                          
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              if (window.confirm(`Delete user ${user.username}?`)) {
                                // TODO: Implement delete functionality
                                alert("Delete functionality to be implemented");
                              }
                            }}
                            title="Delete User"
                          >
                            <i className="bi bi-trash"></i>
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
        
        {users.length > 0 && (
          <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              Showing {users.length} user{users.length !== 1 ? 's' : ''}
              ({users.filter(u => u.has_staff_link).length} linked to staff)
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={fetchUsers}
                title="Refresh List"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CredentialsManagement;