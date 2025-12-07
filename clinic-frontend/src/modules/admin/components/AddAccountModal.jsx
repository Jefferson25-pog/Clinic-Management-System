// src/modules/admin/components/AddAccountModal.jsx - FIXED FOR STAFF LINKING
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../services/adminApi.js";

const AddAccountModal = ({ staff, show, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (show && staff) {
      resetForm();
      fetchAvailableUsers();
    }
  }, [show, staff]);

  const resetForm = () => {
    setError("");
    setSuccess("");
    setLoading(false);
    setSelectedUserId("");
    setAvailableUsers([]);
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await adminApi.getAvailableUsers();
      
      if (response.data && response.data.success) {
        setAvailableUsers(response.data.users || []);
      } else {
        setAvailableUsers([]);
      }
    } catch (err) {
      console.error("Error fetching available users:", err);
      setAvailableUsers([]);
    }
  };

  const handleLinkAccount = async () => {
  if (!selectedUserId) {
    setError("Please select a user to link");
    return;
  }

  setLoading(true);
  setError("");
  
  try {
    // 1. Link staff to user
    const linkResponse = await adminApi.linkStaffToUser(staff.STAFF_ID, selectedUserId);
    
    if (linkResponse.data && linkResponse.data.success) {
      // 2. AUTO-SYNC: Sync user role to match staff role
      try {
        const syncResponse = await adminApi.syncUserRole(selectedUserId);
        
        if (syncResponse.data && syncResponse.data.success) {
          setSuccess(`Staff ${staff.Name} linked to user account successfully! Role synced to ${staff.Role}.`);
        } else {
          setSuccess(`Staff ${staff.Name} linked successfully, but role sync failed. Please sync manually.`);
        }
      } catch (syncError) {
        console.error("Role sync error:", syncError);
        setSuccess(`Staff ${staff.Name} linked successfully, but role sync failed. Please sync manually.`);
      }
      
      setTimeout(() => {
        if (onSuccess) onSuccess(linkResponse.data);
        onClose();
      }, 1500);
    } else {
      setError(linkResponse.data?.error || "Failed to link account");
    }
    
  } catch (err) {
    console.error("Error linking account:", err);
    setError(err.response?.data?.error || err.response?.data?.message || "Failed to link account. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const handleCreateAccount = () => {
    navigate('/admin/users/create');
  };

  if (!show || !staff) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-gear me-2"></i>
              Add User Account for {staff.Name}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <div className="modal-body">
            {/* Staff Info */}
            <div className="alert alert-info mb-4">
              <div className="row">
                <div className="col-md-3">
                  <strong>Staff ID:</strong><br />
                  <span className="badge bg-secondary">#{staff.STAFF_ID}</span>
                </div>
                <div className="col-md-3">
                  <strong>Role:</strong><br />
                  <span className="badge bg-primary">{staff.Role}</span>
                </div>
                <div className="col-md-6">
                  <strong>Email:</strong><br />
                  {staff.Email}
                </div>
              </div>
            </div>

            {/* Success/Error Messages */}
            {success && (
              <div className="alert alert-success alert-dismissible fade show">
                <i className="bi bi-check-circle me-2"></i>
                {success}
                <button type="button" className="btn-close" onClick={() => setSuccess("")}></button>
              </div>
            )}

            {error && (
              <div className="alert alert-danger alert-dismissible fade show">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
                <button type="button" className="btn-close" onClick={() => setError("")}></button>
              </div>
            )}

            {/* User Selection */}
            <div className="mb-3">
              <label className="form-label">Select User to Link *</label>
              {availableUsers.length === 0 ? (
                <div className="alert alert-warning">
                  <i className="bi bi-info-circle me-2"></i>
                  No available users found. Please create a new user account first.
                  <div className="mt-2">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handleCreateAccount}
                    >
                      <i className="bi bi-person-plus me-1"></i>
                      Create New User
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} 
                      {user.custom_user_id && ` (ID: ${user.custom_user_id})`}
                      {user.email && ` - ${user.email}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {selectedUserId && (
              <div className="mt-3 alert alert-light border">
                <strong>Selected User:</strong><br />
                {availableUsers.find(u => u.id === parseInt(selectedUserId))?.username}
                {availableUsers.find(u => u.id === parseInt(selectedUserId))?.custom_user_id && 
                  ` (ID: ${availableUsers.find(u => u.id === parseInt(selectedUserId))?.custom_user_id})`
                }
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLinkAccount}
              disabled={loading || !selectedUserId}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Linking...
                </>
              ) : (
                <>
                  <i className="bi bi-link-45deg me-2"></i>
                  Link Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;