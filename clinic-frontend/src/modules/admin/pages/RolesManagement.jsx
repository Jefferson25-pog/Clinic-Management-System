// src/modules/admin/pages/RolesManagement.jsx - UPDATED WITH BACK BUTTON
import React, { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi.js";
import { Link } from "react-router-dom";

const RolesManagement = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState(null);
  const [error, setError] = useState("");

  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getGroups();
      setGroups(response.data.results || response.data);
    } catch (err) {
      setError("Failed to load groups. Please try again.");
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    try {
      await adminApi.createGroup({ name: newGroupName });
      setNewGroupName("");
      fetchGroups();
    } catch (err) {
      alert("Failed to create group");
      console.error("Error creating group:", err);
    }
  };

  const handleUpdateGroup = async (groupId, newName) => {
    try {
      await adminApi.updateGroup(groupId, { name: newName });
      setEditingGroup(null);
      fetchGroups();
    } catch (err) {
      alert("Failed to update group");
      console.error("Error updating group:", err);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"?\n\nThis will remove all users from this group.`)) {
      return;
    }

    try {
      await adminApi.deleteGroup(groupId);
      fetchGroups();
    } catch (err) {
      alert("Failed to delete group");
      console.error("Error deleting group:", err);
    }
  };

  return (
    <div className="roles-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center mb-2">
            <Link to="/admin" className="btn btn-outline-secondary btn-sm me-2">
              <i className="bi bi-arrow-left"></i>
            </Link>
            <h3 className="mb-0">Roles & Groups Management</h3>
          </div>
          <p className="text-muted mb-0">
            Manage user roles and permission groups
          </p>
        </div>
        <Link to="/admin/credentials" className="btn btn-outline-primary">
          <i className="bi bi-people me-1"></i>
          Credentials
        </Link>
      </div>

      {/* Create New Group Form */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-plus-circle me-2"></i>
            Create New Role Group
          </h5>
          <form onSubmit={handleCreateGroup}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Enter new group name (e.g., 'Senior Doctor', 'Lab Supervisor')"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-1"></i>Create Group
              </button>
            </div>
            <div className="form-text mt-2">
              Groups define permissions for users. Built-in groups: Admin, Doctor, Receptionist, Pharmacist, Lab Technician
            </div>
          </form>
        </div>
      </div>

      {/* Groups List */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0">
          <h5 className="mb-0">
            <i className="bi bi-people me-2"></i>
            Role Groups ({groups.length})
          </h5>
        </div>
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
              <p className="mt-3">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people display-1 text-muted"></i>
              <h5 className="mt-3">No Groups Found</h5>
              <p className="text-muted">Create your first group above</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Group ID</th>
                    <th>Group Name</th>
                    <th>User Count</th>
                    <th>Permissions</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id}>
                      <td>
                        <span className="badge bg-secondary">#{group.id}</span>
                      </td>
                      <td>
                        {editingGroup === group.id ? (
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control"
                              defaultValue={group.name}
                              onBlur={(e) => handleUpdateGroup(group.id, e.target.value)}
                              autoFocus
                            />
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => setEditingGroup(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="fw-medium">{group.name}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {group.user_count || 0} user{group.user_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {group.permissions?.join(', ') || 'Default permissions'}
                        </small>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => setEditingGroup(group.id)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteGroup(group.id, group.name)}
                            disabled={['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Lab Technician'].includes(group.name)}
                            title={['Admin', 'Doctor', 'Receptionist', 'Pharmacist', 'Lab Technician'].includes(group.name) ? "System groups cannot be deleted" : "Delete group"}
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
        <div className="card-footer bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div className="text-muted small">
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchGroups}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Permissions Guide */}
      <div className="card shadow-sm border-info mt-4">
        <div className="card-body">
          <h5 className="card-title text-info">
            <i className="bi bi-info-circle me-2"></i>
            About Role Groups
          </h5>
          <div className="row">
            <div className="col-md-6">
              <h6>Built-in Groups:</h6>
              <ul className="small mb-0">
                <li><strong>Admin:</strong> Full system access, staff management</li>
                <li><strong>Doctor:</strong> Patient management, prescriptions</li>
                <li><strong>Receptionist:</strong> Patient registration, appointments</li>
                <li><strong>Pharmacist:</strong> Medicine dispensing, inventory</li>
                <li><strong>Lab Technician:</strong> Lab tests, results management</li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6>Custom Groups:</h6>
              <ul className="small mb-0">
                <li>Create custom groups for specific permission sets</li>
                <li>Assign multiple users to a group</li>
                <li>Edit group permissions as needed</li>
                <li>System groups cannot be deleted</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesManagement;