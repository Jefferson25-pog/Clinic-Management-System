import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const BillsListPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, paid, partial, rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    partial: 0,
    rejected: 0,
    totalRevenue: 0
  });
  const navigate = useNavigate();
  const location = useLocation();
  
  const itemsPerPage = 10;

  // Check URL for filters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlFilter = params.get('status');
    const searchQuery = params.get('search');
    
    if (urlFilter) {
      setFilter(urlFilter);
    }
    
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
    
    fetchBills();
    fetchBillStats();
  }, [location.search, currentPage]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      
      let params = {
        page: currentPage,
        page_size: itemsPerPage
      };
      
      // Apply filters
      if (filter !== 'all') {
        params.pay_status = filter.charAt(0).toUpperCase() + filter.slice(1);
      }
      
      // Apply search
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await receptionApi.getBills(params);
      
      if (response.data) {
        const billsList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        
        setBills(billsList);
        
        // Update pagination
        if (response.data.count) {
          setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        }
      }
      
    } catch (error) {
      console.error('Error fetching bills:', error);
      alert('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillStats = async () => {
    try {
      // Get all bills for stats
      const allResponse = await receptionApi.getBills({ page_size: 1 });
      const pendingResponse = await receptionApi.getBills({ 
        pay_status: 'Pending',
        page_size: 1
      });
      const paidResponse = await receptionApi.getBills({ 
        pay_status: 'Paid',
        page_size: 1
      });
      const partialResponse = await receptionApi.getBills({ 
        pay_status: 'Partial',
        page_size: 1
      });
      const rejectedResponse = await receptionApi.getBills({ 
        pay_status: 'Rejected',
        page_size: 1
      });
      
      // Calculate total revenue (would need all bills in real app)
      const allBillsResponse = await receptionApi.getBills({ page_size: 100 });
      let totalRevenue = 0;
      
      if (allBillsResponse.data) {
        const allBills = Array.isArray(allBillsResponse.data) 
          ? allBillsResponse.data 
          : allBillsResponse.data.results || [];
        
        totalRevenue = allBills.reduce((sum, bill) => 
          sum + parseFloat(bill.Total_Amount || 0), 0
        );
      }
      
      setStats({
        total: allResponse.data?.count || 0,
        pending: pendingResponse.data?.count || 0,
        paid: paidResponse.data?.count || 0,
        partial: partialResponse.data?.count || 0,
        rejected: rejectedResponse.data?.count || 0,
        totalRevenue
      });
      
    } catch (error) {
      console.error('Error fetching bill stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/reception/billing/list?search=${encodeURIComponent(searchTerm)}&status=${filter}`);
    } else {
      navigate(`/reception/billing/list?status=${filter}`);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
    navigate(`/reception/billing/list?status=${newFilter}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`);
  };

  const handleMarkAsPaid = async (billId, billNumber, currentStatus) => {
    if (currentStatus === 'Paid') {
      alert('This bill is already marked as paid');
      return;
    }
    
    const paymentMode = prompt('Enter payment mode (Cash, Card, Online, Insurance):', 'Cash');
    if (!paymentMode || !['Cash', 'Card', 'Online', 'Insurance'].includes(paymentMode)) {
      alert('Invalid payment mode');
      return;
    }
    
    if (window.confirm(`Mark bill ${billNumber} as paid with ${paymentMode}?`)) {
      try {
        await receptionApi.updateBill(billId, { 
          Pay_Status: 'Paid',
          Payment_Mode: paymentMode,
          Payment_Date: new Date().toISOString()
        });
        alert('Bill marked as paid successfully');
        fetchBills();
        fetchBillStats();
      } catch (error) {
        alert('Failed to update bill');
      }
    }
  };

  const handleDeleteBill = async (billId, billNumber) => {
    if (window.confirm(`Are you sure you want to delete bill ${billNumber}? This action cannot be undone.`)) {
      try {
        await receptionApi.deleteBill(billId);
        alert('Bill deleted successfully');
        fetchBills();
        fetchBillStats();
      } catch (error) {
        alert('Failed to delete bill');
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'warning', icon: 'bi-clock' },
      'Paid': { color: 'success', icon: 'bi-check-circle' },
      'Partial': { color: 'info', icon: 'bi-cash-stack' },
      'Insurance Pending': { color: 'primary', icon: 'bi-shield-check' },
      'Rejected': { color: 'danger', icon: 'bi-x-circle' }
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
    <div className="container-fluid">
      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div>
            <h1 className="h2 mb-1">All Bills</h1>
            <p className="text-muted mb-0">
              View, manage, and process patient bills and payments
            </p>
          </div>
        </div>
        <div className="col-lg-4 text-lg-end">
          <Link to="/reception/billing/create" className="btn btn-primary">
            <i className="bi bi-plus-circle me-1"></i> Create New Bill
          </Link>
          <Link to="/reception/billing" className="btn btn-outline-secondary ms-2">
            <i className="bi bi-arrow-left me-1"></i> Back to Billing Hub
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="row mb-4">
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-primary border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Total Bills</h6>
                <h3 className="mb-0">{stats.total}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-warning border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Pending</h6>
                <h3 className="mb-0">{stats.pending}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-success border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Paid</h6>
                <h3 className="mb-0">{stats.paid}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-info border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Partial</h6>
                <h3 className="mb-0">{stats.partial}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-danger border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Rejected</h6>
                <h3 className="mb-0">{stats.rejected}</h3>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 col-6 mb-3">
          <div className="card border-secondary border-start border-4">
            <div className="card-body py-3">
              <div className="text-center">
                <h6 className="text-muted mb-1">Revenue</h6>
                <h3 className="mb-0">{formatCurrency(stats.totalRevenue)}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('pending')}
                >
                  Pending
                </button>
                <button
                  type="button"
                  className={`btn ${filter === 'paid' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleFilterChange('paid')}
                >
                  Paid
                </button>
              </div>
            </div>
            
            <div className="col-md-6 mt-2 mt-md-0">
              <form onSubmit={handleSearch}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by bill no, patient, doctor, or amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="btn btn-primary" type="submit">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="mt-3">
            <small className="text-muted">
              <i className="bi bi-filter me-1"></i>
              Filter: {filter === 'all' ? 'All Bills' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              {searchTerm && ` | Searching: "${searchTerm}"`}
            </small>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-white border-0">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-receipt me-2"></i>
              Bills ({bills.length})
            </h5>
            <div className="d-flex align-items-center">
              <small className="text-muted me-3">Page {currentPage} of {totalPages}</small>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={fetchBills}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading bills...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-receipt display-6 text-muted"></i>
              <h5 className="mt-3">No bills found</h5>
              <p className="text-muted">
                {searchTerm 
                  ? `No bills match your search "${searchTerm}"` 
                  : filter !== 'all' 
                    ? `No ${filter} bills found`
                    : 'No bills generated yet'
                }
              </p>
              <Link to="/reception/billing/create" className="btn btn-primary mt-2">
                <i className="bi bi-plus-circle me-1"></i> Create First Bill
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Bill No</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Amount Details</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.BILL_ID || bill.id}>
                      <td className="align-middle">
                        <strong className="text-primary">
                          BILL-{(bill.BILL_ID || bill.id).toString().padStart(6, '0')}
                        </strong>
                        <div className="text-muted small">
                          Appt: APID-{bill.CONSULT_ID?.TOKEN_NO || 'N/A'}
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="fw-medium">{bill.patient_name || 'N/A'}</div>
                        <small className="text-muted">
                          ID: PAT-{bill.CONSULT_ID?.TOKEN_NO?.PAT_ID || 'N/A'}
                        </small>
                      </td>
                      <td className="align-middle">
                        <div className="fw-medium">Dr. {bill.doctor_name || 'N/A'}</div>
                        <small className="text-muted">
                          {bill.doctor_department || 'General'}
                        </small>
                      </td>
                      <td className="align-middle">
                        <div className="fw-bold text-success">
                          {formatCurrency(bill.Total_Amount)}
                        </div>
                        <div className="text-muted small">
                          <span className="me-2">C: {formatCurrency(bill.Consultation_Cost)}</span>
                          <span className="me-2">M: {formatCurrency(bill.Medicine_Cost)}</span>
                          <span>T: {formatCurrency(bill.LabTest_Cost)}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        {getStatusBadge(bill.Pay_Status)}
                        {bill.Payment_Mode && (
                          <div className="text-muted small mt-1">
                            {bill.Payment_Mode}
                          </div>
                        )}
                      </td>
                      <td className="align-middle">
                        <div>{formatDate(bill.Created_Date)}</div>
                        {bill.Payment_Date && (
                          <small className="text-muted">
                            Paid: {formatDate(bill.Payment_Date)}
                          </small>
                        )}
                      </td>
                      <td className="align-middle">
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => navigate(`/reception/billing/view/${bill.BILL_ID || bill.id}`)}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          
                          {bill.Pay_Status === 'Pending' && (
                            <button 
                              className="btn btn-outline-success"
                              onClick={() => handleMarkAsPaid(
                                bill.BILL_ID || bill.id,
                                `BILL-${(bill.BILL_ID || bill.id).toString().padStart(6, '0')}`,
                                bill.Pay_Status
                              )}
                              title="Mark as Paid"
                            >
                              <i className="bi bi-check"></i>
                            </button>
                          )}
                          
                          <button 
                            className="btn btn-outline-info"
                            onClick={() => {
                              // Print bill functionality
                              const billNumber = (bill.BILL_ID || bill.id).toString().padStart(6, '0');
                              alert(`Printing bill BILL-${billNumber}...`);
                              // window.print(); // Uncomment for actual printing
                            }}
                            title="Print Bill"
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                          
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteBill(
                              bill.BILL_ID || bill.id,
                              `BILL-${(bill.BILL_ID || bill.id).toString().padStart(6, '0')}`
                            )}
                            title="Delete Bill"
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
          )}
        </div>
        
        {/* Pagination */}
        {!loading && bills.length > 0 && totalPages > 1 && (
          <div className="card-footer bg-white border-0">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body py-3">
              <div className="row">
                <div className="col-md-3 text-center border-end">
                  <Link to="/reception/billing/create" className="btn btn-primary w-100">
                    <i className="bi bi-plus-circle me-1"></i> New Bill
                  </Link>
                </div>
                <div className="col-md-3 text-center border-end">
                  <Link to="/reception/billing/list?status=Pending" className="btn btn-outline-warning w-100">
                    <i className="bi bi-clock-history me-1"></i> Pending Bills
                  </Link>
                </div>
                <div className="col-md-3 text-center border-end">
                  <button 
                    className="btn btn-outline-info w-100"
                    onClick={() => {
                      // Export functionality
                      alert('Exporting bills to CSV...');
                    }}
                  >
                    <i className="bi bi-download me-1"></i> Export Bills
                  </button>
                </div>
                <div className="col-md-3 text-center">
                  <Link to="/reception/billing" className="btn btn-outline-secondary w-100">
                    <i className="bi bi-house-door me-1"></i> Billing Hub
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

export default BillsListPage;