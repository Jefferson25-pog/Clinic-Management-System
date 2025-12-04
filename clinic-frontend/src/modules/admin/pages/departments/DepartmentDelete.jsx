// src/modules/admin/pages/departments/DepartmentDelete.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const DepartmentDelete = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [departmentData, setDepartmentData] = useState(null);
  const [doctorCount, setDoctorCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDepartmentData();
  }, [id]);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDepartmentById(id);
      setDepartmentData(response.data);
      
      // Try to get doctor count (you might need to implement this API)
      // For now, we'll use a placeholder
      setDoctorCount(response.data.doctor_count || 0);
    } catch (err) {
      setError("Failed to load department data");
      console.error("Error fetching department:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (doctorCount > 0) {
      if (!window.confirm(
        `This department has ${doctorCount} doctor(s) assigned.\n\n` +
        `Deleting it will remove the department from all these doctors.\n\n` +
        `Are you sure you want to proceed?`
      )) {
        return;
      }
    } else {
      if (!window.confirm(`Delete department "${departmentData.Department_Name}"?\n\nThis action cannot be undone.`)) {
        return;
      }
    }

    setDeleting(true);
    try {
      await adminApi.deleteDepartment(id);
      alert("Department deleted successfully!");
      navigate("/admin/departments");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to delete department");
      console.error("Error deleting department:", err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading department data...</p>
      </div>
    );
  }

  if (error && !departmentData) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h5 className="alert-heading">Error Loading Department</h5>
          <p>{error}</p>
          <hr />
          <Link to="/admin/departments" className="btn btn-outline-secondary">
            Back to Department List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="department-delete">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-sm border-danger">
              <div className="card-header bg-danger text-white">
                <h4 className="mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Delete Department
                </h4>
              </div>
              <div className="card-body">
                {doctorCount > 0 ? (
                  <div className="alert alert-warning">
                    <h5 className="alert-heading">Warning: Doctors Assigned</h5>
                    <p>
                      This department has <strong>{doctorCount} doctor(s)</strong> assigned.
                      Deleting it will remove the department from all these doctors.
                    </p>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <h5 className="alert-heading">No Doctors Assigned</h5>
                    <p>This department has no doctors assigned, so deletion will be straightforward.</p>
                  </div>
                )}

                {departmentData && (
                  <div className="card mb-4">
                    <div className="card-body">
                      <h5 className="card-title">Department Details</h5>
                      <div className="row">
                        <div className="col-6">
                          <small className="text-muted d-block">Department ID</small>
                          <strong>#{departmentData.DEPT_ID}</strong>
                        </div>
                        <div className="col-6">
                          <small className="text-muted d-block">Department Name</small>
                          <strong>{departmentData.Department_Name}</strong>
                        </div>
                        <div className="col-12 mt-3">
                          <small className="text-muted d-block">Doctor Count</small>
                          <strong className={doctorCount > 0 ? "text-danger" : ""}>
                            {doctorCount} doctor{doctorCount !== 1 ? 's' : ''}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="alert alert-danger">
                  <h6 className="alert-heading">Consequences of deletion:</h6>
                  <ul className="mb-0 small">
                    <li>Department will be permanently removed</li>
                    {doctorCount > 0 && (
                      <li><strong>{doctorCount} doctor(s) will lose department assignment</strong></li>
                    )}
                    <li>This action cannot be reversed</li>
                    <li>Any doctors assigned to this department will need reassignment</li>
                  </ul>
                </div>

                {error && (
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                <div className="d-flex justify-content-between">
                  <Link to="/admin/departments" className="btn btn-outline-secondary">
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
                        Delete Department
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

export default DepartmentDelete;