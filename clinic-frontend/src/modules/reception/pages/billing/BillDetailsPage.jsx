import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const BillDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    Payment_Mode: 'Cash',
    Paid_Amount: 0,
    Transaction_ID: ''
  });

  useEffect(() => {
    fetchBillDetails();
  }, [id]);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      const response = await receptionApi.getBillById(id);
      if (response.data) {
        setBill(response.data);
        
        // Set payment data from bill
        setPaymentData({
          Payment_Mode: response.data.Payment_Mode || 'Cash',
          Paid_Amount: parseFloat(response.data.Total_Amount || 0),
          Transaction_ID: response.data.Transaction_ID || ''
        });
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      alert('Bill not found');
      navigate('/reception/billing/list');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!paymentData.Payment_Mode) {
      alert('Please select a payment mode');
      return;
    }
    
    if (paymentData.Paid_Amount <= 0) {
      alert('Paid amount must be greater than 0');
      return;
    }
    
    if (window.confirm(`Mark bill as paid with ${paymentData.Payment_Mode}?`)) {
      setUpdating(true);
      
      try {
        const updateData = {
          Pay_Status: paymentData.Paid_Amount >= (bill?.Total_Amount || 0) ? 'Paid' : 'Partial',
          Payment_Mode: paymentData.Payment_Mode,
          Payment_Date: new Date().toISOString(),
          Transaction_ID: paymentData.Transaction_ID || null
        };
        
        await receptionApi.updateBill(id, updateData);
        alert('Bill payment recorded successfully!');
        setShowPaymentModal(false);
        fetchBillDetails();
        
      } catch (error) {
        console.error('Error updating bill:', error);
        alert('Failed to update bill');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handlePrintBill = () => {
    // Print bill functionality
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill ${bill?.BILL_ID ? `BILL-${bill.BILL_ID.toString().padStart(6, '0')}` : 'Print'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .bill-info { margin-bottom: 20px; }
            .amount-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .amount-table th, .amount-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .amount-table th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 1.2em; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>HOSPITAL BILL</h2>
            <h3>Bill No: BILL-${bill?.BILL_ID ? bill.BILL_ID.toString().padStart(6, '0') : 'N/A'}</h3>
          </div>
          
          <div class="bill-info">
            <p><strong>Patient:</strong> ${bill?.patient_name || 'N/A'}</p>
            <p><strong>Doctor:</strong> ${bill?.doctor_name ? 'Dr. ' + bill.doctor_name : 'N/A'}</p>
            <p><strong>Date:</strong> ${bill?.Created_Date ? new Date(bill.Created_Date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Status:</strong> ${bill?.Pay_Status || 'N/A'}</p>
          </div>
          
          <table class="amount-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Consultation Charges</td>
                <td>${parseFloat(bill?.Consultation_Cost || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Medicine Charges</td>
                <td>${parseFloat(bill?.Medicine_Cost || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Lab Test Charges</td>
                <td>${parseFloat(bill?.LabTest_Cost || 0).toFixed(2)}</td>
              </tr>
              <tr class="total">
                <td>TOTAL AMOUNT</td>
                <td>${parseFloat(bill?.Total_Amount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Thank you for your payment</p>
            <p>Hospital Address | Contact: 123-456-7890 | Email: billing@hospital.com</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="no-print">
            <button onclick="window.print()">Print Bill</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    alert('PDF download functionality would be implemented here');
    // In a real application, this would generate and download a PDF
  };

  const handleDeleteBill = async () => {
    if (window.confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
      try {
        await receptionApi.deleteBill(id);
        alert('Bill deleted successfully');
        navigate('/reception/billing/list');
      } catch (error) {
        alert('Failed to delete bill');
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      <span className={`badge bg-${config.color} px-3 py-2 fs-6`}>
        <i className={`bi ${config.icon} me-2`}></i>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          Bill not found. Please check the bill ID.
        </div>
      </div>
    );
  }

  const billId = bill.BILL_ID || bill.id;

  return (
    <div className="container-fluid">
      
      {/* Bill Header */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div className="d-flex align-items-start">
            <div className="avatar-xxl me-4">
              <div className="avatar-title bg-primary bg-opacity-10 rounded-circle">
                <i className="bi bi-receipt fs-1 text-primary"></i>
              </div>
            </div>
            <div className="flex-grow-1">
              <h1 className="h2 mb-1">Bill Details</h1>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className="badge bg-primary fs-6">
                  BILL-{billId.toString().padStart(6, '0')}
                </span>
                {getStatusBadge(bill.Pay_Status)}
                <span className="badge bg-secondary fs-6">
                  {bill.Payment_Mode || 'Payment not set'}
                </span>
              </div>
              <p className="text-muted mb-0">
                <i className="bi bi-calendar me-1"></i>
                Created: {formatDate(bill.Created_Date)}
                {bill.Payment_Date && (
                  <>
                    {' | '}
                    <i className="bi bi-cash-coin me-1"></i>
                    Paid: {formatDate(bill.Payment_Date)}
                  </>
                )}
              </p>
            </div>
            <div className="text-end">
              <div className="btn-group">
                <button 
                  className="btn btn-outline-primary"
                  onClick={handlePrintBill}
                >
                  <i className="bi bi-printer me-1"></i> Print
                </button>
                <button 
                  className="btn btn-outline-info"
                  onClick={handleDownloadPDF}
                >
                  <i className="bi bi-download me-1"></i> PDF
                </button>
                {bill.Pay_Status !== 'Paid' && (
                  <button 
                    className="btn btn-outline-success"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <i className="bi bi-cash-coin me-1"></i> Mark Paid
                  </button>
                )}
                <button 
                  className="btn btn-outline-danger"
                  onClick={handleDeleteBill}
                >
                  <i className="bi bi-trash me-1"></i> Delete
                </button>
              </div>
              <div className="mt-2">
                <Link 
                  to="/reception/billing/list"
                  className="btn btn-outline-secondary btn-sm"
                >
                  <i className="bi bi-arrow-left me-1"></i> Back to Bills
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Details */}
      <div className="row">
        <div className="col-lg-8">
          {/* Amount Breakdown */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="bi bi-cash-stack me-2"></i>
                Amount Breakdown
              </h5>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Consultation Charges:</span>
                    <span className="fw-bold">{formatCurrency(bill.Consultation_Cost)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Medicine Charges:</span>
                    <span className="fw-bold">{formatCurrency(bill.Medicine_Cost)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Lab Test Charges:</span>
                    <span className="fw-bold">{formatCurrency(bill.LabTest_Cost)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Subtotal:</span>
                    <span className="fw-bold">
                      {formatCurrency(
                        parseFloat(bill.Consultation_Cost || 0) + 
                        parseFloat(bill.Medicine_Cost || 0) + 
                        parseFloat(bill.LabTest_Cost || 0)
                      )}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span>Additional Charges:</span>
                    <span>+{formatCurrency(bill.Additional_Charges || 0)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 text-danger">
                    <span>Discount:</span>
                    <span>-{formatCurrency(bill.Discount || 0)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between">
                    <h5 className="mb-0">Total Amount:</h5>
                    <h3 className="mb-0 text-success">{formatCurrency(bill.Total_Amount)}</h3>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="card bg-light h-100">
                    <div className="card-body">
                      <h6 className="card-title">Payment Information</h6>
                      <div className="mb-3">
                        <small className="text-muted">Payment Status</small>
                        <div>{getStatusBadge(bill.Pay_Status)}</div>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Payment Mode</small>
                        <div className="fw-bold">{bill.Payment_Mode || 'Not specified'}</div>
                      </div>
                      {bill.Transaction_ID && (
                        <div className="mb-3">
                          <small className="text-muted">Transaction ID</small>
                          <div className="fw-bold">{bill.Transaction_ID}</div>
                        </div>
                      )}
                      {bill.Payment_Date && (
                        <div className="mb-3">
                          <small className="text-muted">Payment Date</small>
                          <div className="fw-bold">{formatDate(bill.Payment_Date)}</div>
                        </div>
                      )}
                      <div className="mt-4">
                        <small className="text-muted">Generated By</small>
                        <div className="fw-bold">Reception System</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Patient & Appointment Details */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-person me-2"></i>
                  Patient & Appointment Details
                </h5>
                {bill.CONSULT_ID && (
                  <Link 
                    to={`/reception/appointments/view/${bill.CONSULT_ID}`}
                    className="btn btn-outline-primary btn-sm"
                  >
                    <i className="bi bi-eye me-1"></i> View Appointment
                  </Link>
                )}
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <small className="text-muted">Patient Name</small>
                    <h5>{bill.patient_name || 'N/A'}</h5>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Patient ID</small>
                    <p className="mb-0">
                      PAT-{bill.CONSULT_ID?.TOKEN_NO?.PAT_ID || 'N/A'}
                    </p>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Contact Information</small>
                    <p className="mb-0">
                      {bill.patient_phone || 'N/A'}
                      {bill.patient_email && (
                        <>
                          <br />
                          {bill.patient_email}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="mb-3">
                    <small className="text-muted">Doctor</small>
                    <h5>Dr. {bill.doctor_name || 'N/A'}</h5>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Doctor ID</small>
                    <p className="mb-0">{bill.doctor_id || 'N/A'}</p>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Consultation Date</small>
                    <p className="mb-0">{formatDate(bill.consultation_date)}</p>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Appointment ID</small>
                    <p className="mb-0">
                      APID-{bill.CONSULT_ID?.TOKEN_NO || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - Actions & History */}
        <div className="col-lg-4">
          {/* Quick Actions */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-primary"
                  onClick={handlePrintBill}
                >
                  <i className="bi bi-printer me-1"></i> Print Bill
                </button>
                
                <button 
                  className="btn btn-outline-info"
                  onClick={handleDownloadPDF}
                >
                  <i className="bi bi-download me-1"></i> Download PDF
                </button>
                
                {bill.Pay_Status !== 'Paid' && (
                  <button 
                    className="btn btn-outline-success"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <i className="bi bi-cash-coin me-1"></i> Record Payment
                  </button>
                )}
                
                <Link 
                  to="/reception/billing/list"
                  className="btn btn-outline-secondary"
                >
                  <i className="bi bi-arrow-left me-1"></i> Back to Bills
                </Link>
              </div>
            </div>
          </div>
          
          {/* Bill Information */}
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Bill Information
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted">Bill Number</small>
                <div className="fw-bold">BILL-{billId.toString().padStart(6, '0')}</div>
              </div>
              
              <div className="mb-3">
                <small className="text-muted">Created Date</small>
                <div className="fw-bold">{formatDate(bill.Created_Date)}</div>
              </div>
              
              <div className="mb-3">
                <small className="text-muted">Last Updated</small>
                <div className="fw-bold">
                  {bill.Updated_Date 
                    ? formatDate(bill.Updated_Date)
                    : formatDate(bill.Created_Date)
                  }
                </div>
              </div>
              
              <div className="mb-3">
                <small className="text-muted">Bill Status</small>
                <div>{getStatusBadge(bill.Pay_Status)}</div>
              </div>
              
              {bill.Notes && (
                <div className="mb-3">
                  <small className="text-muted">Notes</small>
                  <p className="mb-0 small">{bill.Notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record Payment</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={updating}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-select"
                    value={paymentData.Payment_Mode}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, Payment_Mode: e.target.value }))}
                    disabled={updating}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Online">Online</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Paid Amount</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      className="form-control"
                      value={paymentData.Paid_Amount}
                      onChange={(e) => setPaymentData(prev => ({ 
                        ...prev, 
                        Paid_Amount: parseFloat(e.target.value) || 0 
                      }))}
                      min="0"
                      step="0.01"
                      max={bill?.Total_Amount || 0}
                      disabled={updating}
                    />
                  </div>
                  <small className="text-muted">
                    Total Amount: {formatCurrency(bill?.Total_Amount || 0)}
                  </small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Transaction ID (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter transaction ID for reference"
                    value={paymentData.Transaction_ID}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, Transaction_ID: e.target.value }))}
                    disabled={updating}
                  />
                </div>
                
                {paymentData.Paid_Amount < (bill?.Total_Amount || 0) && (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Partial payment will be recorded. Remaining: {formatCurrency((bill?.Total_Amount || 0) - paymentData.Paid_Amount)}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleMarkAsPaid}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Processing...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillDetailsPage;