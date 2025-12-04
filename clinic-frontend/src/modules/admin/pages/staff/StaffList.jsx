// src/modules/admin/pages/staff/StaffList.jsx - FIXED
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    department: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchStaff = async () => {
    setLoading(true);
    setError("");
    try {
      // Build params object - remove undefined/null values
      const params = {};
      
      if (filters.search) params.search = filters.search;
      if (filters.role) params.Role = filters.role;
      if (filters.status) params.Status = filters.status;
      if (filters.department) params.Department = filters.department;
      
      console.log("Fetching staff with params:", params);
      
      const response = await adminApi.getStaff(params);
      console.log("Staff API Response:", response.data);
      
      // Handle different response formats
      let staffData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          staffData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          staffData = response.data.results;
        } else if (Array.isArray(response.data.data)) {
          staffData = response.data.data;
        }
      }
      
      setStaff(staffData);
    } catch (err) {
      setError("Failed to load staff data. Please try again.");
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await adminApi.getDepartments();
      console.log("Departments API Response:", response.data);
      
      let departmentsData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          departmentsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          departmentsData = response.data.results;
        } else if (Array.isArray(response.data.data)) {
          departmentsData = response.data.data;
        }
      }
      
      console.log("Processed departments:", departmentsData);
      setDepartments(departmentsData);
    } catch (err) {
      console.error("Error fetching departments:", err);
      // Don't set error here - it's okay if departments fail
      setDepartments([]);
    }
  };

  const handleDelete = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminApi.deleteStaff(staffId);
      alert("Staff deleted successfully!");
      fetchStaff();
    } catch (err) {
      alert("Failed to delete staff. Please try again.");
      console.error("Error deleting staff:", err);
    }
  };

  const handleCreateAccount = async (staffId, staffName) => {
    if (!window.confirm(`Create user account for ${staffName}?`)) {
      return;
    }

    try {
      const response = await adminApi.createStaffAccount(staffId);
      alert(`Account created successfully! Username: ${response.data.username || 'Created'}`);
      fetchStaff();
    } catch (err) {
      alert("Failed to create account. Please try again.");
      console.error("Error creating account:", err);
    }
  };

  const handleResetPassword = async (staffId, staffName) => {
    if (!window.confirm(`Reset password for ${staffName}?`)) {
      return;
    }

    try {
      const response = await adminApi.resetStaffPassword(staffId);
      const newPassword = response.data.new_password;
      alert(`Password reset successful! New password: ${newPassword || "Please set manually"}`);
    } catch (err) {
      alert("Failed to reset password. Please try again.");
      console.error("Error resetting password:", err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
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
    fetchStaff();
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      role: "",
      status: "",
      department: "",
    });
    fetchStaff();
  };

  const roleOptions = [
    "Admin", "Doctor", "Receptionist", "Lab Technician", "Pharmacist"
  ];

  const statusOptions = [
    "Available", "Busy", "On Leave"
  ];

  return (
    <div className="staff-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Staff Management</h3>
          <p className="text-muted mb-0">
            Manage all staff members including Doctors, Receptionists, and other roles
          </p>
        </div>
        <Link to="/admin/staff/add" className="btn btn-primary">
          <i className="bi bi-person-plus me-2"></i>Add New Staff
        </Link>
      </div>

      {/* Filters Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters & Search</h5>
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Search by Name, Email, or Staff ID</label>
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
              
              <div className="col-6 col-md-2">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  name="role"
                  value={filters.role}
                  onChange={handleFilterChange}
                >
                  <option value="">All Roles</option>
                  {roleOptions.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Status</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  name="department"
                  value={filters.department}
                  onChange={handleFilterChange}
                >
                  <option value="">All Depts</option>
                  {departments.map(dept => (
                    <option key={dept.DEPT_ID} value={dept.DEPT_ID}>
                      {dept.Department_Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2 d-grid gap-2 align-self-end">
                <button type="submit" className="btn btn-primary">
                  Apply Filters
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={clearFilters}
                >
                  Clear All
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Staff Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && (
            <div className="alert alert-danger m-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading staff data...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people display-1 text-muted"></i>
              <h5 className="mt-3">No Staff Found</h5>
              <p className="text-muted">
                {filters.search || filters.role || filters.status || filters.department 
                  ? "No staff match your filters. Try different criteria." 
                  : "No staff members found. Add your first staff member."}
              </p>
              <Link to="/admin/staff/add" className="btn btn-primary mt-2">
                Add New Staff
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th>User Account</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.STAFF_ID}>
                      <td>
                        <span className="badge bg-secondary">#{s.STAFF_ID}</span>
                      </td>
                      <td>
                        <div className="fw-medium">{s.Name}</div>
                        <small className="text-muted">{s.Email}</small>
                      </td>
                      <td>
                        <span className={`badge ${
                          s.Role === 'Doctor' ? 'bg-info' :
                          s.Role === 'Admin' ? 'bg-danger' :
                          s.Role === 'Receptionist' ? 'bg-warning' :
                          'bg-secondary'
                        }`}>
                          {s.Role}
                        </span>
                      </td>
                      <td>
                        {s.department_name || s.Department?.Department_Name || (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          s.Status === 'Available' ? 'bg-success' :
                          s.Status === 'Busy' ? 'bg-warning' :
                          'bg-secondary'
                        }`}>
                          {s.Status}
                        </span>
                      </td>
                      <td>
                        <small>{s.Phone_Number}</small>
                      </td>
                      <td>
                        {s.has_user_account ? (
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i>Yes
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <i className="bi bi-x-circle me-1"></i>No
                          </span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link 
                            to={`/admin/staff/edit/${s.STAFF_ID}`}
                            className="btn btn-outline-primary"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          
                          {!s.has_user_account && s.Role !== 'Admin' && (
                            <button
                              className="btn btn-outline-success"
                              onClick={() => handleCreateAccount(s.STAFF_ID, s.Name)}
                              title="Create User Account"
                            >
                              <i className="bi bi-person-plus"></i>
                            </button>
                          )}
                          
                          {s.has_user_account && (
                            <button
                              className="btn btn-outline-warning"
                              onClick={() => handleResetPassword(s.STAFF_ID, s.Name)}
                              title="Reset Password"
                            >
                              <i className="bi bi-key"></i>
                            </button>
                          )}
                          
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(s.STAFF_ID, s.Name)}
                            title="Delete Staff"
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
        
        {staff.length > 0 && (
          <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Showing {staff.length} staff member{staff.length !== 1 ? 's' : ''}
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={fetchStaff}
                title="Refresh List"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
              <Link to="/admin/staff/add" className="btn btn-primary btn-sm">
                <i className="bi bi-person-plus me-1"></i>Add Another
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffList;