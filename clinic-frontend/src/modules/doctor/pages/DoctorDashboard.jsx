// src/modules/doctor/pages/DoctorDashboard.jsx
import React from "react";

const DoctorDashboard = () => {
  return (
    <div className="doctor-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Doctor Dashboard</h3>
          <p className="text-muted mb-0">
            Welcome to the Doctor Portal - Under Construction
          </p>
        </div>
        <div className="btn-group">
          <span className="badge bg-info">Role: Doctor</span>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center py-5">
              <div className="display-1 text-primary mb-3">
                <i className="bi bi-stethoscope"></i>
              </div>
              <h4 className="mb-3">Doctor Dashboard</h4>
              <p className="text-muted mb-4">
                This dashboard is currently under construction. 
                The doctor module will include patient management, 
                consultation scheduling, and medical records.
              </p>
              
              <div className="row mt-4">
                <div className="col-md-3">
                  <div className="card border-info">
                    <div className="card-body">
                      <h6><i className="bi bi-calendar-check text-info"></i> Appointments</h6>
                      <p className="small text-muted">Manage patient appointments</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-success">
                    <div className="card-body">
                      <h6><i className="bi bi-file-medical text-success"></i> Medical Records</h6>
                      <p className="small text-muted">Access patient history</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-warning">
                    <div className="card-body">
                      <h6><i className="bi bi-prescription text-warning"></i> Prescriptions</h6>
                      <p className="small text-muted">Create and manage prescriptions</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-danger">
                    <div className="card-body">
                      <h6><i className="bi bi-graph-up text-danger"></i> Analytics</h6>
                      <p className="small text-muted">View practice analytics</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5">
                <p className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  This page confirms that Doctor login and routing is working correctly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;