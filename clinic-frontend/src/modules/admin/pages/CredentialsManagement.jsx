// src/modules/admin/pages/CredentialsManagement.jsx - UPDATED WITH BACK BUTTON
import React, { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi.js";
import { useNavigate, Link } from "react-router-dom";

const CredentialsManagement = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "User",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      const data = res.data.results || res.data || [];
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createUser(form);
      setForm({ username: "", email: "", password: "", role: "User" });
      fetchUsers();
    } catch (err) {
      console.error("Failed to create user", err);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center mb-2">
            <Link to="/admin" className="btn btn-outline-secondary btn-sm me-2">
              <i className="bi bi-arrow-left"></i>
            </Link>
            <h4 className="mb-0">Credentials Management</h4>
          </div>
          <p className="text-muted mb-0">
            Create user accounts and manage login credentials.
          </p>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate("/admin/change-password")}
        >
          <i className="bi bi-key me-1"></i>Change My Password
        </button>
      </div>

      <form className="card mb-4 shadow-sm border-0" onSubmit={handleCreate}>
        <div className="card-body">
          <h6 className="mb-3">
            <i className="bi bi-person-plus me-2"></i>
            Create New Login Credentials
          </h6>
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label">Username *</label>
              <input
                className="form-control"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="Enter username"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Enter email"
              />
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-control"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
                minLength="8"
              />
              <div className="form-text">Minimum 8 characters</div>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="Doctor">Doctor</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Lab Technician">Lab Technician</option>
                <option value="Pharmacist">Pharmacist</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-primary" type="submit">
              <i className="bi bi-person-plus me-1"></i>
              Create User Account
            </button>
            <button 
              type="button" 
              className="btn btn-outline-secondary ms-2"
              onClick={() => navigate("/admin/staff")}
            >
              <i className="bi bi-people me-1"></i>
              Go to Staff Management
            </button>
          </div>
        </div>
      </form>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0">
          <h5 className="mb-0">
            <i className="bi bi-people me-2"></i>
            User Accounts ({users.length})
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Staff Account</th>
                  <th>Is Staff</th>
                  <th>Is Superuser</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      <i className="bi bi-people display-6"></i>
                      <p className="mt-2">No user accounts found.</p>
                      <button className="btn btn-sm btn-outline-primary" onClick={fetchUsers}>
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Refresh
                      </button>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="badge bg-secondary">#{u.id}</span>
                      </td>
                      <td>
                        <strong>{u.username}</strong>
                        <div className="small text-muted">
                          Joined: {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === 'Admin' ? 'bg-danger' :
                          u.role === 'Doctor' ? 'bg-info' :
                          u.role === 'Receptionist' ? 'bg-warning' :
                          'bg-secondary'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.staff_detail ? (
                          <span className="badge bg-success">
                            <i className="bi bi-link-45deg me-1"></i>
                            Linked
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <i className="bi bi-unlink me-1"></i>
                            Not Linked
                          </span>
                        )}
                      </td>
                      <td>
                        {u.is_staff ? (
                          <span className="badge bg-success">Yes</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                      <td>
                        {u.is_superuser ? (
                          <span className="badge bg-danger">Yes</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-outline-warning" title="Reset Password">
                            <i className="bi bi-key"></i>
                          </button>
                          <button className="btn btn-outline-danger" title="Delete">
                            <i className="bi bi-trash"></i>
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
        <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div className="text-muted small">
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
          <div>
            <button className="btn btn-outline-secondary btn-sm" onClick={fetchUsers}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialsManagement;