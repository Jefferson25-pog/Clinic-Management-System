// src/modules/admin/pages/Reports.jsx - NEW COMPONENT
import React from "react";
import { Link } from "react-router-dom";

const Reports = () => {
  const upcomingReports = [
    {
      title: "Staff Activity Report",
      description: "Detailed report of all staff activities and login patterns",
      icon: "bi-people",
      status: "planned"
    },
    {
      title: "System Usage Statistics",
      description: "Analysis of system usage, peak hours, and module usage",
      icon: "bi-graph-up",
      status: "planned"
    },
    {
      title: "Security Audit Report",
      description: "Comprehensive security audit with vulnerability assessment",
      icon: "bi-shield-check",
      status: "planned"
    },
    {
      title: "Login History Analysis",
      description: "Detailed analysis of login patterns and security events",
      icon: "bi-clock-history",
      status: "in-progress"
    },
    {
      title: "User Account Activity",
      description: "Report on user account creation, modification, and deletion",
      icon: "bi-person-lines-fill",
      status: "planned"
    },
    {
      title: "Department Performance",
      description: "Performance metrics for different departments",
      icon: "bi-building",
      status: "planned"
    }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center mb-2">
            <Link to="/admin" className="btn btn-outline-secondary btn-sm me-2">
              <i className="bi bi-arrow-left"></i>
            </Link>
            <h4 className="mb-0">Reports</h4>
          </div>
          <p className="text-muted mb-0">
            Generate and view comprehensive system reports and analytics.
          </p>
        </div>
        <div className="btn-group">
          <button className="btn btn-outline-secondary" disabled>
            <i className="bi bi-download me-1"></i>Export All
          </button>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <i className="bi bi-tools fs-1 text-warning"></i>
            </div>
            <div>
              <h5 className="mb-1">Reports Module Under Construction</h5>
              <p className="mb-0">
                We're working hard to bring you comprehensive reporting features. 
                This module will be available in the next update.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">
                <i className="bi bi-clock-history me-2"></i>
                Upcoming Reports
              </h5>
              <div className="row g-3">
                {upcomingReports.map((report, index) => (
                  <div key={index} className="col-md-6">
                    <div className="card border h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-start mb-3">
                          <div className={`rounded p-2 me-3 ${
                            report.status === 'in-progress' ? 'bg-info bg-opacity-10' : 'bg-light'
                          }`}>
                            <i className={`bi ${report.icon} fs-4 ${
                              report.status === 'in-progress' ? 'text-info' : 'text-secondary'
                            }`}></i>
                          </div>
                          <div>
                            <h6 className="mb-1">{report.title}</h6>
                            <span className={`badge ${
                              report.status === 'in-progress' ? 'bg-info' : 'bg-secondary'
                            }`}>
                              {report.status === 'in-progress' ? 'In Development' : 'Planned'}
                            </span>
                          </div>
                        </div>
                        <p className="small text-muted mb-0">{report.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">
                <i className="bi bi-calendar-event me-2"></i>
                Timeline
              </h5>
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-marker bg-primary"></div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Phase 1: Basic Reports</h6>
                    <p className="small text-muted mb-0">Login history and user activity</p>
                    <small className="text-muted">Expected: Next Update</small>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker bg-info"></div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Phase 2: Analytics</h6>
                    <p className="small text-muted mb-0">Advanced analytics and charts</p>
                    <small className="text-muted">Q2 2024</small>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker bg-success"></div>
                  <div className="timeline-content">
                    <h6 className="mb-1">Phase 3: Export & Schedule</h6>
                    <p className="small text-muted mb-0">PDF export and scheduled reports</p>
                    <small className="text-muted">Q3 2024</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title mb-4">
                <i className="bi bi-lightbulb me-2"></i>
                Suggestions
              </h5>
              <div className="alert alert-info">
                <p className="mb-2"><strong>Need specific reports?</strong></p>
                <p className="small mb-0">
                  Contact the development team to request specific reports 
                  that would help your workflow.
                </p>
              </div>
              <button className="btn btn-outline-primary w-100">
                <i className="bi bi-envelope me-1"></i> Request Feature
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Available Reports */}
      <div className="card shadow-sm border-0 mt-3">
        <div className="card-body">
          <h5 className="card-title mb-4">
            <i className="bi bi-check-circle me-2 text-success"></i>
            Currently Available
          </h5>
          <div className="row">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-3">
                <div className="bg-success bg-opacity-10 rounded p-2 me-3">
                  <i className="bi bi-clock-history fs-4 text-success"></i>
                </div>
                <div>
                  <h6 className="mb-0">Login History</h6>
                  <p className="small text-muted mb-0">View all login attempts and history</p>
                  <Link to="/admin/login-history" className="btn btn-sm btn-success mt-2">
                    <i className="bi bi-arrow-right me-1"></i> Go to Login History
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-3">
                <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                  <i className="bi bi-journal-text fs-4 text-primary"></i>
                </div>
                <div>
                  <h6 className="mb-0">System Logs</h6>
                  <p className="small text-muted mb-0">View system activity and audit logs</p>
                  <Link to="/admin/system-logs" className="btn btn-sm btn-primary mt-2">
                    <i className="bi bi-arrow-right me-1"></i> Go to System Logs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

<style jsx="true">{`
.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline:before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #e9ecef;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-marker {
  position: absolute;
  left: -30px;
  top: 5px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.timeline-content {
  margin-left: 0;
}
`}</style>