import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const PatientsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    gender: '',
    blood_group: '',
    date_from: '',
    date_to: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    page_size: 10,
    total_pages: 1,
    total_count: 0
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    this_month: 0
  });

  // Fetch patients with filters
  const fetchPatients = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Prepare params
      const params = {
        page: pagination.current_page,
        page_size: pagination.page_size,
        ordering: '-created_at'
      };
      
      // Add filters if provided
      if (filters.search) params.search = filters.search;
      if (filters.gender) params.gender = filters.gender;
      if (filters.blood_group) params.blood_group = filters.blood_group;
      if (filters.date_from) params.created_at__gte = filters.date_from;
      if (filters.date_to) params.created_at__lte = filters.date_to;
      
      // Check URL for search query
      const urlParams = new URLSearchParams(location.search);
      const searchQuery = urlParams.get('search');
      if (searchQuery && !filters.search) {
        params.search = searchQuery;
        setFilters(prev => ({ ...prev, search: searchQuery }));
      }
      
      const response = await receptionApi.getPatients(params);
      
      if (response.data) {
        // Handle different response formats
        let patientsList = [];
        let totalCount = 0;
        let totalPages = 1;
        
        if (response.data.results) {
          // Django REST Framework pagination format
          patientsList = response.data.results;
          totalCount = response.data.count || 0;
          totalPages = Math.ceil(totalCount / pagination.page_size);
        } else if (Array.isArray(response.data)) {
          // Simple array format
          patientsList = response.data;
          totalCount = response.data.length;
        } else {
          // Other formats
          patientsList = [];
        }
        
        setPatients(patientsList);
        setPagination(prev => ({
          ...prev,
          total_pages: totalPages,
          total_count: totalCount
        }));
      }
      
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient stats
  const fetchPatientStats = async () => {
    try {
      const response = await receptionApi.getPatients({ page_size: 1 });
      if (response.data) {
        setStats({
          total: response.data.count || patients.length,
          today: 0, // You'll need an endpoint for this
          this_month: 0 // You'll need an endpoint for this
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
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
      date_to: ''
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
    fetchPatients();
    fetchPatientStats();
  }, [pagination.current_page, location.search]);

  // Quick stats
  const quickStats = [
    { label: 'Total Patients', value: stats.total, icon: 'bi-people', color: 'primary' },
    { label: 'Registered Today', value: stats.today, icon: 'bi-calendar-day', color: 'success' },
    { label: 'This Month', value: stats.this_month, icon: 'bi-calendar-month', color: 'info' },
    { label: 'On This Page', value: patients.length, icon: 'bi-list', color: 'warning' }
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

      {/* Quick Stats */}
      <div className="row mb-4">
        {quickStats.map((stat, index) => (
          <div key={index} className="col-xl-3 col-lg-6 col-md-6 mb-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="text-muted mb-1">{stat.label}</h6>
                    <h3 className="mb-0">{loading ? '-' : stat.value}</h3>
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

      {/* Search & Filters */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">
            <i className="bi bi-funnel me-2"></i>Search & Filters
          </h5>
          
          <form onSubmit={handleApplyFilters}>
            <div className="row g-2 mb-3">
              {/* Search Input */}
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    name="search"
                    className="form-control"
                    placeholder="Search by Name, ID, Phone, Email..."
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
              
              {/* Date Range Filters */}
              <div className="col-md-2">
                <input
                  type="date"
                  name="date_from"
                  className="form-control"
                  placeholder="From Date"
                  value={filters.date_from}
                  onChange={handleFilterChange}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="col-md-2">
                <input
                  type="date"
                  name="date_to"
                  className="form-control"
                  placeholder="To Date"
                  value={filters.date_to}
                  onChange={handleFilterChange}
                  max={new Date().toISOString().split('T')[0]}
                  min={filters.date_from}
                />
              </div>
            </div>
            
            <div className="d-flex justify-content-between">
              <div>
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Total: {pagination.total_count} patients found
                </small>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={handleClearFilters}>
                  <i className="bi bi-x-circle me-1"></i>Clear Filters
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-filter me-1"></i>Apply Filters
                </button>
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
          
          {loading ? (
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
                {filters.search || filters.gender || filters.blood_group 
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
                            PAT-{(patient.PAT_ID || patient.id).toString().padStart(6, '0')}
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
                            {/* View Details */}
                            <Link
                              to={`/reception/patients/view/${patient.PAT_ID || patient.id}`}
                              className="btn btn-outline-info"
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            
                            {/* Edit */}
                            <Link
                              to={`/reception/patients/edit/${patient.PAT_ID || patient.id}`}
                              className="btn btn-outline-primary"
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </Link>
                            
                            {/* Delete */}
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
              
              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="card-footer border-0">
                  <nav aria-label="Page navigation">
                    <ul className="pagination justify-content-center mb-0">
                      <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.current_page - 1)}
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                      
                      {[...Array(pagination.total_pages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Show only nearby pages for large numbers
                        if (
                          pageNum === 1 ||
                          pageNum === pagination.total_pages ||
                          (pageNum >= pagination.current_page - 1 && pageNum <= pagination.current_page + 1)
                        ) {
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
                        }
                        return null;
                      })}
                      
                      <li className={`page-item ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.current_page + 1)}
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                  <div className="text-center mt-2">
                    <small className="text-muted">
                      Page {pagination.current_page} of {pagination.total_pages} • 
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