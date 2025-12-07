// src/modules/pharmacy/pages/PharmacyDashboard.jsx
import React from "react";

const PharmacyDashboard = () => {
  return (
    <div className="pharmacy-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Pharmacy Dashboard</h3>
          <p className="text-muted mb-0">
            Welcome to the Pharmacy Portal - Under Construction
          </p>
        </div>
        <div className="btn-group">
          <span className="badge bg-primary">Role: Pharmacist</span>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center py-5">
              <div className="display-1 text-primary mb-3">
                <i className="bi bi-capsule"></i>
              </div>
              <h4 className="mb-3">Pharmacy Dashboard</h4>
              <p className="text-muted mb-4">
                This dashboard is currently under construction. 
                The pharmacy module will include medication dispensing, 
                inventory management, and prescription processing.
              </p>
              
              <div className="row mt-4">
                <div className="col-md-3">
                  <div className="card border-info">
                    <div className="card-body">
                      <h6><i className="bi bi-prescription2 text-info"></i> Prescriptions</h6>
                      <p className="small text-muted">Process prescriptions</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-success">
                    <div className="card-body">
                      <h6><i className="bi bi-box-seam text-success"></i> Inventory</h6>
                      <p className="small text-muted">Manage medication stock</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-warning">
                    <div className="card-body">
                      <h6><i className="bi bi-clipboard-check text-warning"></i> Dispensing</h6>
                      <p className="small text-muted">Dispense medications</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-danger">
                    <div className="card-body">
                      <h6><i className="bi bi-graph-up-arrow text-danger"></i> Reports</h6>
                      <p className="small text-muted">Generate pharmacy reports</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5">
                <p className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  This page confirms that Pharmacist login and routing is working correctly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyDashboard;