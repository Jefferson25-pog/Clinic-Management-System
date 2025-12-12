// src/modules/doctor/pages/ConsultationHistory.jsx - UPDATED WITH COMPLETED-ONLY & VIEW-ONLY
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import doctorApi from "../services/doctorApi";

const ConsultationHistory = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    last30Days: 0,
    completed: 0
  });
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [labTests, setLabTests] = useState([]);
  const [labResults, setLabResults] = useState({});
  
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConsultations();
    fetchStats();
  }, [currentPage, searchTerm, dateFrom, dateTo]);

  const fetchConsultations = async () => {
  try {
    setLoading(true);
    const params = {
      patient_name: searchTerm || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: currentPage
    };
    
    console.log("Fetching consultations with params:", params);
    
    const response = await doctorApi.getConsultationHistory(params);
    console.log("Full API Response:", response);
    console.log("Response data:", response.data);
    
    if (response.data) {
      // DEBUG: Log all consultations with their status
      const allConsultations = response.data.consultations || response.data;
      console.log("All consultations received:", allConsultations.length);
      console.log("Consultations with status:");
      allConsultations.forEach((c, i) => {
        console.log(`${i + 1}. ID: ${c.CONSULT_ID}, Status: ${c.Consultation_Status}, Status field:`, c);
      });
      
      // Check different possible status field names
      const completedConsultations = allConsultations.filter(c => {
        const status = c.Consultation_Status || c.consultation_status || c.status;
        return status && status.toLowerCase() === 'completed';
      });
      
      console.log("Completed consultations found:", completedConsultations.length);
      setConsultations(completedConsultations);
      
      if (response.data.total_pages) {
        setTotalPages(response.data.total_pages);
      }
    }
  } catch (err) {
    console.error("Error fetching consultations:", err);
    setError("Failed to load consultation history");
  } finally {
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      const todayResponse = await doctorApi.getTodayConsultations();
      const recentResponse = await doctorApi.getRecentConsultations();
      
      if (todayResponse.data && recentResponse.data) {
        // Count only completed consultations
        const completedCount = consultations.filter(c => 
          c.Consultation_Status === 'completed' || c.Consultation_Status === 'Completed'
        ).length;
        
        setStats({
          total: consultations.length,
          today: todayResponse.data.count || 0,
          last30Days: recentResponse.data.count || 0,
          completed: completedCount
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchLabTestsForConsultation = async (consultationId) => {
    try {
      const response = await doctorApi.getLabTestRequests();
      if (response.data) {
        // Filter lab tests for this specific consultation
        const consultationLabTests = response.data.filter(test => 
          test.CONSULT_ID === consultationId || 
          (test.consultation && test.consultation.CONSULT_ID === consultationId)
        );
        setLabTests(consultationLabTests);
        
        // Fetch lab results for each test
        consultationLabTests.forEach(async (test) => {
          try {
            const resultResponse = await doctorApi.getLabResults();
            if (resultResponse.data) {
              const testResults = resultResponse.data.filter(result => 
                result.LAB_REQUEST_ID === test.LAB_REQUEST_ID
              );
              setLabResults(prev => ({
                ...prev,
                [test.LAB_REQUEST_ID]: testResults
              }));
            }
          } catch (err) {
            console.log("No lab results found for test:", test.LAB_REQUEST_ID);
          }
        });
      }
    } catch (err) {
      console.error("Error fetching lab tests:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { color: 'success', icon: 'bi-check-circle', label: 'Completed' },
      'Completed': { color: 'success', icon: 'bi-check-circle', label: 'Completed' },
      'in_progress': { color: 'warning', icon: 'bi-clock', label: 'In Progress' },
      'cancelled': { color: 'danger', icon: 'bi-x-circle', label: 'Cancelled' },
      'Cancelled': { color: 'danger', icon: 'bi-x-circle', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { color: 'secondary', icon: 'bi-circle', label: status || 'Unknown' };
    
    return (
      <span className={`badge bg-${config.color}`}>
        <i className={`bi ${config.icon} me-1`}></i>
        {config.label}
      </span>
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchConsultations();
  };

  const handleReset = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleViewDetails = async (consultation) => {
    setSelectedConsultation(consultation);
    await fetchLabTestsForConsultation(consultation.CONSULT_ID);
    setShowDetailsModal(true);
  };

  const handleEditLabResult = (labTest) => {
    // Navigate to lab results entry page
    navigate(`/doctor/lab-results/enter?request_id=${labTest.LAB_REQUEST_ID}`, {
      state: { 
        labTest,
        consultation: selectedConsultation 
      }
    });
  };

  const handleViewPrescription = (consultation) => {
    // Navigate to prescription view
    navigate(`/doctor/prescriptions?consultation_id=${consultation.CONSULT_ID}`, {
      state: { consultation }
    });
  };

  const handleDownloadReport = (consultation) => {
    // Generate and download consultation report
    alert(`Downloading report for consultation ${consultation.CONSULT_ID}`);
    // Implement actual download logic here
  };

  if (loading && currentPage === 1) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5>Loading Consultation History...</h5>
          <p className="text-muted">Please wait while we load your consultation records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">Consultation History</h1>
          <p className="text-muted mb-0">View completed consultations and lab test records</p>
        </div>
        <div>
          <button
            onClick={() => navigate("/doctor/appointments")}
            className="btn btn-outline-primary me-2"
          >
            <i className="bi bi-arrow-left me-1"></i>
            Back to Appointments
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Completed Consultations</h6>
                  <h3 className="mb-0">{stats.completed}</h3>
                  <div className="mt-2">
                    <small className="text-muted">All time completed</small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-clipboard2-check fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Today's Completed</h6>
                  <h3 className="mb-0">{stats.today}</h3>
                  <div className="mt-2">
                    <small className="text-muted">Consultations completed today</small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-calendar-check fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Last 30 Days</h6>
                  <h3 className="mb-0">{stats.last30Days}</h3>
                  <div className="mt-2">
                    <small className="text-muted">Recent completed consultations</small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-calendar-month fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Available Records</h6>
                  <h3 className="mb-0">{consultations.length}</h3>
                  <div className="mt-2">
                    <small className="text-muted">Filtered results</small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-files fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-transparent border-0">
          <h5 className="mb-0">
            <i className="bi bi-funnel me-2"></i>
            Filter Completed Consultations
          </h5>
          <p className="text-muted small mb-0">Only completed consultations are shown here</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Search Patient</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by patient name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label">From Date</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-calendar"></i>
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label">To Date</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-calendar"></i>
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button
                type="submit"
                className="btn btn-primary"
              >
                <i className="bi bi-funnel me-1"></i>
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline-secondary"
              >
                <i className="bi bi-x-circle me-1"></i>
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Consultations Table Card */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-clipboard2-check me-2"></i>
            Completed Consultation Records
          </h5>
          <div>
            <span className="badge bg-primary me-2">
              Total: {consultations.length}
            </span>
            <span className="badge bg-success">
              <i className="bi bi-check-circle me-1"></i>
              All Completed
            </span>
          </div>
        </div>
        
        <div className="card-body p-0">
          {error ? (
            <div className="alert alert-danger m-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard-x display-5 text-muted mb-3"></i>
              <h5>No Completed Consultations Found</h5>
              <p className="text-muted mb-0">
                {searchTerm || dateFrom || dateTo 
                  ? "No completed consultations match your search criteria" 
                  : "No completed consultations found in your records"}
              </p>
              {/* <button 
                onClick={handleReset} 
                className="btn btn-outline-primary mt-3"
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset Filters
              </button> */}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0">Patient</th>
                    <th className="border-0">Consultation Date</th>
                    <th className="border-0">Symptoms</th>
                    <th className="border-0">Diagnosis</th>
                    <th className="border-0">Status</th>
                    <th className="border-0 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((consultation) => (
                    <tr key={consultation.CONSULT_ID}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-sm bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3">
                            <i className="bi bi-person fs-5 text-primary"></i>
                          </div>
                          <div>
                            <div className="fw-medium">
                              {consultation.patient_name || consultation.TOKEN_NO?.PAT_ID?.Patient_Name || "N/A"}
                            </div>
                            <small className="text-muted">
                              ID: {consultation.TOKEN_NO?.PAT_ID?.PAT_ID || "N/A"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium">
                          {formatDateShort(consultation.Consultation_Time)}
                        </div>
                        <small className="text-muted">
                          {new Date(consultation.Consultation_Time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </small>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={consultation.Symptoms}>
                          {consultation.Symptoms || "N/A"}
                        </div>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={consultation.Diagnosis}>
                          {consultation.Diagnosis || "N/A"}
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(consultation.Consultation_Status)}
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-center">
                          {/* View Details Button */}
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            title="View Consultation Details"
                            onClick={() => handleViewDetails(consultation)}
                          >
                            <i className="bi bi-eye"></i>
                            <span className="d-none d-md-inline ms-1">Details</span>
                          </button>
                          
                          {/* View Prescription Button */}
                          <button 
                            className="btn btn-sm btn-outline-success"
                            title="View Prescription"
                            onClick={() => handleViewPrescription(consultation)}
                          >
                            <i className="bi bi-prescription"></i>
                            <span className="d-none d-md-inline ms-1">Rx</span>
                          </button>
                          
                          {/* Download Report Button */}
                          <button 
                            className="btn btn-sm btn-outline-info"
                            title="Download Report"
                            onClick={() => handleDownloadReport(consultation)}
                          >
                            <i className="bi bi-download"></i>
                            <span className="d-none d-md-inline ms-1">Report</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-transparent border-0">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Showing page {currentPage} of {totalPages}
              </div>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = currentPage <= 3 
                      ? i + 1 
                      : currentPage >= totalPages - 2 
                        ? totalPages - 4 + i 
                        : currentPage - 2 + i;
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <li key={i} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Consultation Details Modal */}
      {showDetailsModal && selectedConsultation && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-clipboard2-data me-2"></i>
                  Consultation Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Patient Info */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <i className="bi bi-person-badge me-2"></i>
                      Patient Information
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-1">
                          <strong>Patient Name:</strong> {selectedConsultation.patient_name || "N/A"}
                        </p>
                        <p className="mb-1">
                          <strong>Patient ID:</strong> {selectedConsultation.TOKEN_NO?.PAT_ID?.PAT_ID || "N/A"}
                        </p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-1">
                          <strong>Consultation Date:</strong> {formatDate(selectedConsultation.Consultation_Time)}
                        </p>
                        <p className="mb-0">
                          <strong>Status:</strong> {getStatusBadge(selectedConsultation.Consultation_Status)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Symptoms & Diagnosis */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <h6 className="mb-0">
                      <i className="bi bi-clipboard2-heart me-2"></i>
                      Medical Information
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Symptoms</label>
                      <div className="border rounded p-3 bg-light">
                        {selectedConsultation.Symptoms || "No symptoms recorded"}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Diagnosis</label>
                      <div className="border rounded p-3 bg-light">
                        {selectedConsultation.Diagnosis || "No diagnosis recorded"}
                      </div>
                    </div>
                    <div>
                      <label className="form-label fw-semibold">Clinical Notes</label>
                      <div className="border rounded p-3 bg-light">
                        {selectedConsultation.Description || "No additional notes"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lab Tests Section - EDITABLE for Lab Results */}
                <div className="card">
                  <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <i className="bi bi-vial me-2"></i>
                      Lab Test Requests
                    </h6>
                    <span className="badge bg-primary">
                      {labTests.length} test(s)
                    </span>
                  </div>
                  <div className="card-body">
                    {labTests.length === 0 ? (
                      <div className="text-center py-3">
                        <i className="bi bi-vial display-6 text-muted mb-3"></i>
                        <p className="text-muted">No lab tests requested for this consultation</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Test Name</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Requested Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {labTests.map((test) => (
                              <tr key={test.LAB_REQUEST_ID}>
                                <td>{test.test_name || test.LAB_TEST_ID?.Lab_Test_Name || "Unknown Test"}</td>
                                <td>
                                  <span className={`badge ${
                                    test.Priority === 'stat' ? 'bg-danger' :
                                    test.Priority === 'priority' ? 'bg-warning' : 'bg-secondary'
                                  }`}>
                                    {test.Priority || 'routine'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    test.Status === 'Completed' ? 'bg-success' :
                                    test.Status === 'In Progress' ? 'bg-warning' : 'bg-secondary'
                                  }`}>
                                    {test.Status || 'Requested'}
                                  </span>
                                </td>
                                <td>{formatDateShort(test.Requested_Date)}</td>
                                <td>
                                  <div className="d-flex gap-1">
                                    {/* EDIT BUTTON: Only for lab tests that need results */}
                                    {test.Status !== 'Completed' && (
                                      <button
                                        className="btn btn-sm btn-warning"
                                        title="Enter Lab Results"
                                        onClick={() => handleEditLabResult(test)}
                                      >
                                        <i className="bi bi-pencil"></i>
                                        <span className="d-none d-md-inline ms-1">Enter Results</span>
                                      </button>
                                    )}
                                    
                                    {/* VIEW BUTTON: For completed tests */}
                                    {test.Status === 'Completed' && labResults[test.LAB_REQUEST_ID] && (
                                      <button
                                        className="btn btn-sm btn-info"
                                        title="View Lab Results"
                                        onClick={() => {
                                          // Navigate to lab results view
                                          navigate(`/doctor/lab-results/view?request_id=${test.LAB_REQUEST_ID}`);
                                        }}
                                      >
                                        <i className="bi bi-eye"></i>
                                        <span className="d-none d-md-inline ms-1">View Results</span>
                                      </button>
                                    )}
                                    
                                    {/* No results yet */}
                                    {test.Status === 'Completed' && !labResults[test.LAB_REQUEST_ID] && (
                                      <span className="badge bg-secondary">No Results</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Note about edit permissions */}
                    <div className="alert alert-info mt-3 mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Note:</strong> You can enter lab results for pending tests. Consultation details are view-only and cannot be modified.
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => handleViewPrescription(selectedConsultation)}
                >
                  <i className="bi bi-prescription me-1"></i>
                  View Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationHistory;