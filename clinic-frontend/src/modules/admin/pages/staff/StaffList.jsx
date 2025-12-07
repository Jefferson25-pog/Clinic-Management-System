// src/modules/admin/pages/staff/StaffList.jsx - COMPLETE FIXED
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";
import AddAccountModal from "../../components/AddAccountModal.jsx";

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    department: "",
    account_status: "",
    gender: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const navigate = useNavigate();

  const fetchStaff = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      if (filters.department) params.department = filters.department;
      if (filters.gender) params.gender = filters.gender;
      if (filters.account_status === 'active') params.account_active = true;
      else if (filters.account_status === 'inactive') params.account_active = false;

      const response = await adminApi.getStaff(params);
      
      let staffData = [];
      if (response.data) {
        if (Array.isArray(response.data)) staffData = response.data;
        else if (response.data.results) staffData = response.data.results;
        else if (response.data.data) staffData = response.data.data;
      }
      
      // Filter for "no_account" on frontend
      if (filters.account_status === 'no_account') {
        staffData = staffData.filter(staff => !staff.user);
      }
      
      setStaff(staffData);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setError("Failed to load staff data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await adminApi.getDepartments();
      let departmentsData = [];
      if (response.data) {
        if (Array.isArray(response.data)) departmentsData = response.data;
        else if (response.data.results) departmentsData = response.data.results;
      }
      setDepartments(departmentsData);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStaff();
  };

  const clearFilters = () => {
    setFilters({
      search: "", role: "", status: "", department: "", 
      account_status: "", gender: "", qualification: ""
    });
    fetchStaff();
  };

  // Handle Add Account
  const handleAddAccount = (staff) => {
    setSelectedStaff(staff);
    setShowAddAccountModal(true);
  };

  // Handle Reset Password
  const handleResetPassword = (staff) => {
    if (!staff.user) {
      alert("This staff member doesn't have a linked user account.");
      return;
    }
    
    navigate(`/admin/reset-password/staff/${staff.STAFF_ID}`, {
      state: {
        type: 'staff',
        staff: staff,
        staffName: staff.Name,
        staffId: staff.STAFF_ID,
        username: staff.user?.username,
        email: staff.Email
      }
    });
  };

  const getAccountStatusBadge = (staff) => {
    if (!staff.user) return <span className="badge bg-secondary">No Account</span>;
    if (staff.account_active) return <span className="badge bg-success">Active</span>;
    return <span className="badge bg-danger">Inactive</span>;
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'Doctor': return 'bg-info';
      case 'Admin': return 'bg-danger';
      case 'Receptionist': return 'bg-warning';
      case 'Pharmacist': return 'bg-success';
      case 'Lab Technician': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'Available': return 'bg-success';
      case 'Busy': return 'bg-warning';
      case 'On Leave': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="staff-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Staff Management</h3>
          <p className="text-muted mb-0">Manage all staff members in the system</p>
        </div>
        <Link to="/admin/staff/add" className="btn btn-primary">
          <i className="bi bi-person-plus me-2"></i>Add New Staff
        </Link>
      </div>

      {/* Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3"><i className="bi bi-funnel me-2"></i>Quick Filters</h5>
          <form onSubmit={handleSearch}>
            <div className="row g-2">
              <div className="col-md-3">
                <input type="text" className="form-control" placeholder="Search name, ID, email..." 
                  name="search" value={filters.search} onChange={handleFilterChange} />
              </div>
              <div className="col-md-2">
                <select className="form-select" name="role" value={filters.role} onChange={handleFilterChange}>
                  <option value="">All Roles</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Admin">Admin</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Lab Technician">Lab Technician</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" name="account_status" value={filters.account_status} onChange={handleFilterChange}>
                  <option value="">All Accounts</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="no_account">No Account</option>
                </select>
              </div>
              <div className="col-md-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary">Apply Filters</button>
                <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>Clear</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Total Staff</h6>
              <h3>{staff.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Doctors</h6>
              <h3 className="text-info">{staff.filter(s => s.Role === 'Doctor').length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">Active Accounts</h6>
              <h3 className="text-success">{staff.filter(s => s.account_active).length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-light">
            <div className="card-body text-center">
              <h6 className="text-muted">No Account</h6>
              <h3 className="text-warning">{staff.filter(s => !s.user).length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error}</div>}
          
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="mt-3">Loading staff data...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people display-1 text-muted"></i>
              <h5 className="mt-3">No Staff Found</h5>
              <p className="text-muted">No staff members match your criteria</p>
              <Link to="/admin/staff/add" className="btn btn-primary">Add New Staff</Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Account</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.STAFF_ID || s.id}>
                      <td><span className="badge bg-secondary">#{s.STAFF_ID || s.id}</span></td>
                      <td>
                        <div className="fw-medium">{s.Name || s.name}</div>
                        <small className="text-muted">{s.Gender} • {s.Age}yrs</small>
                      </td>
                      <td><span className={`badge ${getRoleBadgeColor(s.Role)}`}>{s.Role}</span></td>
                      <td>{s.Department?.Department_Name || s.department_name || '-'}</td>
                      <td>{s.Phone_Number || 'N/A'}</td>
                      <td><small>{s.Email || 'N/A'}</small></td>
                      <td><span className={`badge ${getStatusBadgeColor(s.Status)}`}>{s.Status}</span></td>
                      <td>{getAccountStatusBadge(s)}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/admin/staff/view/${s.STAFF_ID || s.id}`} 
                            className="btn btn-outline-info" title="View Full Details">
                            <i className="bi bi-eye"></i>
                          </Link>
                          <Link to={`/admin/staff/edit/${s.STAFF_ID || s.id}`} 
                            className="btn btn-outline-primary" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                          
                          {/* Add Account Button */}
                          {!s.user && (
                            <button
                              className="btn btn-outline-success"
                              onClick={() => handleAddAccount(s)}
                              title="Add User Account"
                            >
                              <i className="bi bi-person-add"></i>
                            </button>
                          )}
                          
                          {/* Reset Password Button */}
                          {s.user && s.account_active && (
                            <button
                              className="btn btn-outline-warning"
                              onClick={() => handleResetPassword(s)}
                              title="Reset Password"
                            >
                              <i className="bi bi-key"></i>
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

      {/* Add Account Modal */}
      {showAddAccountModal && selectedStaff && (
        <AddAccountModal
          staff={selectedStaff}
          show={showAddAccountModal}
          onClose={() => {
            setShowAddAccountModal(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            fetchStaff();
            setShowAddAccountModal(false);
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
};

export default StaffList;