// src/modules/admin/pages/staff/StaffDelete.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const StaffDelete = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [staffData, setStaffData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStaffData();
  }, [id]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStaffById(id);
      setStaffData(response.data);
    } catch (err) {
      setError("Failed to load staff data");
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${staffData.Name}?\n\nThis action cannot be undone!`)) {
      return;
    }

    setDeleting(true);
    try {
      await adminApi.deleteStaff(id);
      alert("Staff member deleted successfully!");
      navigate("/admin/staff");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete staff");
      console.error("Error deleting staff:", err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading staff data...</p>
      </div>
    );
  }

  if (error && !staffData) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h5 className="alert-heading">Error Loading Staff</h5>
          <p>{error}</p>
          <hr />
          <Link to="/admin/staff" className="btn btn-outline-secondary">
            Back to Staff List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-delete">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-sm border-danger">
              <div className="card-header bg-danger text-white">
                <h4 className="mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Confirm Deletion
                </h4>
              </div>
              <div className="card-body">
                <div className="alert alert-warning">
                  <h5 className="alert-heading">Warning!</h5>
                  <p className="mb-0">
                    You are about to permanently delete a staff member. This action cannot be undone.
                  </p>
                </div>

                {staffData && (
                  <div className="card mb-4">
                    <div className="card-body">
                      <h5 className="card-title">Staff Member Details</h5>
                      <div className="row">
                        <div className="col-6">
                          <small className="text-muted d-block">Staff ID</small>
                          <strong>#{staffData.STAFF_ID}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block">Name</small>
                          <strong>{staffData.Name}</strong>
                        </div>
                        <div className="col-6 mt-3">
                          <small className="text-muted d-block">Role</small>
                          <strong>{staffData.Role}</strong>
                        </div>
                        <div className="col-6 mt-3">
                          <small className="text-muted d-block">Email</small>
                          <strong>{staffData.Email}</strong>
                        </div>
                        {staffData.has_user_account && (
                          <div className="col-12 mt-3">
                            <div className="alert alert-danger p-2">
                              <small>
                                <i className="bi bi-exclamation-circle me-1"></i>
                                This staff member has a user account that will also be deleted!
                              </small>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="alert alert-danger">
                  <h6 className="alert-heading">Consequences of deletion:</h6>
                  <ul className="mb-0 small">
                    <li>Staff member will be permanently removed from the system</li>
                    <li>Associated user account (if exists) will be deleted</li>
                    <li>This action cannot be reversed</li>
                    <li>Any related data may be affected</li>
                  </ul>
                </div>

                {error && (
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                <div className="d-flex justify-content-between">
                  <Link to="/admin/staff" className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-left me-1"></i>
                    Cancel
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="btn btn-danger"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash me-1"></i>
                        Delete Permanently
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDelete;