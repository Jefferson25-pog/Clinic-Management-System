// src/modules/reception/pages/patients/PatientsListPage.jsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const PatientsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState({
    stats: true,
    list: true
  });
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Filters state - UPDATED WITH MORE OPTIONS
  const [filters, setFilters] = useState({
    search: '',
    gender: '',
    blood_group: '',
    date_from: '',
    date_to: '',
    min_age: '',
    max_age: '',
    ordering: '-created_at'
  });
  
  // Pagination - UPDATED
  const [pagination, setPagination] = useState({
    current_page: 1,
    page_size: 10,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_previous: false
  });

  // Stats - UPDATED WITH MORE DETAILS
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    this_month: 0,
    last_7_days: 0,
    gender_stats: {},
    blood_group_stats: {},
    recent_registrations: []
  });

  // Fetch patient stats - UPDATED
  const fetchPatients = async () => {
  setLoading(prev => ({ ...prev, list: true }));
  setError('');
  
  try {
    // Prepare params
    const params = {
      page: pagination.current_page,
      page_size: pagination.page_size,
      ordering: filters.ordering || '-created_at'
    };
    
    // Add filters if provided
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== '') {
        params[key] = filters[key];
      }
    });
    
    // Check URL for search query
    const urlParams = new URLSearchParams(location.search);
    const searchQuery = urlParams.get('search');
    if (searchQuery && !filters.search) {
      params.search = searchQuery;
      setFilters(prev => ({ ...prev, search: searchQuery }));
    }
    
    // Use advanced search if any filter is active
    const hasFilters = Object.keys(filters).some(key => 
      filters[key] && filters[key] !== '' && key !== 'ordering'
    );
    
    const response = hasFilters 
      ? await receptionApi.getPatientsAdvanced(params)
      : await receptionApi.getPatients(params);
    
    if (response.data) {
      // Handle new advanced search format
      if (response.data.results) {
        setPatients(response.data.results);
        setPagination(prev => ({
          ...prev,
          total_pages: response.data.total_pages || 1,
          total_count: response.data.count || 0,
          has_next: response.data.has_next || false,
          has_previous: response.data.has_previous || false
        }));
      } else if (Array.isArray(response.data)) {
        // Simple array format (regular endpoint)
        setPatients(response.data);
        setPagination(prev => ({
          ...prev,
          total_count: response.data.length
        }));
      }
    }
    
  } catch (err) {
    console.error('Error fetching patients:', err);
    setError('Failed to load patients. Please try again.');
  } finally {
    setLoading(prev => ({ ...prev, list: false }));
  }
};

const fetchPatientStats = async () => {
  setLoading(prev => ({ ...prev, stats: true }));
  
  try {
    const response = await receptionApi.getPatientStats();
    if (response.data) {
      setStats(response.data);
    }
  } catch (err) {
    console.error('Error fetching patient stats:', err);
  } finally {
    setLoading(prev => ({ ...prev, stats: false }));
  }
};

  // Delete patient
  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    
    try {
      await receptionApi.deletePatient(selectedPatient.PAT_ID || selectedPatient.id);
      
      // Refresh the list
      fetchPatients();
      fetchPatientStats();
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedPatient(null);
      
      alert('Patient deleted successfully!');
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Failed to delete patient. Please try again.');
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Apply filters
  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to page 1
    fetchPatients();
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      gender: '',
      blood_group: '',
      date_from: '',
      date_to: '',
      min_age: '',
      max_age: '',
      ordering: '-created_at'
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
    fetchPatients();
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  // Calculate patient age
  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return 'N/A';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format phone number
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0,5)} ${cleaned.slice(5)}`;
    }
    return phone;
  };

  // Initial data fetch
  useEffect(() => {
    fetchPatientStats();
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [pagination.current_page, location.search]);

  // Update fetch when filters change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading.list) {
        fetchPatients();
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Quick stats - UPDATED WITH MORE STATS
  const quickStats = [
    { 
      label: 'Total Patients', 
      value: stats.total, 
      icon: 'bi-people', 
      color: 'primary',
      subtext: `Registered in system`
    },
    { 
      label: 'Today', 
      value: stats.today, 
      icon: 'bi-calendar-day', 
      color: 'success',
      subtext: `New registrations`
    },
    { 
      label: 'This Month', 
      value: stats.this_month, 
      icon: 'bi-calendar-month', 
      color: 'info',
      subtext: `Monthly registrations`
    },
    { 
      label: 'Last 7 Days', 
      value: stats.last_7_days, 
      icon: 'bi-graph-up', 
      color: 'warning',
      subtext: `Recent activity`
    }
  ];

  // Gender options
  const genderOptions = [
    { value: '', label: 'All Genders' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ];

  // Blood group options
  const bloodGroupOptions = [
    { value: '', label: 'All Blood Groups' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];

  // Ordering options
  const orderingOptions = [
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
    { value: 'Patient_Name', label: 'Name A-Z' },
    { value: '-Patient_Name', label: 'Name Z-A' },
    { value: 'PAT_ID', label: 'Patient ID Asc' },
    { value: '-PAT_ID', label: 'Patient ID Desc' }
  ];

  return (
    <div className="container-fluid">
      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="mb-1">Patients Management</h3>
              <p className="text-muted mb-0">
                View, search, and manage all patient records
              </p>
            </div>
            <div>
              <Link to="/reception/patients/add" className="btn btn-primary">
                <i className="bi bi-person-plus me-2"></i>Add New Patient
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - IMPROVED */}
      <div className="row mb-4">
        {quickStats.map((stat, index) => (
          <div key={index} className="col-xl-3 col-lg-6 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-1">{stat.label}</h6>
                    <h3 className="mb-0">
                      {loading.stats ? (
                        <span className="placeholder col-6"></span>
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </h3>
                    <small className="text-muted">
                      {stat.subtext}
                    </small>
                  </div>
                  <div className={`avatar-sm bg-${stat.color} bg-opacity-10 rounded`}>
                    <i className={`bi ${stat.icon} fs-4 text-${stat.color}`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats Row */}
      {!loading.stats && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body py-2">
                <div className="row text-center">
                  <div className="col-md-3 border-end">
                    <small className="text-muted">Male Patients</small>
                    <div className="fw-bold text-primary">
                      {stats.gender_stats.Male || 0}
                    </div>
                  </div>
                  <div className="col-md-3 border-end">
                    <small className="text-muted">Female Patients</small>
                    <div className="fw-bold text-pink">
                      {stats.gender_stats.Female || 0}
                    </div>
                  </div>
                  <div className="col-md-3 border-end">
                    <small className="text-muted">O+ Blood Group</small>
                    <div className="fw-bold text-danger">
                      {stats.blood_group_stats['O+'] || 0}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <small className="text-muted">A+ Blood Group</small>
                    <div className="fw-bold text-danger">
                      {stats.blood_group_stats['A+'] || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters - IMPROVED */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-funnel me-2"></i>Search & Filters
          </h5>
          
          <form onSubmit={handleApplyFilters}>
            <div className="row g-2 mb-3">
              {/* Search Input */}
              <div className="col-md-3">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    name="search"
                    className="form-control"
                    placeholder="Search patients..."
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
              
              {/* Gender Filter */}
              <div className="col-md-2">
                <select
                  name="gender"
                  className="form-select"
                  value={filters.gender}
                  onChange={handleFilterChange}
                >
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Blood Group Filter */}
              <div className="col-md-2">
                <select
                  name="blood_group"
                  className="form-select"
                  value={filters.blood_group}
                  onChange={handleFilterChange}
                >
                  {bloodGroupOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Age Range Filters */}
              <div className="col-md-2">
                <input
                  type="number"
                  name="min_age"
                  className="form-control"
                  placeholder="Min Age"
                  value={filters.min_age}
                  onChange={handleFilterChange}
                  min="0"
                  max="120"
                />
              </div>
              
              <div className="col-md-2">
                <input
                  type="number"
                  name="max_age"
                  className="form-control"
                  placeholder="Max Age"
                  value={filters.max_age}
                  onChange={handleFilterChange}
                  min="0"
                  max="120"
                />
              </div>
              
              {/* Ordering */}
              <div className="col-md-1">
                <select
                  name="ordering"
                  className="form-select"
                  value={filters.ordering}
                  onChange={handleFilterChange}
                >
                  {orderingOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="row g-2 mb-3">
              {/* Date Range Filters */}
              <div className="col-md-3">
                <label className="form-label small mb-1">From Date</label>
                <input
                  type="date"
                  name="date_from"
                  className="form-control"
                  value={filters.date_from}
                  onChange={handleFilterChange}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label small mb-1">To Date</label>
                <input
                  type="date"
                  name="date_to"
                  className="form-control"
                  value={filters.date_to}
                  onChange={handleFilterChange}
                  max={new Date().toISOString().split('T')[0]}
                  min={filters.date_from}
                />
              </div>
              
              <div className="col-md-6 d-flex align-items-end">
                <div className="d-flex gap-2 w-100">
                  <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={handleClearFilters}>
                    <i className="bi bi-x-circle me-1"></i>Clear All
                  </button>
                  <button type="submit" className="btn btn-primary flex-grow-1">
                    <i className="bi bi-filter me-1"></i>Apply Filters
                  </button>
                </div>
              </div>
            </div>
            
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Total: {loading.list ? 'Loading...' : `${pagination.total_count} patients found`}
                </small>
              </div>
              <div>
                <small className="text-muted">
                  Page {pagination.current_page} of {pagination.total_pages}
                </small>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && (
            <div className="alert alert-danger m-3">{error}</div>
          )}
          
          {loading.list ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people display-1 text-muted"></i>
              <h5 className="mt-3">No Patients Found</h5>
              <p className="text-muted mb-4">
                {Object.values(filters).some(val => val) 
                  ? 'No patients match your search criteria.' 
                  : 'No patients in the system yet.'}
              </p>
              <Link to="/reception/patients/add" className="btn btn-primary">
                <i className="bi bi-person-plus me-1"></i>Add First Patient
              </Link>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Age</th>
                      <th>Phone</th>
                      <th>Blood Group</th>
                      <th>Registered On</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.PAT_ID || patient.id}>
                        <td>
                          <span className="badge bg-secondary">
                            {patient.PAT_ID || `PAT-${patient.id.toString().padStart(3, '0')}`}
                          </span>
                        </td>
                        <td>
                          <div className="fw-medium">{patient.Patient_Name}</div>
                          <small className="text-muted">{patient.Email || 'No email'}</small>
                        </td>
                        <td>
                          <span className={`badge ${
                            patient.Gender === 'Male' ? 'bg-primary' : 
                            patient.Gender === 'Female' ? 'bg-pink' : 'bg-secondary'
                          }`}>
                            {patient.Gender || 'N/A'}
                          </span>
                        </td>
                        <td>{calculateAge(patient.DOB)} yrs</td>
                        <td>{formatPhone(patient.Phone_Number)}</td>
                        <td>
                          {patient.Blood_Group ? (
                            <span className="badge bg-danger">{patient.Blood_Group}</span>
                          ) : 'N/A'}
                        </td>
                        <td>
                          <small>{formatDate(patient.created_at)}</small>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/reception/patients/view/${patient.PAT_ID || patient.id}`}
                              className="btn btn-outline-info"
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <Link
                              to={`/reception/patients/edit/${patient.PAT_ID || patient.id}`}
                              className="btn btn-outline-primary"
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </Link>
                            <button
                              className="btn btn-outline-danger"
                              title="Delete"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setShowDeleteModal(true);
                              }}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination - IMPROVED */}
              {pagination.total_pages > 1 && (
                <div className="card-footer border-0">
                  <nav aria-label="Page navigation">
                    <ul className="pagination justify-content-center mb-0">
                      <li className={`page-item ${!pagination.has_previous ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.current_page - 1)}
                          disabled={!pagination.has_previous}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.current_page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.current_page >= pagination.total_pages - 2) {
                          pageNum = pagination.total_pages - 4 + i;
                        } else {
                          pageNum = pagination.current_page - 2 + i;
                        }
                        
                        return (
                          <li
                            key={pageNum}
                            className={`page-item ${pagination.current_page === pageNum ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      })}
                      
                      <li className={`page-item ${!pagination.has_next ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.current_page + 1)}
                          disabled={!pagination.has_next}
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                  <div className="text-center mt-2">
                    <small className="text-muted">
                      Showing {patients.length} of {pagination.total_count} patients
                    </small>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPatient && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPatient(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete patient{' '}
                  <strong>{selectedPatient.Patient_Name}</strong> (PAT-
                  {(selectedPatient.PAT_ID || selectedPatient.id).toString().padStart(6, '0')})?
                </p>
                <p className="text-danger">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  This action cannot be undone. All patient records, appointments, and bills will be permanently deleted.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPatient(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeletePatient}
                >
                  <i className="bi bi-trash me-1"></i>Delete Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsListPage;