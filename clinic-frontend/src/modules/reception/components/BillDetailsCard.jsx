// src/modules/reception/components/BillDetailsCard.jsx
import React, { useState } from "react";
import { receptionApi } from "../services/receptionApi";

const BillDetailsCard = ({ bill, onClose, onPrint, onDownload, onPayment }) => {
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      await receptionApi.recalculateBill(bill.BILL_ID);
      alert("Bill recalculated successfully!");
    } catch (error) {
      console.error("Error recalculating bill:", error);
      alert("Failed to recalculate bill");
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="card shadow-lg border-primary">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-receipt me-2"></i>
          Bill Details: BILL-{bill.BILL_ID?.toString().padStart(4, '0')}
        </h5>
        <div className="btn-group btn-group-sm">
          <button 
            className="btn btn-light"
            onClick={onClose}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      <div className="card-body">
        {/* Patient and Doctor Info */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-person me-2"></i>
                  Patient Information
                </h6>
                <p className="mb-1"><strong>Name:</strong> {bill.patient_name || "N/A"}</p>
                <p className="mb-1"><strong>Contact:</strong> {bill.CONSULT_ID?.TOKEN_NO?.PAT_ID?.Phone_Number || "N/A"}</p>
                <p className="mb-0"><strong>Email:</strong> {bill.CONSULT_ID?.TOKEN_NO?.PAT_ID?.Email || "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-person-badge me-2"></i>
                  Doctor Information
                </h6>
                <p className="mb-1"><strong>Name:</strong> Dr. {bill.doctor_name || "N/A"}</p>
                <p className="mb-1"><strong>Department:</strong> {bill.CONSULT_ID?.DOC_ID?.Department?.Department_Name || "N/A"}</p>
                <p className="mb-0"><strong>Consultation Date:</strong> {
                  bill.consultation_date ? new Date(bill.consultation_date).toLocaleDateString() : "N/A"
                }</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="row mb-4">
          <div className="col-12">
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-calculator me-2"></i>
              Cost Breakdown
            </h6>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Description</th>
                    <th className="text-end">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Consultation Fee</td>
                    <td className="text-end">{formatCurrency(bill.Consultation_Cost)}</td>
                  </tr>
                  <tr>
                    <td>Medicine Cost</td>
                    <td className="text-end">{formatCurrency(bill.Medicine_Cost)}</td>
                  </tr>
                  <tr>
                    <td>Lab Test Cost</td>
                    <td className="text-end">{formatCurrency(bill.LabTest_Cost)}</td>
                  </tr>
                  <tr className="table-primary">
                    <td><strong>Total Amount</strong></td>
                    <td className="text-end fw-bold fs-5">{formatCurrency(bill.Total_Amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-credit-card me-2"></i>
                  Payment Status
                </h6>
                <div className="mb-3">
                  <span className={`badge bg-${
                    bill.Pay_Status === 'Paid' ? 'success' :
                    bill.Pay_Status === 'Pending' ? 'danger' :
                    bill.Pay_Status === 'Partial' ? 'warning' : 'info'
                  } fs-6`}>
                    {bill.Pay_Status}
                  </span>
                </div>
                {bill.Payment_Mode && (
                  <p><strong>Payment Mode:</strong> {bill.Payment_Mode}</p>
                )}
                <p><strong>Bill Date:</strong> {
                  bill.Created_Date ? new Date(bill.Created_Date).toLocaleDateString() : "N/A"
                }</p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-clock-history me-2"></i>
                  Actions
                </h6>
                <div className="d-grid gap-2">
                  {bill.Pay_Status !== 'Paid' && onPayment && (
                    <button 
                      className="btn btn-success"
                      onClick={() => onPayment(bill.BILL_ID)}
                    >
                      <i className="bi bi-cash-coin me-1"></i> Process Payment
                    </button>
                  )}
                  <button 
                    className="btn btn-warning"
                    onClick={handleRecalculate}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="bi bi-arrow-clockwise me-1"></i>
                    )}
                    Recalculate Costs
                  </button>
                  <button 
                    className="btn btn-info"
                    onClick={onDownload}
                  >
                    <i className="bi bi-download me-1"></i> Download Receipt
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={onPrint}
                  >
                    <i className="bi bi-printer me-1"></i> Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="alert alert-light border">
          <div className="row">
            <div className="col-md-6">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Bill ID: BILL-{bill.BILL_ID?.toString().padStart(4, '0')}
              </small>
            </div>
            <div className="col-md-6 text-md-end">
              <small className="text-muted">
                Generated on: {bill.Created_Date ? new Date(bill.Created_Date).toLocaleString() : "N/A"}
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillDetailsCard;