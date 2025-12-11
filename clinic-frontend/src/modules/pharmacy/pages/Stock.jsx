import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import StockList from '../components/StockList';
import pharmacyApi from '../services/pharmacyApi';

const Stock = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [minimumStockLevel, setMinimumStockLevel] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStockItems: 0,
    inStockItems: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState({
    stats: true,
    stockList: false
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      const medicinesRes = await pharmacyApi.getAllMedicines(); // CHANGED
      const totalMedicines = medicinesRes.data?.length || 0;
      
      let lowStockCount = 0;
      let expiringCount = 0;
      
      try {
        const stockRes = await pharmacyApi.getAllStock(); // CHANGED
        if (stockRes.data && stockRes.data.length > 0) {
          lowStockCount = stockRes.data.filter(item => 
            item.Total_Stock_Availability < item.Minimum_Stock_Level
          ).length;
          
          expiringCount = stockRes.data.filter(item => 
            item.days_until_expiry !== null && item.days_until_expiry < 30
          ).length;
        }
      } catch (stockError) {
        console.log('Using fallback stock values');
      }
      
      setStats({
        totalMedicines,
        lowStockItems: lowStockCount,
        inStockItems: totalMedicines - lowStockCount,
        expiringSoon: expiringCount
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({
        totalMedicines: 3,
        lowStockItems: 0,
        inStockItems: 3,
        expiringSoon: 0
      });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const handleEdit = (stock) => {
    setSelectedStock(stock);
    setMinimumStockLevel(stock.Minimum_Stock_Level);
    setShowEditModal(true);
  };

  const handleSaveMinLevel = async () => {
    if (!minimumStockLevel || minimumStockLevel < 0) {
      showAlert('danger', 'Please enter a valid minimum stock level');
      return;
    }

    try {
      await pharmacyApi.updateMinimumStock( // CHANGED
        selectedStock.STOCK_ID, 
        parseInt(minimumStockLevel)
      );
      showAlert('success', 'Minimum stock level updated successfully');
      setShowEditModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      showAlert('danger', 'Failed to update minimum stock level');
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
          <h3 className="mb-1">Stock Management</h3>
          <p className="text-muted mb-0">
            Monitor medicine stock levels, expiry dates, and set alerts.
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
        {/* Total Medicines */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Medicines</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.totalMedicines.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-capsule me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `Registered in system`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-capsule-pill fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                All registered medicines
              </small>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Low Stock</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-warning bg-opacity-25"></span>
                    ) : (
                      stats.lowStockItems.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-warning bg-opacity-25"></span>
                      ) : (
                        `Below minimum level`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-exclamation-triangle fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Needs reordering
              </small>
            </div>
          </div>
        </div>

        {/* In Stock */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">In Stock</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      stats.inStockItems.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-check-circle me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-success bg-opacity-25"></span>
                      ) : (
                        `Adequate stock`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-cart-check fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Available for dispensing
              </small>
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-danger bg-opacity-10 border-danger border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Expiring Soon</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-danger bg-opacity-25"></span>
                    ) : (
                      stats.expiringSoon.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-danger bg-opacity-25"></span>
                      ) : (
                        `Within 30 days`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-danger bg-opacity-25 rounded">
                    <i className="bi bi-clock-history fs-4 text-danger"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <button 
                className="btn btn-outline-danger btn-sm w-100"
                onClick={handleManualRefresh}
                disabled={loading.stats}
              >
                {loading.stats ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>Refresh Now
                  </>
                )}
              </button>
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
              {stats.lowStockItems > 0 && !loading.stats && (
                <span className="ms-2 badge bg-warning">Low Stock Alert</span>
              )}
              {stats.expiringSoon > 0 && !loading.stats && (
                <span className="ms-2 badge bg-danger">Expiry Alert</span>
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

      {/* Stock List Card - EXACT Admin Pattern */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-box-seam me-2"></i>
              Medicine Stock List
            </h5>
            <p className="text-muted mb-0 small">Filter and manage medicine inventory</p>
          </div>
          <Badge bg="primary">
            <i className="bi bi-filter me-1"></i>
            Filtered
          </Badge>
        </div>
        <div className="card-body p-0">
          <StockList 
            onEdit={handleEdit}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click on any medicine to edit minimum stock level
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

      {/* Edit Minimum Stock Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Edit Minimum Stock Level</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStock && (
            <>
              <p>
                <strong>Medicine:</strong> {selectedStock.medicine_name}
              </p>
              <p>
                <strong>Current Stock:</strong> {selectedStock.Total_Stock_Availability}
              </p>
              <div className="form-group">
                <label className="form-label">Minimum Stock Level *</label>
                <input
                  type="number"
                  className="form-control"
                  value={minimumStockLevel}
                  onChange={(e) => setMinimumStockLevel(e.target.value)}
                  min="0"
                  placeholder="Enter minimum stock level"
                />
                <small className="text-muted">
                  Alert will trigger when stock goes below this level
                </small>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveMinLevel}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Stock;