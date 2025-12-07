// src/modules/admin/pages/departments/DepartmentEdit.jsx - FIXED
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const DepartmentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    Department_Name: "",
    Description: ""
  });

  useEffect(() => {
    fetchDepartmentData();
  }, [id]);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDepartmentById(id);
      const deptData = response.data;
      
      setFormData({
        Department_Name: deptData.Department_Name || "",
        Description: deptData.Description || ""
      });
    } catch (err) {
      setError("Failed to load department data");
      console.error("Error fetching department:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Validate department name
      if (!formData.Department_Name.trim()) {
        throw new Error("Department name is required");
      }

      if (formData.Department_Name.trim().length < 2) {
        throw new Error("Department name must be at least 2 characters long");
      }

      // Validate format (letters, spaces, and ampersand only)
      const nameRegex = /^[A-Za-z\s&]+$/;
      if (!nameRegex.test(formData.Department_Name)) {
        throw new Error("Department name can only contain letters, spaces and ampersand");
      }

      await adminApi.updateDepartment(id, {
        Department_Name: formData.Department_Name.trim(),
        Description: formData.Description.trim() || null
      });
      
      alert("Department updated successfully!");
      navigate("/admin/departments");
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update department");
      console.error("Error updating department:", err);
    } finally {
      setSaving(false);
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

  return (
    <div className="department-edit">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Edit Department</h3>
          <p className="text-muted mb-0">
            Update department information for Department ID: <strong>#{id}</strong>
          </p>
        </div>
        <div className="btn-group">
          <Link to="/admin/departments" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i>Back to List
          </Link>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label">Department Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    name="Department_Name"
                    value={formData.Department_Name}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                  <div className="form-text">
                    Must be at least 2 characters. Only letters, spaces, and & allowed.
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-control"
                    name="Description"
                    value={formData.Description}
                    onChange={handleChange}
                    placeholder="Brief description of the department..."
                    rows="3"
                  />
                </div>

                <div className="border-top pt-3 mt-4">
                  <div className="d-flex justify-content-between">
                    <Link to="/admin/departments" className="btn btn-outline-secondary">
                      Cancel
                    </Link>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Update Department
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card shadow-sm border-warning mt-3">
            <div className="card-body">
              <h6 className="card-title text-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Important Note
              </h6>
              <p className="small mb-0">
                Changing the department name will automatically update the department 
                for all doctors currently assigned to it. This change cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentEdit;