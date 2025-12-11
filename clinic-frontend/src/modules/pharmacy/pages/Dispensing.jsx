import React, { useState, useEffect } from 'react';
import { Button, Alert, Badge, Modal } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const Dispensing = () => {
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState({
    todayCount: 0,
    monthCount: 0,
    totalValue: 0,
    totalQuantity: 0
  });
  const [loading, setLoading] = useState({
    stats: true,
    list: false
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Inline components (replace with your actual components when ready)
  const DispensingList = ({ refreshTrigger }) => (
    <div className="text-center py-5">
      <i className="bi bi-cart-check display-6 text-muted"></i>
      <p className="mt-3 text-muted">Dispensing records will appear here</p>
      <small className="text-muted">Connect to your dispensing API</small>
    </div>
  );

  const DispensingForm = ({ show, onHide, onSave }) => (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Dispense Medicine</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Dispensing form will appear here</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSave({})}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // CORRECTED fetchStats function
  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      // Get all dispensing from your API - CHANGE THIS
      const response = await pharmacyApi.getAllDispensing(); // CHANGED
      const allDispensing = response.data || [];
      
      // Calculate statistics from real data
      const today = new Date().toISOString().split('T')[0];
      const todayCount = allDispensing.filter(item => {
        if (item.Dispense_Date) {
          const itemDate = new Date(item.Dispense_Date).toISOString().split('T')[0];
          return itemDate === today;
        }
        return false;
      }).length;
      
      // This month calculation
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthCount = allDispensing.filter(item => {
        if (item.Dispense_Date) {
          const date = new Date(item.Dispense_Date);
          return date.getMonth() === currentMonth && 
                 date.getFullYear() === currentYear;
        }
        return false;
      }).length;
      
      // Calculate totals from real data
      const totalValue = allDispensing.reduce((sum, item) => {
        const qty = item.Qty || 0;
        const price = item.Price || 0;
        return sum + (qty * price);
      }, 0);
      
      const totalQuantity = allDispensing.reduce((sum, item) => {
        return sum + (item.Qty || 0);
      }, 0);
      
      setStats({
        todayCount,
        monthCount,
        totalValue,
        totalQuantity
      });
      
    } catch (error) {
      console.error('Error fetching dispensing stats:', error);
      setAlert({ 
        show: true, 
        type: 'danger', 
        message: 'Failed to load dispensing statistics' 
      });
      // Set default values on error
      setStats({
        todayCount: 0,
        monthCount: 0,
        totalValue: 0,
        totalQuantity: 0
      });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleAddDispensing = () => {
    setShowForm(true);
  };

  const handleSaveDispensing = async (formData) => {
    try {
      await pharmacyApi.createDispensing(formData); // CHANGED
      showAlert('success', 'Medicine dispensed successfully');
      setShowForm(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      showAlert('danger', 'Failed to dispense medicine');
      throw error;
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  const handleManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      {/* Header - EXACT Admin Pattern */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Medicine Dispensing</h3>
          <p className="text-muted mb-0">
            Record and manage medicine dispensing to patients.
          </p>
        </div>
        <div className="text-end d-flex flex-wrap gap-2 align-items-center">
          <div>
            <small className="text-muted d-block">
              <i className="bi bi-calendar-check me-1"></i>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </small>
            <small className="text-muted">
              <i className="bi bi-clock me-1"></i>
              Auto-refresh: 30s
            </small>
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handleManualRefresh}
            disabled={loading.stats}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          <Button variant="success" onClick={handleAddDispensing}>
            <i className="bi bi-cart-plus me-2"></i>
            Dispense Medicine
          </Button>
        </div>
      </div>

      {/* Alert Display - EXACT Admin Pattern */}
      {alert.show && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className={`bi ${alert.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
          <strong>{alert.type === 'success' ? 'Success:' : 'Error:'}</strong> {alert.message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setAlert({ show: false, type: '', message: '' })}
          ></button>
        </div>
      )}

      {/* Quick Stats - Responsive Grid - EXACT Admin Pattern */}
      <div className="row g-3 mb-4">
        {/* Today's Dispensing */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Today's Dispensing</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.todayCount.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-calendar-day me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `Transactions today`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-calendar-day fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">This Month</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-info bg-opacity-25"></span>
                    ) : (
                      stats.monthCount.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-calendar-month me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-info bg-opacity-25"></span>
                      ) : (
                        `Current month`
                      )}
                    </small>
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

        {/* Total Value */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Value</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      `$${stats.totalValue.toFixed(2)}`
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-currency-dollar me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-success bg-opacity-25"></span>
                      ) : (
                        `Total revenue`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-currency-dollar fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Quantity</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-warning bg-opacity-25"></span>
                    ) : (
                      stats.totalQuantity.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-capsule me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-warning bg-opacity-25"></span>
                      ) : (
                        `Medicines dispensed`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-capsule fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Status Bar - EXACT Admin Pattern */}
      <div className="alert alert-light border mb-4">
        <div className="row align-items-center">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Data Status: 
              <span className={`ms-2 badge ${loading.stats ? 'bg-warning' : 'bg-success'}`}>
                {loading.stats ? 'Loading...' : 'Live'}
              </span>
              {stats.todayCount > 0 && !loading.stats && (
                <span className="ms-2 badge bg-primary">Active Today</span>
              )}
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </small>
          </div>
        </div>
      </div>

      {/* Dispensing List Card - EXACT Admin Pattern */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-cart-check me-2"></i>
              Dispensing Records
            </h5>
            <p className="text-muted mb-0 small">All medicine dispensing transactions</p>
          </div>
          <Badge bg="primary">
            <i className="bi bi-filter me-1"></i>
            Filtered
          </Badge>
        </div>
        <div className="card-body p-0">
          <DispensingList refreshTrigger={refreshTrigger} />
        </div>
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click on any record to view details
            </small>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => setRefreshTrigger(prev => prev + 1)}
            >
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh List
            </button>
          </div>
        </div>
      </div>

      {/* Dispensing Form Modal */}
      <DispensingForm
        show={showForm}
        onHide={() => setShowForm(false)}
        onSave={handleSaveDispensing}
      />
    </div>
  );
};

export default Dispensing;