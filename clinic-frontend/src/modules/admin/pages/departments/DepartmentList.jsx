// src/modules/admin/pages/departments/DepartmentList.jsx - FIXED
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const DepartmentList = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        }
      }
      
      setDepartments(departmentsData);
    } catch (err) {
      setError("Failed to load departments. Please try again.");
      console.error("Error fetching departments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deptId, deptName) => {
    if (!window.confirm(`Delete department "${deptName}"?\n\nThis will also remove it from all doctors.`)) {
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

  return (
    <div className="department-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Department Management</h3>
          <p className="text-muted mb-0">
            Manage clinical departments for doctor assignments
          </p>
        </div>
        <Link to="/admin/departments/add" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>Add New Department
        </Link>
      </div>

      {/* Search Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Search departments by name..."
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
                Clear
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
              <p className="text-muted">Create your first department to get started</p>
              <Link to="/admin/departments/add" className="btn btn-primary mt-2">
                Add First Department
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Dept ID</th>
                    <th>Department Name</th>
                    <th>Doctor Count</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.DEPT_ID}>
                      <td>
                        <span className="badge bg-secondary">#{dept.DEPT_ID}</span>
                      </td>
                      <td>
                        <div className="fw-medium">{dept.Department_Name}</div>
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {dept.doctor_count || 0} doctor{dept.doctor_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : 'N/A'}
                        </small>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link 
                            to={`/admin/departments/edit/${dept.DEPT_ID}`}
                            className="btn btn-outline-primary"
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(dept.DEPT_ID, dept.Department_Name)}
                            title="Delete Department"
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
        
        {departments.length > 0 && (
          <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              {departments.length} department{departments.length !== 1 ? 's' : ''}
            </div>
            <Link to="/admin/departments/add" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-circle me-1"></i>Add Another
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentList;