import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const DashboardCards = () => {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStockItems: 0,
    todayDispensing: 0,
    expiringSoon: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState({
    stats: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      setError('');
      
      const [
        medicinesRes,
        lowStockRes,
        todayDispensingRes,
        expiryAlertsRes,
      ] = await Promise.all([
        pharmacyApi.getAllMedicines(),
        pharmacyApi.getLowStock(),
        pharmacyApi.getTodayDispensing(),
        pharmacyApi.getExpiryAlerts(),
      ]);

      setStats({
        totalMedicines: medicinesRes.data.length,
        lowStockItems: lowStockRes.data.length,
        todayDispensing: todayDispensingRes.data.length,
        expiringSoon: expiryAlertsRes.data.length,
      });

      const criticalAlerts = [];
      if (lowStockRes.data.length > 0) {
        criticalAlerts.push({
          type: 'warning',
          message: `${lowStockRes.data.length} medicines are low in stock`,
        });
      }
      if (expiryAlertsRes.data.length > 0) {
        criticalAlerts.push({
          type: 'danger',
          message: `${expiryAlertsRes.data.length} medicines are expiring soon`,
        });
      }
      setAlerts(criticalAlerts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading.stats) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="primary" size="sm" />
        <p className="mt-2 small">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Pharmacy Dashboard</h3>
          <p className="text-muted mb-0">
            Overview of pharmacy operations and stock status
          </p>
        </div>
        <div className="text-end">
          <small className="text-muted d-block">
            <i className="bi bi-calendar-check me-1"></i>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </small>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type} className="mb-2">
              <i className={`bi bi-exclamation-triangle-fill me-2`}></i>
              {alert.message}
            </Alert>
          ))}
        </div>
      )}

      {/* Statistics Cards - Admin Style */}
      <div className="row g-3 mb-4">
        {/* Total Medicines */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Medicines</h6>
                  <h3 className="mb-0">{stats.totalMedicines.toLocaleString()}</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-capsule-pill me-1"></i>
                      Registered in system
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
                  <h3 className="mb-0">{stats.lowStockItems.toLocaleString()}</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Need reordering
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
                Below minimum level
              </small>
            </div>
          </div>
        </div>

        {/* Today's Dispensing */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Today's Dispensing</h6>
                  <h3 className="mb-0">{stats.todayDispensing.toLocaleString()}</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-cart-check me-1"></i>
                      Medicines dispensed today
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
              <button 
                className="btn btn-outline-success btn-sm w-100"
                onClick={handleRefresh}
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

        {/* Expiring Soon */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-danger bg-opacity-10 border-danger border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Expiring Soon</h6>
                  <h3 className="mb-0">{stats.expiringSoon.toLocaleString()}</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-clock-history me-1"></i>
                      Within 30 days
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
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Check expiry dates
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardCards;