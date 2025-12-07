// src/modules/reception/components/DoctorAvailability.jsx
import React, { useState, useEffect } from "react";
import { receptionApi } from "../services/receptionApi";

const DoctorAvailability = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("all");

  useEffect(() => {
    fetchAvailableDoctors();
  }, []);

  const fetchAvailableDoctors = async () => {
    try {
      setLoading(true);
      const response = await receptionApi.getAvailableDoctors();
      
      if (response.data) {
        // Handle both response formats
        const doctorsData = response.data.doctors || response.data || [];
        setDoctors(Array.isArray(doctorsData) ? doctorsData : [doctorsData]);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group doctors by department
  const doctorsByDept = doctors.reduce((acc, doctor) => {
    const dept = doctor.Department?.Department_Name || "No Department";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(doctor);
    return acc;
  }, {});

  // Filter based on selected department
  const filteredDoctors = selectedDept === "all" 
    ? doctors 
    : doctors.filter(doc => 
        doc.Department?.Department_Name === selectedDept || 
        (selectedDept === "No Department" && !doc.Department)
      );

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'Available': { color: 'success', icon: 'bi-check-circle' },
      'Busy': { color: 'warning', icon: 'bi-clock' },
      'On Leave': { color: 'danger', icon: 'bi-calendar-x' },
      'Off Duty': { color: 'secondary', icon: 'bi-moon' },
      'In Surgery': { color: 'info', icon: 'bi-heart-pulse' },
      'In Consultation': { color: 'primary', icon: 'bi-person-lines-fill' }
    };
    
    const config = statusConfig[status] || { color: 'secondary', icon: 'bi-question-circle' };
    
    return (
      <span className={`badge bg-${config.color}`}>
        <i className={`bi ${config.icon} me-1`}></i>
        {status}
      </span>
    );
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-person-check me-2"></i>
          Doctor Availability
        </h5>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={fetchAvailableDoctors}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>
      <div className="card-body">
        {/* Department Filter */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <label className="form-label mb-0">Filter by Department</label>
            <span className="badge bg-info">
              {filteredDoctors.length} doctors available
            </span>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button 
              className={`btn ${selectedDept === 'all' ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
              onClick={() => setSelectedDept('all')}
            >
              All Departments
            </button>
            {Object.keys(doctorsByDept).map(dept => (
              <button
                key={dept}
                className={`btn ${selectedDept === dept ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                onClick={() => setSelectedDept(dept)}
              >
                {dept} ({doctorsByDept[dept].length})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading doctor availability...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-person-x display-6 text-muted"></i>
            <p className="mt-2 text-muted">No doctors available with current filter</p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredDoctors.map(doctor => (
              <div key={doctor.STAFF_ID} className="col-xl-4 col-lg-6">
                <div className={`card border h-100 ${
                  doctor.Status === 'Available' ? 'border-success' :
                  doctor.Status === 'Busy' ? 'border-warning' :
                  'border-secondary'
                }`}>
                  <div className="card-body">
                    <div className="d-flex align-items-start mb-3">
                      <div className="flex-shrink-0">
                        <div className={`avatar-lg rounded-circle d-flex align-items-center justify-content-center ${
                          doctor.Status === 'Available' ? 'bg-success bg-opacity-10' :
                          doctor.Status === 'Busy' ? 'bg-warning bg-opacity-10' :
                          'bg-secondary bg-opacity-10'
                        }`}>
                          <i className={`bi bi-person-heart fs-3 ${
                            doctor.Status === 'Available' ? 'text-success' :
                            doctor.Status === 'Busy' ? 'text-warning' :
                            'text-secondary'
                          }`}></i>
                        </div>
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <h6 className="mb-1">Dr. {doctor.Name}</h6>
                        <p className="text-muted small mb-2">
                          {doctor.Department?.Department_Name || "No Department"}
                        </p>
                        <div className="mb-2">
                          {getStatusBadge(doctor.Status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="text-muted small">Consultation Fee</div>
                        <div className="fw-bold text-primary">
                          ₹{doctor.Consultation_fees || 0}
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted small">Experience</div>
                        <div className="fw-bold">
                          {doctor.Experience || 0} years
                        </div>
                      </div>
                    </div>
                    
                    <div className="small text-muted mb-3">
                      <div className="d-flex align-items-center mb-1">
                        <i className="bi bi-telephone me-2"></i>
                        {doctor.Phone_Number || "N/A"}
                      </div>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-envelope me-2"></i>
                        {doctor.Email || "N/A"}
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-between">
                      <span className="small text-muted">
                        ID: {doctor.STAFF_ID}
                      </span>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          // Action for selecting this doctor
                          console.log("Selected doctor:", doctor);
                        }}
                        disabled={doctor.Status !== 'Available'}
                      >
                        {doctor.Status === 'Available' ? (
                          <>
                            <i className="bi bi-calendar-plus me-1"></i> Book
                          </>
                        ) : (
                          "Not Available"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card-footer bg-transparent border-0">
        <div className="row">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click <strong>Book</strong> to schedule appointment with available doctors
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorAvailability;