// src/modules/admin/pages/departments/DepartmentAdd.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const DepartmentAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    Department_Name: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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

      const response = await adminApi.createDepartment({
        Department_Name: formData.Department_Name.trim()
      });
      
      alert("Department added successfully!");
      navigate("/admin/departments");
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to add department");
      console.error("Error adding department:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="department-add">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Add New Department</h3>
          <p className="text-muted mb-0">
            Create a new clinical department for doctor assignments
          </p>
        </div>
        <Link to="/admin/departments" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>Back to List
        </Link>
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
                    placeholder="e.g., Cardiology, Neurology, Pediatrics"
                    required
                    autoFocus
                  />
                  <div className="form-text">
                    Must be at least 2 characters. Only letters, spaces, and & allowed.
                  </div>
                </div>

                <div className="border-top pt-3 mt-4">
                  <div className="d-flex justify-content-between">
                    <Link to="/admin/departments" className="btn btn-outline-secondary">
                      Cancel
                    </Link>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-2"></i>
                          Add Department
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card shadow-sm border-0 mt-3">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-lightbulb me-2"></i>
                Tips for Department Names
              </h6>
              <ul className="list-unstyled small mb-0">
                <li className="mb-1">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Use descriptive names (e.g., "Cardiology" not just "Heart")
                </li>
                <li className="mb-1">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Keep names consistent in format
                </li>
                <li className="mb-1">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Avoid special characters except spaces and &
                </li>
                <li>
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Departments cannot be merged later, so choose names carefully
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAdd;