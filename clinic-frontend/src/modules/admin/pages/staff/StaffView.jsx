// src/modules/admin/pages/staff/StaffView.jsx - COMPLETE DETAILS VIEW
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { adminApi } from "../../services/adminApi.js";

const StaffView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStaffData();
  }, [id]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStaffById(id);
      setStaff(response.data);
    } catch (err) {
      setError("Failed to load staff details");
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading staff details...</p>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h5 className="alert-heading">Error Loading Staff</h5>
          <p>{error || "Staff not found"}</p>
          <hr />
          <Link to="/admin/staff" className="btn btn-outline-secondary">
            Back to Staff List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-view">
      {/* Header with Actions */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Staff Details</h3>
          <p className="text-muted mb-0">
            Staff ID: #{staff.STAFF_ID || staff.id} • {staff.Role}
          </p>
        </div>
        <div className="btn-group">
          <Link to="/admin/staff" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1"></i>Back to List
          </Link>
          <Link to={`/admin/staff/edit/${id}`} className="btn btn-primary">
            <i className="bi bi-pencil me-1"></i>Edit
          </Link>
          <Link to={`/admin/staff/delete/${id}`} className="btn btn-outline-danger">
            <i className="bi bi-trash me-1"></i>Delete
          </Link>
        </div>
      </div>

      <div className="row">
        {/* Left Column - Personal Info */}
        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body text-center">
              <div className="avatar-circle bg-primary mb-3 mx-auto" style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                color: 'white'
              }}>
                {staff.Name?.charAt(0) || 'S'}
              </div>
              <h4 className="mb-1">{staff.Name}</h4>
              <p className="text-muted">{staff.Role}</p>
              
              <div className="d-flex justify-content-center gap-2 mb-3">
                <span className={`badge ${staff.Status === 'Available' ? 'bg-success' : 
                  staff.Status === 'Busy' ? 'bg-warning' : 'bg-info'}`}>
                  {staff.Status}
                </span>
                <span className={`badge ${staff.account_active ? 'bg-success' : 'bg-danger'}`}>
                  {staff.user ? (staff.account_active ? 'Active Account' : 'Inactive Account') : 'No Account'}
                </span>
              </div>

              {/* Quick Info */}
              <div className="list-group list-group-flush text-start">
                <div className="list-group-item border-0 px-0">
                  <small className="text-muted d-block">Staff ID</small>
                  <strong>#{staff.STAFF_ID || staff.id}</strong>
                </div>
                <div className="list-group-item border-0 px-0">
                  <small className="text-muted d-block">Gender</small>
                  <strong>{staff.Gender || 'N/A'}</strong>
                </div>
                <div className="list-group-item border-0 px-0">
                    <small className="text-muted d-block">Date of Birth</small>
                    <strong>{formatDate(staff.Date_of_Birth) || 'N/A'}</strong>
                </div>
                <div className="list-group-item border-0 px-0">
                  <small className="text-muted d-block">Age</small>
                  <strong>{staff.Age || 'N/A'} years</strong>
                </div>
                <div className="list-group-item border-0 px-0">
                  <small className="text-muted d-block">Blood Group</small>
                  <strong>{staff.Blood_Group || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Info */}
        <div className="col-lg-8">
          {/* Contact Information Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-light">
              <h5 className="mb-0"><i className="bi bi-telephone me-2"></i>Contact Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Phone Number</small>
                  <strong>{staff.Phone_Number || 'N/A'}</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Alternate Phone</small>
                  <strong>{staff.Alternate_Phone || 'N/A'}</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Emergency Contact</small>
                  <strong>{staff.Emergency_Contact || 'N/A'}</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Email</small>
                  <strong>{staff.Email || 'N/A'}</strong>
                </div>
                <div className="col-12 mb-3">
                  <small className="text-muted d-block">Address</small>
                  <strong>{staff.Address || 'N/A'}</strong>
                  {staff.City && <span>, {staff.City}</span>}
                  {staff.State && <span>, {staff.State}</span>}
                  {staff.Pincode && <span> - {staff.Pincode}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-light">
              <h5 className="mb-0"><i className="bi bi-briefcase me-2"></i>Professional Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Qualification</small>
                  <strong>{staff.Qualification || 'N/A'}</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Specialization</small>
                  <strong>{staff.Specialization || 'N/A'}</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Experience</small>
                  <strong>{staff.Experience || 0} years</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">License Number</small>
                  <strong>{staff.License_Number || 'N/A'}</strong>
                </div>
                {staff.Role === 'Doctor' && (
                  <>
                    <div className="col-md-6 mb-3">
                      <small className="text-muted d-block">Consultation Fees</small>
                      <strong>{formatCurrency(staff.Consultation_fees)}</strong>
                    </div>
                    <div className="col-md-6 mb-3">
                      <small className="text-muted d-block">Department</small>
                      <strong>{staff.Department?.Department_Name || 'N/A'}</strong>
                    </div>
                  </>
                )}
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Joining Date</small>
                  <strong>{formatDate(staff.Joining_Date)}</strong>
                </div>
                <div className="col-md-6 mb-3">
                  <small className="text-muted d-block">Shift Timing</small>
                  <strong>{staff.Shift_Timing || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Account & Financial Info */}
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-light">
                  <h5 className="mb-0"><i className="bi bi-person-badge me-2"></i>Account Information</h5>
                </div>
                <div className="card-body">
                  {staff.user ? (
                    <>
                      <div className="mb-2">
                        <small className="text-muted d-block">Username</small>
                        <strong>{staff.user.username}</strong>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Account Status</small>
                        <span className={`badge ${staff.account_active ? 'bg-success' : 'bg-danger'}`}>
                          {staff.account_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mb-2">
                        <small className="text-muted d-block">Last Login</small>
                        <strong>{staff.user.last_login ? formatDate(staff.user.last_login) : 'Never'}</strong>
                      </div>
                      <div className="mt-3">
                        <button className="btn btn-sm btn-outline-warning me-2">
                          <i className="bi bi-key me-1"></i>Reset Password
                        </button>
                        <button className={`btn btn-sm ${staff.account_active ? 'btn-outline-danger' : 'btn-outline-success'}`}>
                          <i className={`bi ${staff.account_active ? 'bi-person-x' : 'bi-person-check'} me-1`}></i>
                          {staff.account_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <i className="bi bi-person-x display-4 text-muted mb-3"></i>
                      <p className="text-muted">No user account created</p>
                      <button className="btn btn-outline-success">
                        <i className="bi bi-person-plus me-1"></i>Create Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-light">
                  <h5 className="mb-0"><i className="bi bi-bank me-2"></i>Bank Details</h5>
                </div>
                <div className="card-body">
                  <div className="mb-2">
                    <small className="text-muted d-block">Bank Name</small>
                    <strong>{staff.Bank_Name || 'N/A'}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">Account Number</small>
                    <strong>{staff.Account_Number || 'N/A'}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">IFSC Code</small>
                    <strong>{staff.IFSC_Code || 'N/A'}</strong>
                  </div>
                  <div className="mb-2">
                    <small className="text-muted d-block">Salary</small>
                    <strong>{formatCurrency(staff.Salary)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {staff.Notes && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light">
                <h5 className="mb-0"><i className="bi bi-sticky me-2"></i>Additional Notes</h5>
              </div>
              <div className="card-body">
                <p className="mb-0">{staff.Notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
        <Link to="/admin/staff" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>Back to Staff List
        </Link>
        <div className="btn-group">
          <Link to={`/admin/staff/edit/${id}`} className="btn btn-primary">
            <i className="bi bi-pencil me-1"></i>Edit Staff
          </Link>
          <Link to={`/admin/staff/delete/${id}`} className="btn btn-outline-danger">
            <i className="bi bi-trash me-1"></i>Delete Staff
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffView;