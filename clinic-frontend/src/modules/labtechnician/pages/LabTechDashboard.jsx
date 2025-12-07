// src/modules/labtechnician/pages/LabTechDashboard.jsx
import React from "react";

const LabTechDashboard = () => {
  return (
    <div className="labtech-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Lab Technician Dashboard</h3>
          <p className="text-muted mb-0">
            Welcome to the Laboratory Portal - Under Construction
          </p>
        </div>
        <div className="btn-group">
          <span className="badge bg-purple">Role: Lab Technician</span>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center py-5">
              <div className="display-1 text-purple mb-3">
                <i className="bi bi-droplet-half"></i>
              </div>
              <h4 className="mb-3">Lab Technician Dashboard</h4>
              <p className="text-muted mb-4">
                This dashboard is currently under construction. 
                The lab module will include test management, 
                sample processing, and lab reports.
              </p>
              
              <div className="row mt-4">
                <div className="col-md-3">
                  <div className="card border-info">
                    <div className="card-body">
                      <h6><i className="bi bi-vial text-info"></i> Tests</h6>
                      <p className="small text-muted">Manage lab tests</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-success">
                    <div className="card-body">
                      <h6><i className="bi bi-clipboard-data text-success"></i> Samples</h6>
                      <p className="small text-muted">Process samples</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-warning">
                    <div className="card-body">
                      <h6><i className="bi bi-file-earmark-medical text-warning"></i> Reports</h6>
                      <p className="small text-muted">Generate lab reports</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-danger">
                    <div className="card-body">
                      <h6><i className="bi bi-gear text-danger"></i> Equipment</h6>
                      <p className="small text-muted">Manage lab equipment</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5">
                <p className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  This page confirms that Lab Technician login and routing is working correctly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabTechDashboard;