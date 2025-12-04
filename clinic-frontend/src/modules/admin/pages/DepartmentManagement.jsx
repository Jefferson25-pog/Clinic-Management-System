// src/modules/admin/pages/DepartmentManagement.jsx
import React, { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi.js";

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await adminApi.getDepartments(params);
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDepartments();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Department Management</h4>
          <p className="text-muted mb-0">
            Manage clinical departments used across the system.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          + Add Department
        </button>
      </div>

      <form className="row g-2 mb-3" onSubmit={handleSearch}>
        <div className="col-12 col-md-4">
          <label className="form-label">Search Departments</label>
          <input
            className="form-control"
            placeholder="Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-2 d-grid align-items-end">
          <button className="btn btn-outline-secondary" type="submit">
            Search
          </button>
        </div>
      </form>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Dept ID</th>
                  <th>Department Name</th>
                  <th>Staff Count</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      No departments found.
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.DEPT_ID}>
                      <td>{d.DEPT_ID}</td>
                      <td>{d.Department_Name}</td>
                      <td>{d.staff_count ?? "-"}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => setEditing(d)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => {
                              // call delete API
                            }}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div className="mt-3 alert alert-info">
          <strong>Form Placeholder:</strong> implement create / edit department form here.
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
