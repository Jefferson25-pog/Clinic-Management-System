// src/modules/admin/pages/staff/StaffList.jsx - COMPLETE FIXED VERSION
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
      // Build query parameters
      const params = {};
      
      if (filters.search) params.search = filters.search;
      if (filters.role) params.Role = filters.role;
      if (filters.status) params.Status = filters.status;
      if (filters.department) params.Department = filters.department;
      if (filters.account_status === 'active') {
        params.account_active = true;
      } else if (filters.account_status === 'inactive') {
        params.account_active = false;
      }
      
      console.log("Fetching staff with params:", params);
      const response = await adminApi.getStaff(params);
      console.log("Staff API response:", response.data);
      
      let staffData = [];
      
      // Handle different response formats
      if (response.data) {
        if (Array.isArray(response.data)) {
          staffData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          staffData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          staffData = response.data.data;
        } else if (response.data.staff && Array.isArray(response.data.staff)) {
          staffData = response.data.staff;
        } else if (response.data && typeof response.data === 'object') {
          // Try to extract array from object
          const possibleArrays = Object.values(response.data).find(val => Array.isArray(val));
          if (possibleArrays) {
            staffData = possibleArrays;
          }
        }
      }
      
      // Process and normalize staff data - CRITICAL FIX HERE
      staffData = staffData.map(staffItem => {
        // Extract staff ID from multiple possible fields
        const staffId = staffItem.STAFF_ID || staffItem.id || staffItem.staff_id;
        
        // Extract name from multiple possible fields
        const name = staffItem.Name || staffItem.name || 
                    `${staffItem.first_name || ''} ${staffItem.last_name || ''}`.trim() || 
                    `Staff #${staffId}`;
        
        // CRITICAL: Check if user account exists
        // Look for user in different possible locations
        let user = null;
        let hasUserAccount = false;
        
        if (staffItem.user) {
          user = staffItem.user;
          hasUserAccount = true;
        } else if (staffItem.user_account_id) {
          hasUserAccount = true;
        } else if (staffItem.has_user_account !== undefined) {
          hasUserAccount = staffItem.has_user_account;
        } else {
          // Check if there's any user field at all
          const userFields = Object.keys(staffItem).filter(key => key.toLowerCase().includes('user'));
          hasUserAccount = userFields.length > 0;
        }
        
        // Determine account active status
        let isAccountActive = false;
        if (user && user.is_active !== undefined) {
          isAccountActive = user.is_active;
        } else if (staffItem.account_active !== undefined) {
          isAccountActive = staffItem.account_active;
        }
        
        console.log(`Processed ${name}: hasUserAccount=${hasUserAccount}, isAccountActive=${isAccountActive}`);
        
        return {
          ...staffItem,
          // Store ID in multiple formats to be safe
          STAFF_ID: staffId,
          id: staffId,
          
          // Store name in multiple formats
          Name: name,
          name: name,
          
          // Normalize other fields
          Role: staffItem.Role || staffItem.role,
          Status: staffItem.Status || staffItem.status,
          Email: staffItem.Email || staffItem.email,
          Phone_Number: staffItem.Phone_Number || staffItem.phone_number || staffItem.phone,
          department_name: staffItem.department_name || staffItem.Department?.Department_Name || staffItem.department?.Department_Name,
          Department: staffItem.Department || staffItem.department,
          
          // Normalize account fields
          user: user,
          has_user_account: hasUserAccount,
          account_active: isAccountActive
        };
      });
      
      // Filter for "no_account" on frontend if needed
      if (filters.account_status === 'no_account') {
        staffData = staffData.filter(staff => !staff.has_user_account);
      }
      
      console.log("Processed staff data:", staffData);
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
        if (Array.isArray(response.data)) {
          departmentsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          departmentsData = response.data.results;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          departmentsData = response.data.data;
        } else if (response.data.departments && Array.isArray(response.data.departments)) {
          departmentsData = response.data.departments;
        } else if (response.data && typeof response.data === 'object') {
          const possibleArrays = Object.values(response.data).find(val => Array.isArray(val));
          if (possibleArrays) {
            departmentsData = possibleArrays;
          }
        }
      }
      
      setDepartments(departmentsData);
    } catch (err) {
      console.error("Error fetching departments:", err);
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

  const handleOpenAddAccountModal = (staff) => {
    setSelectedStaff(staff);
    setShowAddAccountModal(true);
  };

  const handleCloseAddAccountModal = () => {
    setSelectedStaff(null);
    setShowAddAccountModal(false);
  };

  // In StaffList.jsx, update the handleResetPassword function:
  const handleResetPassword = (staff) => {
  // Use the first available ID
  const staffId = staff.STAFF_ID || staff.id || staff.staff_id;
  
  if (!staffId) {
    console.error("No valid staff ID found!", staff);
    alert("Cannot reset password: No valid staff ID found.");
    return;
  }
  
  console.log("Navigating to reset password for staff:", staff.Name, "ID:", staffId);
  
  // FIXED: Use the correct path that matches AppRoutes.jsx
  navigate(`/admin/staff/reset-password/${staffId}`);
  
  // Alternatively, you can also use:
  // window.location.href = `/admin/staff/reset-password/${staffId}`;
};

  const handleToggleAccountStatus = async (staff) => {
    const staffId = staff.STAFF_ID || staff.id || staff.staff_id;
    if (!staffId) {
      alert("Cannot toggle account status: No valid staff ID.");
      return;
    }

    const action = staff.account_active ? "deactivate" : "activate";
    const confirmMessage = staff.account_active
      ? `Deactivate account for ${staff.Name}? They will not be able to login.`
      : `Activate account for ${staff.Name}? They will be able to login.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      if (staff.account_active) {
        await adminApi.deactivateStaffAccount(staffId);
      } else {
        await adminApi.activateStaffAccount(staffId);
      }
      alert(`Account ${action}d successfully!`);
      fetchStaff(); // Refresh list
    } catch (err) {
      alert(`Failed to ${action} account. Please try again.`);
      console.error(`Error ${action}ing account:`, err);
    }
  };

  // Debug function to check staff data
  const debugStaffAccount = (staff) => {
    console.log("=== Staff Account Debug ===");
    console.log("Staff:", staff.Name);
    console.log("ID:", staff.STAFF_ID);
    console.log("has_user_account:", staff.has_user_account);
    console.log("account_active:", staff.account_active);
    console.log("user object:", staff.user);
    console.log("Raw data:", staff);
    console.log("========================");
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
      account_status: "",
    });
    fetchStaff();
  };

  const roleOptions = [
    "Admin", "Doctor", "Receptionist", "Lab Technician", "Pharmacist"
  ];

  const statusOptions = [
    "Available", "Busy", "On Leave"
  ];

  const accountStatusOptions = [
    { value: "", label: "All Accounts" },
    { value: "active", label: "Active Accounts" },
    { value: "inactive", label: "Inactive Accounts" },
    { value: "no_account", label: "No Account" },
  ];

  const getAccountStatusBadge = (staff) => {
    if (!staff.has_user_account) {
      return <span className="badge bg-secondary"><i className="bi bi-person-x me-1"></i>No Account</span>;
    }
    if (staff.account_active) {
      return <span className="badge bg-success"><i className="bi bi-person-check me-1"></i>Active</span>;
    }
    return <span className="badge bg-danger"><i className="bi bi-person-x me-1"></i>Inactive</span>;
  };

  // FIXED: Function to determine which account button to show
  const getAccountButtons = (staff) => {
    const staffId = staff.STAFF_ID || staff.id || staff.staff_id;
    
    if (!staffId) {
      console.error("No valid staff ID for buttons:", staff);
      return null;
    }
    
    // Check if staff has a user account
    const hasUserAccount = staff.has_user_account && staff.user;
    
    console.log(`Staff ${staff.Name}: has_user_account=${staff.has_user_account}, user=${!!staff.user}`);
    
    if (hasUserAccount) {
      return (
        <>
          <button
            className="btn btn-outline-warning btn-sm"
            onClick={() => handleResetPassword(staff)}
            title="Reset User Password"
          >
            <i className="bi bi-key"></i>
          </button>
          <button
            className={`btn btn-sm ${staff.account_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
            onClick={() => handleToggleAccountStatus(staff)}
            title={staff.account_active ? "Deactivate User Account" : "Activate User Account"}
          >
            <i className={`bi ${staff.account_active ? 'bi-person-x' : 'bi-person-check'}`}></i>
          </button>          
        </>
      );
    } else {
      return (
        <button
          className="btn btn-outline-success btn-sm"
          onClick={() => handleOpenAddAccountModal(staff)}
          title="Add User Account"
        >
          <i className="bi bi-person-plus"></i>
        </button>
      );
    }
  };

  return (
    <div className="staff-management">
      <AddAccountModal
        staff={selectedStaff}
        show={showAddAccountModal}
        onClose={handleCloseAddAccountModal}
        onSuccess={fetchStaff}
      />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Staff Management</h3>
          <p className="text-muted mb-0">
            Manage all staff members. Create user accounts or reset passwords as needed.
          </p>
        </div>
        <div className="btn-group">
          <Link to="/admin/staff/add" className="btn btn-primary">
            <i className="bi bi-person-plus me-2"></i>Add New Staff
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Filters & Search</h5>
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
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
                    <option key={dept.DEPT_ID || dept.id} value={dept.DEPT_ID || dept.id}>
                      {dept.Department_Name || dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label">Account Status</label>
                <select
                  className="form-select"
                  name="account_status"
                  value={filters.account_status}
                  onChange={handleFilterChange}
                >
                  {accountStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
                  onClick={fetchStaff}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Refresh
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
              <i className="bi bi-exclamation-triangle me-2"></i>
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
                {filters.search || filters.role || filters.status || filters.department || filters.account_status
                  ? "No staff match your filters. Try different criteria." 
                  : "No staff members found. Add your first staff member."}
              </p>
              <Link to="/admin/staff/add" className="btn btn-primary mt-2">
                <i className="bi bi-person-plus me-1"></i>Add New Staff
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
                    <th>Account Status</th>
                    <th>Contact</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => {
                    const staffId = s.STAFF_ID || s.id || s.staff_id;
                    const staffName = s.Name || s.name;
                    
                    return (
                      <tr key={staffId}>
                        <td>
                          <span className="badge bg-secondary">#{staffId}</span>
                        </td>
                        <td>
                          <div className="fw-medium">{staffName}</div>
                          <small className="text-muted">{s.Email || s.email}</small>
                        </td>
                        <td>
                          <span className={`badge ${
                            s.Role === 'Doctor' ? 'bg-info' :
                            s.Role === 'Admin' ? 'bg-danger' :
                            s.Role === 'Receptionist' ? 'bg-warning' :
                            s.Role === 'Pharmacist' ? 'bg-success' :
                            s.Role === 'Lab Technician' ? 'bg-primary' :
                            'bg-secondary'
                          }`}>
                            {s.Role}
                          </span>
                        </td>
                        <td>
                          {s.department_name || s.Department?.Department_Name || s.department || (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            s.Status === 'Available' ? 'bg-success' :
                            s.Status === 'Busy' ? 'bg-warning' :
                            'bg-secondary'
                          }`}>
                            {s.Status || s.status}
                          </span>
                        </td>
                        <td>
                          {getAccountStatusBadge(s)}
                        </td>
                        <td>
                          <small>{s.Phone_Number || s.phone}</small>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm" style={{ gap: '5px' }}>
                            <Link 
                              to={`/admin/staff/edit/${staffId}`}
                              className="btn btn-outline-primary"
                              title="Edit Staff Details"
                            >
                              <i className="bi bi-pencil"></i>
                            </Link>
                            
                            {/* Dynamic Account Buttons */}
                            {getAccountButtons(s)}
                            
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(staffId, staffName)}
                              title="Delete Staff"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {staff.length > 0 && (
          <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              Showing {staff.length} staff member{staff.length !== 1 ? 's' : ''}
              {staff.some(s => s.has_user_account) && (
                <span className="ms-2">
                  ({staff.filter(s => s.has_user_account).length} with user accounts)
                </span>
              )}
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