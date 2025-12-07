// src/modules/admin/pages/departments/DepartmentList.jsx - COMPLETE FIXED
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total_departments: 0,
    departments_with_staff: 0,
    total_staff: 0,
    total_doctors: 0
  });

  const fetchDepartments = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search) params.search = search;
      
      const response = await adminApi.getDepartments(params);
      console.log("Departments API response:", response.data);
      
      let departmentsData = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          departmentsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          departmentsData = response.data.results;
        } else if (Array.isArray(response.data.data)) {
          departmentsData = response.data.data;
        } else if (response.data.departments && Array.isArray(response.data.departments)) {
          departmentsData = response.data.departments;
        }
      }
      
      // Calculate statistics
      const totalDepartments = departmentsData.length;
      let departmentsWithStaff = 0;
      let totalStaff = 0;
      let totalDoctors = 0;
      
      departmentsData.forEach(dept => {
        const staffCount = dept.staff_count || 0;
        const doctorCount = dept.doctor_count || 0;
        
        if (staffCount > 0) {
          departmentsWithStaff++;
        }
        
        totalStaff += staffCount;
        totalDoctors += doctorCount;
      });
      
      setStats({
        total_departments: totalDepartments,
        departments_with_staff: departmentsWithStaff,
        total_staff: totalStaff,
        total_doctors: totalDoctors
      });
      
      setDepartments(departmentsData);
    } catch (err) {
      setError("Failed to load departments. Please try again.");
      console.error("Error fetching departments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deptId, deptName) => {
    if (!window.confirm(`Delete department "${deptName}"?\n\nThis will remove it from all staff members assigned to it.`)) {
      return;
    }

    try {
      await adminApi.deleteDepartment(deptId);
      alert("Department deleted successfully!");
      fetchDepartments();
    } catch (err) {
      alert("Failed to delete department. It may be assigned to doctors.");
      console.error("Error deleting department:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDepartments();
  };

  const clearSearch = () => {
    setSearch("");
    fetchDepartments();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="department-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Department Management</h3>
          <p className="text-muted mb-0">
            Manage clinical departments and assign staff members
          </p>
        </div>
        <Link to="/admin/departments/add" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>Add New Department
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body py-3">
              <div className="row text-center">
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Total Departments</div>
                  <div className="fw-bold h4 mb-0">{stats.total_departments}</div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">With Staff</div>
                  <div className="fw-bold h4 mb-0 text-success">{stats.departments_with_staff}</div>
                </div>
                <div className="col-6 col-md-3 border-end mt-2 mt-md-0">
                  <div className="text-muted small">Total Staff</div>
                  <div className="fw-bold h4 mb-0 text-info">{stats.total_staff}</div>
                </div>
                <div className="col-6 col-md-3 mt-2 mt-md-0">
                  <div className="text-muted small">Total Doctors</div>
                  <div className="fw-bold h4 mb-0 text-primary">{stats.total_doctors}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Search departments by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-search"></i> Search
              </button>
              <button 
                type="button" 
                className="btn btn-outline-secondary"
                onClick={clearSearch}
              >
                <i className="bi bi-x-lg"></i> Clear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Departments Table Card */}
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
              <p className="mt-3">Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-hospital display-1 text-muted"></i>
              <h5 className="mt-3">No Departments Found</h5>
              <p className="text-muted">
                {search ? "No departments match your search. Try different keywords." : "Create your first department to get started"}
              </p>
              <Link to="/admin/departments/add" className="btn btn-primary mt-2">
                <i className="bi bi-plus-circle me-1"></i>Add First Department
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Dept ID</th>
                    <th>Department Name</th>
                    <th>Description</th>
                    <th>Staff Count</th>
                    <th>Doctors</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => {
                    const staffCount = dept.staff_count || 0;
                    const doctorCount = dept.doctor_count || 0;
                    
                    return (
                      <tr key={dept.DEPT_ID}>
                        <td>
                          <span className="badge bg-secondary">{dept.DEPT_ID}</span>
                        </td>
                        <td>
                          <div className="fw-medium">{dept.Department_Name}</div>
                        </td>
                        <td>
                          <small className="text-muted text-truncate d-inline-block" style={{maxWidth: '200px'}} title={dept.Description}>
                            {dept.Description || 'No description'}
                          </small>
                        </td>
                        <td>
                          <span className={`badge ${staffCount > 0 ? 'bg-info' : 'bg-secondary'}`}>
                            {staffCount} staff
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-success">
                            {doctorCount} doctor{doctorCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDate(dept.created_at)}
                          </small>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <Link 
                              to={`/admin/departments/edit/${dept.DEPT_ID}`}
                              className="btn btn-outline-primary"
                              title="Edit Department"
                            >
                              <i className="bi bi-pencil"></i>
                            </Link>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(dept.DEPT_ID, dept.Department_Name)}
                              title="Delete Department"
                              disabled={staffCount > 0}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                          {staffCount > 0 && (
                            <small className="d-block text-warning mt-1">
                              <i className="bi bi-exclamation-triangle"></i> Has staff assigned
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {departments.length > 0 && (
          <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <i className="bi bi-info-circle me-1"></i>
              {departments.length} department{departments.length !== 1 ? 's' : ''}
              <span className="ms-2">
                ({stats.departments_with_staff} with staff, {stats.total_staff} total staff)
              </span>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={fetchDepartments}
                title="Refresh List"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
              <Link to="/admin/departments/add" className="btn btn-primary btn-sm">
                <i className="bi bi-plus-circle me-1"></i>Add Department
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentList;