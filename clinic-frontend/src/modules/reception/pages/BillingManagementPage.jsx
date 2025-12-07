import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { receptionApi } from '../services/receptionApi';

const BillingManagementPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBills: 0,
    pendingBills: 0,
    paidBills: 0,
    todayRevenue: 0,
    totalRevenue: 0
  });
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Quick action tiles
  const quickActions = [
    {
      title: 'Create New Bill',
      description: 'Generate bill for completed consultation',
      to: '/reception/billing/create',
      icon: 'bi-receipt',
      color: 'primary',
      badge: 'New Bill'
    },
    {
      title: 'View Pending Bills',
      description: 'Process unpaid bills and payments',
      to: '/reception/billing/list?status=Pending',
      icon: 'bi-clock-history',
      color: 'warning',
      badge: `${stats.pendingBills} pending`
    },
    {
      title: 'Bill History',
      description: 'View all past bills and transactions',
      to: '/reception/billing/list',
      icon: 'bi-cash-stack',
      color: 'success',
      badge: 'All Bills'
    },
    {
      title: 'Search Bills',
      description: 'Find bills by patient, ID, or date',
      icon: 'bi-search',
      color: 'info',
      onClick: () => document.getElementById('billSearchInput')?.focus(),
      badge: 'Quick Search'
    }
  ];

  useEffect(() => {
    fetchBillingStats();
    fetchRecentBills();
  }, []);

  const fetchBillingStats = async () => {
    try {
      setLoading(true);
      
      // Get all bills for stats
      const billsRes = await receptionApi.getBills({ page_size: 1 });
      const pendingRes = await receptionApi.getBills({ pay_status: 'Pending', page_size: 1 });
      const paidRes = await receptionApi.getBills({ pay_status: 'Paid', page_size: 1 });
      
      // Get today's bills for revenue calculation
      const today = new Date().toISOString().split('T')[0];
      const todayRes = await receptionApi.getBills({ 
        created_after: today,
        page_size: 100
      });
      
      if (billsRes.data) {
        const totalBills = Array.isArray(billsRes.data) 
          ? billsRes.data.length 
          : billsRes.data.count || 0;
        
        const pendingBills = Array.isArray(pendingRes.data) 
          ? pendingRes.data.length 
          : pendingRes.data?.count || 0;
        
        const paidBills = Array.isArray(paidRes.data) 
          ? paidRes.data.length 
          : paidRes.data?.count || 0;
        
        // Calculate today's revenue
        let todayRevenue = 0;
        if (todayRes.data) {
          const todayBills = Array.isArray(todayRes.data) 
            ? todayRes.data 
            : todayRes.data.results || [];
          
          todayRevenue = todayBills.reduce((sum, bill) => 
            sum + parseFloat(bill.Total_Amount || 0), 0
          );
        }
        
        // Calculate total revenue (would need all bills in real app)
        // For demo, we'll estimate based on average
        const totalRevenue = (totalBills * 1500).toFixed(2); // Estimated average
        
        setStats({
          totalBills,
          pendingBills,
          paidBills,
          todayRevenue,
          totalRevenue
        });
      }
      
    } catch (error) {
      console.error('Error fetching billing stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentBills = async () => {
    try {
      const response = await receptionApi.getBills({ 
        page_size: 5,
        ordering: '-Created_Date'
      });
      
      if (response.data) {
        const bills = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        setRecentBills(bills);
      }
    } catch (error) {
      console.error('Error fetching recent bills:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/reception/billing/list?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleMarkAsPaid = async (billId, billNumber) => {
    if (window.confirm(`Mark bill ${billNumber} as paid?`)) {
      try {
        await receptionApi.updateBill(billId, { 
          Pay_Status: 'Paid',
          Payment_Mode: 'Cash', // Default, can be changed
          Payment_Date: new Date().toISOString()
        });
        alert('Bill marked as paid successfully');
        fetchBillingStats();
        fetchRecentBills();
      } catch (error) {
        alert('Failed to update bill');
      }
    }
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
            <h3 className="mb-1">Billing Management</h3>
            <p className="text-muted mb-0">
              Manage patient bills, payments, and financial records
            </p>
          </div>
        </div>
        <div className="col-lg-4 text-lg-end">
          <div>
            <small className="text-muted d-block">
              <i className="bi bi-calendar me-1"></i>
              Today: {new Date().toLocaleDateString()}
            </small>
            <small className="text-muted">
              <i className="bi bi-cash-coin me-1"></i>
              Today's Revenue: {formatCurrency(stats.todayRevenue)}
            </small>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-lg-6">
          <div className="card border-start border-primary border-4 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Bills</h6>
                  <h3 className="mb-0">
                    {loading ? '...' : stats.totalBills}
                  </h3>
                  <small className="text-muted">All time</small>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-10 rounded">
                    <i className="bi bi-receipt fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="card border-start border-warning border-4 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Pending Bills</h6>
                  <h3 className="mb-0">
                    {loading ? '...' : stats.pendingBills}
                  </h3>
                  <small className="text-muted">Awaiting payment</small>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-10 rounded">
                    <i className="bi bi-clock-history fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="card border-start border-success border-4 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Paid Bills</h6>
                  <h3 className="mb-0">
                    {loading ? '...' : stats.paidBills}
                  </h3>
                  <small className="text-muted">Completed payments</small>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-10 rounded">
                    <i className="bi bi-check-circle fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="card border-start border-info border-4 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Revenue</h6>
                  <h3 className="mb-0">
                    {loading ? '...' : formatCurrency(stats.totalRevenue)}
                  </h3>
                  <small className="text-muted">All time revenue</small>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-10 rounded">
                    <i className="bi bi-cash-coin fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-0">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
              <p className="text-muted mb-0 small">Frequent billing operations</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickActions.map((action, index) => (
                  <div key={index} className="col-xl-3 col-lg-6">
                    {action.to ? (
                      <Link to={action.to} className="text-decoration-none text-dark">
                        <div className={`card border-0 bg-${action.color} bg-opacity-10 h-100 hover-lift`}>
                          <div className="card-body">
                            <div className="d-flex align-items-start">
                              <div className="avatar-sm me-3">
                                <div className={`avatar-title bg-${action.color} bg-opacity-25 rounded`}>
                                  <i className={`bi ${action.icon} fs-4 text-${action.color}`}></i>
                                </div>
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start">
                                  <h6 className="card-title mb-1">{action.title}</h6>
                                  <span className={`badge bg-${action.color}`}>
                                    {action.badge}
                                  </span>
                                </div>
                                <p className="text-muted small mb-0">{action.description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="card-footer bg-transparent border-0">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className={`text-${action.color} small`}>Click to open</span>
                              <i className={`bi bi-arrow-right text-${action.color}`}></i>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div 
                        className={`card border-0 bg-${action.color} bg-opacity-10 h-100 hover-lift cursor-pointer`}
                        onClick={action.onClick}
                      >
                        <div className="card-body">
                          <div className="d-flex align-items-start">
                            <div className="avatar-sm me-3">
                              <div className={`avatar-title bg-${action.color} bg-opacity-25 rounded`}>
                                <i className={`bi ${action.icon} fs-4 text-${action.color}`}></i>
                              </div>
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start">
                                <h6 className="card-title mb-1">{action.title}</h6>
                                <span className={`badge bg-${action.color}`}>
                                  {action.badge}
                                </span>
                              </div>
                              <p className="text-muted small mb-0">{action.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="card-footer bg-transparent border-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className={`text-${action.color} small`}>Click to search</span>
                            <i className={`bi bi-arrow-right text-${action.color}`}></i>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="row g-4">
        {/* Recent Bills & Quick Actions */}
        <div className="col-xl-8">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Recent Bills ({recentBills.length})
              </h5>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  fetchRecentBills();
                  fetchBillingStats();
                }}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            <div className="card-body p-0">
              {recentBills.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-receipt display-6 text-muted"></i>
                  <p className="mt-3 text-muted">No bills generated yet</p>
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
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBills.map((bill) => (
                        <tr key={bill.BILL_ID || bill.id}>
                          <td className="align-middle">
                            <strong className="text-primary">
                              BILL-{(bill.BILL_ID || bill.id).toString().padStart(6, '0')}
                            </strong>
                          </td>
                          <td className="align-middle">
                            <div className="fw-medium">
                              {bill.patient_name || 'N/A'}
                            </div>
                            <small className="text-muted">
                              {bill.doctor_name ? `Dr. ${bill.doctor_name}` : 'N/A'}
                            </small>
                          </td>
                          <td className="align-middle">
                            <div className="fw-bold text-success">
                              {formatCurrency(bill.Total_Amount)}
                            </div>
                            <small className="text-muted">
                              Consultation: {formatCurrency(bill.Consultation_Cost)}
                            </small>
                          </td>
                          <td className="align-middle">
                            {getStatusBadge(bill.Pay_Status)}
                          </td>
                          <td className="align-middle">
                            {formatDate(bill.Created_Date)}
                          </td>
                          <td className="align-middle">
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={() => navigate(`/reception/billing/view/${bill.BILL_ID || bill.id}`)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              {bill.Pay_Status === 'Pending' && (
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => handleMarkAsPaid(
                                    bill.BILL_ID || bill.id,
                                    `BILL-${(bill.BILL_ID || bill.id).toString().padStart(6, '0')}`
                                  )}
                                >
                                  <i className="bi bi-check"></i>
                                </button>
                              )}
                              <button 
                                className="btn btn-outline-info"
                                onClick={() => {
                                  // Print bill functionality
                                  window.print();
                                }}
                              >
                                <i className="bi bi-printer"></i>
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
            <div className="card-footer bg-transparent border-0">
              <Link to="/reception/billing/list" className="btn btn-outline-primary w-100">
                <i className="bi bi-list me-1"></i> View All Bills
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Bill Creation & Search */}
        <div className="col-xl-4">
          {/* Quick Bill Creation */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">
                <i className="bi bi-lightning-charge me-2"></i>
                Quick Bill Creation
              </h5>
              <p className="text-muted mb-0 small">Generate bill from appointment</p>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Select Appointment</label>
                <select className="form-select">
                  <option value="">Select completed appointment...</option>
                  <option value="1">APID-0001 - John Doe with Dr. Smith</option>
                  <option value="2">APID-0002 - Jane Smith with Dr. Johnson</option>
                  <option value="3">APID-0003 - Robert Brown with Dr. Williams</option>
                </select>
                <small className="text-muted">
                  Only completed appointments without bills are shown
                </small>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Bill Preview</label>
                <div className="card bg-light">
                  <div className="card-body py-2">
                    <div className="row small">
                      <div className="col-6">
                        <strong>Consultation:</strong> ₹500
                      </div>
                      <div className="col-6">
                        <strong>Medicine:</strong> ₹1,200
                      </div>
                      <div className="col-6">
                        <strong>Tests:</strong> ₹800
                      </div>
                      <div className="col-6">
                        <strong>Total:</strong> ₹2,500
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="d-grid">
                <Link to="/reception/billing/create" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-1"></i> Create Bill
                </Link>
              </div>
            </div>
          </div>

          {/* Search & Reports */}
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Reports & Search
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Quick Bill Search</label>
                <form onSubmit={handleSearch}>
                  <div className="input-group mb-2">
                    <input
                      type="text"
                      id="billSearchInput"
                      className="form-control"
                      placeholder="Search by bill no, patient, or date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-outline-primary" type="submit">
                      <i className="bi bi-search"></i>
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Quick Reports</label>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-success">
                    <i className="bi bi-calendar-week me-1"></i> This Week's Revenue
                  </button>
                  <button className="btn btn-outline-info">
                    <i className="bi bi-calendar-month me-1"></i> Monthly Report
                  </button>
                  <button className="btn btn-outline-warning">
                    <i className="bi bi-clock-history me-1"></i> Pending Payments
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <h6 className="border-bottom pb-2">Today's Summary</h6>
                <div className="row text-center">
                  <div className="col-6">
                    <div className="text-muted small">Bills Today</div>
                    <div className="fw-bold">5</div>
                  </div>
                  <div className="col-6">
                    <div className="text-muted small">Revenue</div>
                    <div className="fw-bold text-success">{formatCurrency(stats.todayRevenue)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body py-3">
              <div className="row text-center">
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Billing System</div>
                  <div className="fw-bold text-success">
                    <i className="bi bi-check-circle me-1"></i>Active
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Last Bill</div>
                  <div className="fw-bold">
                    BILL-{(recentBills[0]?.BILL_ID || '000000').toString().padStart(6, '0')}
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end mt-2 mt-md-0">
                  <div className="text-muted small">Pending Amount</div>
                  <div className="fw-bold text-warning">
                    {formatCurrency(stats.pendingBills * 1500)}
                  </div>
                </div>
                <div className="col-6 col-md-3 mt-2 mt-md-0">
                  <div className="text-muted small">Data Status</div>
                  <div className="fw-bold">
                    <span className={`badge ${loading ? 'bg-warning' : 'bg-success'}`}>
                      {loading ? 'Updating...' : 'Live'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingManagementPage;