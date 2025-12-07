import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { receptionApi } from '../../services/receptionApi';

const CreateBillPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableConsultations, setAvailableConsultations] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  
  const [formData, setFormData] = useState({
    CONSULT_ID: '',
    Pay_Status: 'Pending',
    Payment_Mode: 'Cash',
    Additional_Charges: 0,
    Discount: 0,
    Notes: ''
  });

  // Check URL for pre-selected appointment
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const appointmentId = params.get('appointment');
    
    if (appointmentId) {
      setFormData(prev => ({ ...prev, CONSULT_ID: appointmentId }));
      // Fetch consultation details
      fetchConsultationDetails(appointmentId);
    }
    
    fetchAvailableConsultations();
  }, []);

  const fetchAvailableConsultations = async () => {
    try {
      const response = await receptionApi.getAvailableConsultations();
      if (response.data) {
        setAvailableConsultations(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
    }
  };

  const fetchConsultationDetails = async (consultId) => {
    try {
      // Fetch consultation details to calculate bill
      const response = await receptionApi.getConsultationById(consultId);
      if (response.data) {
        setSelectedConsultation(response.data);
        calculateBill(response.data);
      }
    } catch (error) {
      console.error('Error fetching consultation:', error);
    }
  };

  const calculateBill = (consultation) => {
    if (!consultation) return;
    
    // Calculate costs based on consultation data
    const consultationCost = consultation.DOC_ID?.Consultation_fees || 500;
    const medicineCost = consultation.Medicine_Cost || 0;
    const labTestCost = consultation.LabTest_Cost || 0;
    
    // Additional charges and discount from form
    const additionalCharges = parseFloat(formData.Additional_Charges) || 0;
    const discount = parseFloat(formData.Discount) || 0;
    
    const subtotal = consultationCost + medicineCost + labTestCost + additionalCharges;
    const total = Math.max(0, subtotal - discount);
    
    setBillDetails({
      consultationCost,
      medicineCost,
      labTestCost,
      additionalCharges,
      discount,
      subtotal,
      total,
      patientName: consultation.TOKEN_NO?.PAT_ID?.Patient_Name || 'N/A',
      doctorName: consultation.DOC_ID?.Name || 'N/A',
      consultationDate: consultation.Consultation_Time || consultation.Created_Date
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Recalculate bill if additional charges or discount changed
    if (name === 'Additional_Charges' || name === 'Discount') {
      if (selectedConsultation) {
        calculateBill(selectedConsultation);
      }
    }
  };

  const handleConsultationSelect = (consultId) => {
    setFormData(prev => ({ ...prev, CONSULT_ID: consultId }));
    const consultation = availableConsultations.find(c => c.CONSULT_ID === consultId);
    if (consultation) {
      setSelectedConsultation(consultation);
      calculateBill(consultation);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.CONSULT_ID) {
      newErrors.CONSULT_ID = 'Please select a consultation';
    }
    
    if (!formData.Pay_Status) {
      newErrors.Pay_Status = 'Payment status is required';
    }
    
    if (formData.Pay_Status === 'Paid' && !formData.Payment_Mode) {
      newErrors.Payment_Mode = 'Payment mode is required for paid bills';
    }
    
    const additionalCharges = parseFloat(formData.Additional_Charges);
    if (additionalCharges < 0) {
      newErrors.Additional_Charges = 'Additional charges cannot be negative';
    }
    
    const discount = parseFloat(formData.Discount);
    if (discount < 0) {
      newErrors.Discount = 'Discount cannot be negative';
    }
    
    if (billDetails && discount > billDetails.subtotal) {
      newErrors.Discount = 'Discount cannot exceed subtotal';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      // Prepare bill data
      const billData = {
        ...formData,
        Additional_Charges: parseFloat(formData.Additional_Charges) || 0,
        Discount: parseFloat(formData.Discount) || 0,
        // Auto-calculated fields will be set by backend
      };
      
      const response = await receptionApi.createBill(billData);
      
      if (response.data) {
        const billId = response.data.BILL_ID || response.data.id;
        alert(`Bill created successfully!\nBill Number: BILL-${billId.toString().padStart(6, '0')}`);
        
        // Ask if user wants to mark as paid
        if (formData.Pay_Status === 'Pending') {
          if (window.confirm('Do you want to mark this bill as paid now?')) {
            navigate(`/reception/billing/view/${billId}?action=markPaid`);
          } else {
            navigate('/reception/billing/list');
          }
        } else {
          navigate('/reception/billing/list?status=Paid');
        }
      }
      
    } catch (error) {
      console.error('Error creating bill:', error);
      
      if (error.response?.data) {
        // Handle API validation errors
        const apiErrors = error.response.data;
        if (typeof apiErrors === 'object') {
          setErrors(apiErrors);
        } else if (typeof apiErrors === 'string') {
          alert(apiErrors);
        }
      } else {
        alert('Failed to create bill. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      CONSULT_ID: '',
      Pay_Status: 'Pending',
      Payment_Mode: 'Cash',
      Additional_Charges: 0,
      Discount: 0,
      Notes: ''
    });
    setSelectedConsultation(null);
    setBillDetails(null);
    setErrors({});
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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container-fluid">
      
      <div className="row">
        <div className="col-lg-10 mx-auto">
          <div className="card shadow-sm">
            <div className="card-header bg-white border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-1">Create New Bill</h3>
                  <p className="text-muted mb-0">
                    Generate bill for completed consultation
                  </p>
                </div>
                <div className="text-end">
                  {billDetails && (
                    <div className="alert alert-success mb-0 py-2">
                      <small>Total Amount:</small>
                      <h4 className="mb-0">{formatCurrency(billDetails.total)}</h4>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Left Column - Consultation Selection */}
                  <div className="col-md-6">
                    <h5 className="mb-3 border-bottom pb-2">
                      <i className="bi bi-calendar-check me-2"></i>
                      Select Consultation
                    </h5>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        Consultation <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.CONSULT_ID ? 'is-invalid' : ''}`}
                        value={formData.CONSULT_ID}
                        onChange={(e) => handleConsultationSelect(e.target.value)}
                        required
                      >
                        <option value="">Select a consultation...</option>
                        {availableConsultations.map(consult => (
                          <option key={consult.CONSULT_ID} value={consult.CONSULT_ID}>
                            {consult.patient_name} - {formatDate(consult.consultation_date)}
                            (Dr. {consult.doctor_name})
                          </option>
                        ))}
                      </select>
                      {errors.CONSULT_ID && (
                        <div className="invalid-feedback">{errors.CONSULT_ID}</div>
                      )}
                      <small className="text-muted">
                        Only completed consultations without bills are shown
                      </small>
                    </div>
                    
                    {/* Consultation Details Card */}
                    {selectedConsultation && (
                      <div className="card bg-light mb-3">
                        <div className="card-body">
                          <h6 className="card-title">Consultation Details</h6>
                          <div className="row small">
                            <div className="col-6">
                              <strong>Patient:</strong><br/>
                              {selectedConsultation.patient_name}
                            </div>
                            <div className="col-6">
                              <strong>Doctor:</strong><br/>
                              Dr. {selectedConsultation.doctor_name}
                            </div>
                            <div className="col-12 mt-2">
                              <strong>Date:</strong><br/>
                              {formatDate(selectedConsultation.consultation_date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <label className="form-label">Additional Notes</label>
                      <textarea
                        name="Notes"
                        className="form-control"
                        rows="3"
                        placeholder="Any special notes for this bill..."
                        value={formData.Notes}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                  </div>
                  
                  {/* Right Column - Bill Details & Payment */}
                  <div className="col-md-6">
                    <h5 className="mb-3 border-bottom pb-2">
                      <i className="bi bi-cash-stack me-2"></i>
                      Bill & Payment Details
                    </h5>
                    
                    {/* Auto-calculated Bill Summary */}
                    {billDetails && (
                      <div className="card bg-primary bg-opacity-10 mb-3">
                        <div className="card-body">
                          <h6 className="card-title">Bill Summary</h6>
                          <div className="row small mb-2">
                            <div className="col-8">Consultation Fee:</div>
                            <div className="col-4 text-end">{formatCurrency(billDetails.consultationCost)}</div>
                          </div>
                          <div className="row small mb-2">
                            <div className="col-8">Medicine Charges:</div>
                            <div className="col-4 text-end">{formatCurrency(billDetails.medicineCost)}</div>
                          </div>
                          <div className="row small mb-2">
                            <div className="col-8">Lab Test Charges:</div>
                            <div className="col-4 text-end">{formatCurrency(billDetails.labTestCost)}</div>
                          </div>
                          <div className="row small mb-2">
                            <div className="col-8">Additional Charges:</div>
                            <div className="col-4 text-end">{formatCurrency(billDetails.additionalCharges)}</div>
                          </div>
                          <hr className="my-2" />
                          <div className="row small mb-2">
                            <div className="col-8"><strong>Subtotal:</strong></div>
                            <div className="col-4 text-end"><strong>{formatCurrency(billDetails.subtotal)}</strong></div>
                          </div>
                          <div className="row small mb-2">
                            <div className="col-8">Discount:</div>
                            <div className="col-4 text-end text-danger">-{formatCurrency(billDetails.discount)}</div>
                          </div>
                          <hr className="my-2" />
                          <div className="row">
                            <div className="col-8"><h6 className="mb-0">Total Amount:</h6></div>
                            <div className="col-4 text-end"><h5 className="mb-0 text-success">{formatCurrency(billDetails.total)}</h5></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Additional Charges</label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            type="number"
                            name="Additional_Charges"
                            className={`form-control ${errors.Additional_Charges ? 'is-invalid' : ''}`}
                            value={formData.Additional_Charges}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {errors.Additional_Charges && (
                          <div className="invalid-feedback d-block">{errors.Additional_Charges}</div>
                        )}
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">Discount</label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            type="number"
                            name="Discount"
                            className={`form-control ${errors.Discount ? 'is-invalid' : ''}`}
                            value={formData.Discount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            max={billDetails?.subtotal || 0}
                          />
                        </div>
                        {errors.Discount && (
                          <div className="invalid-feedback d-block">{errors.Discount}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Payment Status <span className="text-danger">*</span>
                        </label>
                        <select
                          name="Pay_Status"
                          className={`form-select ${errors.Pay_Status ? 'is-invalid' : ''}`}
                          value={formData.Pay_Status}
                          onChange={handleChange}
                          required
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Partial">Partial</option>
                          <option value="Insurance Pending">Insurance Pending</option>
                        </select>
                        {errors.Pay_Status && (
                          <div className="invalid-feedback">{errors.Pay_Status}</div>
                        )}
                      </div>
                      
                      <div className="col-md-6">
                        <label className="form-label">Payment Mode</label>
                        <select
                          name="Payment_Mode"
                          className={`form-select ${errors.Payment_Mode ? 'is-invalid' : ''}`}
                          value={formData.Payment_Mode}
                          onChange={handleChange}
                          required={formData.Pay_Status === 'Paid'}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="Online">Online</option>
                          <option value="Insurance">Insurance</option>
                          <option value="Mixed">Mixed</option>
                        </select>
                        {errors.Payment_Mode && (
                          <div className="invalid-feedback">{errors.Payment_Mode}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Bill Preview */}
                    <div className="card bg-warning bg-opacity-10 mb-3">
                      <div className="card-body">
                        <h6 className="card-title">
                          <i className="bi bi-receipt me-2"></i>
                          Bill Preview
                        </h6>
                        <div className="row small">
                          <div className="col-6">
                            <strong>Bill No:</strong><br/>
                            AUTO-GENERATED
                          </div>
                          <div className="col-6">
                            <strong>Date:</strong><br/>
                            {new Date().toLocaleDateString()}
                          </div>
                          <div className="col-12 mt-2">
                            <strong>Status:</strong> {formData.Pay_Status}
                          </div>
                          <div className="col-12 mt-2">
                            <strong>Payment:</strong> {formData.Payment_Mode}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="row mt-4">
                  <div className="col-12">
                    <div className="d-flex justify-content-between">
                      <div>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => navigate('/reception/billing')}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-left me-1"></i> Back to Billing Hub
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger ms-2"
                          onClick={handleReset}
                          disabled={loading}
                        >
                          <i className="bi bi-x-circle me-1"></i> Clear Form
                        </button>
                      </div>
                      
                      <div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-lg"
                          disabled={loading || !formData.CONSULT_ID}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Creating Bill...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-receipt me-1"></i> Generate Bill
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Important Information */}
            <div className="card-footer bg-light border-0">
              <div className="alert alert-warning mb-0">
                <h6 className="alert-heading">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Important Information:
                </h6>
                <ul className="mb-0 small">
                  <li>Bills are automatically linked to consultations</li>
                  <li>Consultation, medicine, and lab test costs are auto-calculated</li>
                  <li>Bill number is auto-generated and cannot be changed</li>
                  <li>Once marked as paid, bill status cannot be changed back to pending</li>
                  <li>Discounts require manager approval for amounts above ₹1000</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBillPage;