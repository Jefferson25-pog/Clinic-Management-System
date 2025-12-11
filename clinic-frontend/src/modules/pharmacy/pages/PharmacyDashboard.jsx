import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pharmacyApi from '../services/pharmacyApi';
import { useAuth } from '../../../context/AuthContext.jsx';

const PharmacyDashboard = () => {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStockItems: 0,
    todayDispensing: 0,
    expiringSoon: 0,
    pendingOrders: 0,
    stockValue: 0
  });
  
  const [lowStock, setLowStock] = useState([]);
  const [todayDispensing, setTodayDispensing] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  
  const [loading, setLoading] = useState({
    stats: true,
    lowStock: true,
    dispensing: true,
    suggestions: true
  });
  
  const [error, setError] = useState('');
  const { staffDetail } = useAuth();

  // Pharmacy Dashboard Tiles
  const pharmacyTiles = [
    {
      title: "Medicine Management",
      description: "Add, update and manage all medicines.",
      to: "/pharmacy/medicines",
      icon: "bi-capsule-pill",
      color: "primary"
    },
    {
      title: "Stock Management",
      description: "Monitor stock levels and expiry dates.",
      to: "/pharmacy/stock",
      icon: "bi-box-seam",
      color: "info"
    },
    {
      title: "Suppliers",
      description: "Manage pharmaceutical suppliers.",
      to: "/pharmacy/suppliers",
      icon: "bi-building",
      color: "warning"
    },
    {
      title: "Dispensing",
      description: "Track medicine dispensing records.",
      to: "/pharmacy/dispensing",
      icon: "bi-cart-check",
      color: "success"
    },
    {
      title: "Stock Orders",
      description: "Place and manage stock orders.",
      to: "/pharmacy/stock-orders",
      icon: "bi-cart-plus",
      color: "danger"
    },
    {
      title: "Reports",
      description: "Generate pharmacy reports.",
      to: "/pharmacy/reports",
      icon: "bi-graph-up",
      color: "secondary"
    },
  ];

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true, lowStock: true, dispensing: true }));
      
      // Use the dashboard stats endpoint
      const [statsRes, lowStockRes, todayDispensingRes, medicinesRes, expiryAlertsRes] = await Promise.all([
        pharmacyApi.getDashboardStats().catch(() => ({ data: {} })),
        pharmacyApi.getLowStock().catch(() => ({ data: [] })),
        pharmacyApi.getTodayDispensing().catch(() => ({ data: [] })),
        pharmacyApi.getAllMedicines().catch(() => ({ data: [] })),
        pharmacyApi.getExpiryAlerts().catch(() => ({ data: [] }))
      ]);

      const statsData = statsRes.data || {};
      const lowStockItems = lowStockRes.data || [];
      const todayDispensingItems = todayDispensingRes.data || [];
      const medicines = medicinesRes.data || [];
      const expiryAlerts = expiryAlertsRes.data || [];

      // Calculate stock value
      const stockValue = medicines.reduce((total, medicine) => {
        return total + (parseFloat(medicine.Price_per_Unit) || 0) * 100; // Simplified
      }, 0);

      // Get pending orders
      const orders = await pharmacyApi.getAllOrders().catch(() => ({ data: [] }));
      const pendingOrders = orders.data ? orders.data.filter(order => 
        order.status === 'Pending' || order.Status === 'Pending'
      ).length : 0;

      setStats({
        totalMedicines: statsData.totalMedicines || medicines.length || 0,
        lowStockItems: statsData.lowStockItems || lowStockItems.length || 0,
        todayDispensing: statsData.todayDispensing || todayDispensingItems.length || 0,
        expiringSoon: statsData.expiringSoon || expiryAlerts.length || 0,
        pendingOrders: pendingOrders,
        stockValue: stockValue
      });

      setLowStock(lowStockItems.slice(0, 5));
      setTodayDispensing(todayDispensingItems.slice(0, 5));

      // Set alerts if any
      const newAlerts = [];
      if (lowStockItems.length > 0) {
        newAlerts.push({
          type: 'warning',
          message: `${lowStockItems.length} medicines are low in stock`
        });
      }
      if (expiryAlerts.length > 0) {
        newAlerts.push({
          type: 'danger',
          message: `${expiryAlerts.length} medicines are expiring soon`
        });
      }
      setAlerts(newAlerts);

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Unable to load dashboard data. Please check your connection.");
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        stats: false, 
        lowStock: false, 
        dispensing: false 
      }));
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      setLoading(prev => ({ ...prev, suggestions: true }));
      
      const suggestionsRes = await pharmacyApi.getReorderSuggestions().catch(() => ({ data: [] }));
      setReorderSuggestions(suggestionsRes.data || []);
      
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoading(prev => ({ ...prev, suggestions: false }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await fetchDashboardStats();
        await fetchRecentActivity();
      } catch (error) {
        console.error("Error in initial data fetch:", error);
      }
    };
    
    fetchAllData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = () => {
    fetchDashboardStats();
    fetchRecentActivity();
  };

  // Get stock status badge
  const getStockStatusBadge = (item) => {
    const stockAvailability = item.Total_Stock_Availability || item.total_stock_availability || 0;
    const minStockLevel = item.Minimum_Stock_Level || item.minimum_stock_level || 10;
    
    if (stockAvailability === 0) {
      return <span className="badge bg-danger"><i className="bi bi-x-circle me-1"></i>Out of Stock</span>;
    }
    if (stockAvailability < minStockLevel) {
      return <span className="badge bg-warning"><i className="bi bi-exclamation-triangle me-1"></i>Low Stock</span>;
    }
    return <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>In Stock</span>;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "Recently";
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return "Recently";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading.stats && loading.lowStock && loading.dispensing) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading pharmacy dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Pharmacy Dashboard</h3>
          <p className="text-muted mb-0">
            Welcome back, {staffDetail?.Name?.split(' ')[0] || 'Pharmacist'} • 
            <span className="text-primary ms-2">
              Pharmacy Department
            </span>
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
              Auto-refresh: 30 seconds
            </small>
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handleRefresh}
            disabled={loading.stats || loading.lowStock || loading.dispensing || loading.suggestions}
          >
            {loading.stats || loading.lowStock || loading.dispensing || loading.suggestions ? (
              <>
                <span className="spinner-border spinner-border-sm me-1"></span>
                Refreshing
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Error:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((alert, index) => (
            <div key={index} className={`alert alert-${alert.type} alert-dismissible fade show mb-2`}>
              <i className={`bi ${alert.type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-octagon-fill'} me-2`}></i>
              <strong>{alert.type === 'warning' ? 'Warning:' : 'Alert:'}</strong> {alert.message}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setAlerts(alerts.filter((_, i) => i !== index))}
              ></button>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
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
              <Link to="/pharmacy/medicines" className="btn btn-outline-primary btn-sm w-100">
                <i className="bi bi-arrow-right me-1"></i>Manage Medicines
              </Link>
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
              <Link to="/pharmacy/stock" className="btn btn-outline-warning btn-sm w-100">
                <i className="bi bi-eye me-1"></i>View Stock
              </Link>
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
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
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
              <Link to="/pharmacy/dispensing" className="btn btn-outline-success btn-sm w-100">
                <i className="bi bi-clock-history me-1"></i>View History
              </Link>
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Stock Value</h6>
                  <h3 className="mb-0">{formatCurrency(stats.stockValue)}</h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-cash me-1"></i>
                      Total inventory value
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-cash fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <button 
                className="btn btn-outline-info btn-sm w-100"
                onClick={handleRefresh}
                disabled={loading.stats || loading.lowStock || loading.dispensing || loading.suggestions}
              >
                {loading.stats || loading.lowStock || loading.dispensing || loading.suggestions ? (
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

      {/* Data Status Bar */}
      <div className="alert alert-light border mb-4">
        <div className="row align-items-center">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Dashboard Status: 
              <span className={`ms-2 badge ${loading.stats || loading.lowStock || loading.dispensing || loading.suggestions ? 'bg-warning' : 'bg-success'}`}>
                {loading.stats || loading.lowStock || loading.dispensing || loading.suggestions ? 'Loading...' : 'Live'}
              </span>
              {stats.lowStockItems > 0 && !loading.stats && (
                <span className="ms-3 badge bg-warning">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  {stats.lowStockItems} Low Stock
                </span>
              )}
              {stats.expiringSoon > 0 && !loading.stats && (
                <span className="ms-2 badge bg-danger">
                  <i className="bi bi-clock me-1"></i>
                  {stats.expiringSoon} Expiring Soon
                </span>
              )}
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="row g-4">
        {/* Pharmacy Tiles */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 pb-0">
              <h5 className="mb-0">
                <i className="bi bi-capsule-pill me-2"></i>
                Pharmacy Operations
              </h5>
              <p className="text-muted mb-0 small">Manage all pharmacy components</p>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {pharmacyTiles.map((tile, index) => (
                  <div key={index} className="col-12 col-md-6 col-lg-4">
                    <Link to={tile.to} className="text-decoration-none text-dark">
                      <div className="card border-0 shadow-sm h-100 hover-lift transition-all">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <div className={`bg-${tile.color} bg-opacity-10 rounded-circle p-3 me-3`}>
                              <i className={`bi ${tile.icon} fs-4 text-${tile.color}`}></i>
                            </div>
                            <div>
                              <h6 className="card-title mb-0 fw-semibold">{tile.title}</h6>
                            </div>
                          </div>
                          <p className="text-muted small mb-0">{tile.description}</p>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">Click to open</span>
                            <i className={`bi bi-arrow-right text-${tile.color}`}></i>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts Sidebar */}
        <div className="col-xl-4 col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Low Stock Alerts
              </h5>
              <span className="badge bg-warning">
                {loading.lowStock ? (
                  <span className="spinner-border spinner-border-sm"></span>
                ) : (
                  lowStock.length
                )}
              </span>
            </div>
            <div className="card-body p-0">
              {loading.lowStock ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-warning" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading low stock alerts...</p>
                </div>
              ) : lowStock.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-check-circle display-6 text-success"></i>
                  <p className="mt-3 text-muted">All medicines are well stocked!</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {lowStock.map((item, index) => (
                    <div 
                      key={item.STOCK_ID || index}
                      className="list-group-item list-group-item-action border-0 py-3"
                    >
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0">
                          <div className={`avatar-sm rounded-circle d-flex align-items-center justify-content-center ${
                            (item.Total_Stock_Availability || 0) === 0 ? 'bg-danger bg-opacity-10' : 'bg-warning bg-opacity-10'
                          }`}>
                            <i className={`bi ${
                              (item.Total_Stock_Availability || 0) === 0 ? 'bi-x-circle' : 'bi-exclamation-triangle'
                            } fs-5 ${(item.Total_Stock_Availability || 0) === 0 ? 'text-danger' : 'text-warning'}`}></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-0">{item.medicine_name || item.MED_ID?.Medicine_Name || 'Unknown Medicine'}</h6>
                              <small className="text-muted">
                                {item.MED_ID?.Dosage || item.dosage || 'N/A'}
                              </small>
                            </div>
                            <div className="text-end">
                              {getStockStatusBadge(item)}
                              <div className="text-muted small mt-1">
                                Stock: {item.Total_Stock_Availability || 0} / Min: {item.Minimum_Stock_Level || 10}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card-footer bg-transparent border-0">
              <Link to="/pharmacy/stock" className="btn btn-outline-warning w-100">
                <i className="bi bi-eye me-1"></i>View All Stock
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Dispensing Activity */}
      {todayDispensing.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-activity me-2"></i>
                  Today's Dispensing Activity
                </h5>
                <span className="badge bg-success">{todayDispensing.length}</span>
              </div>
              <div className="card-body">
                <div className="row">
                  {todayDispensing.map((item, index) => (
                    <div key={index} className="col-md-3 mb-3">
                      <div className="card border-success border-1 h-100">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">{item.medicine_name || item.MED_ID?.Medicine_Name || 'Medicine'}</h6>
                              <small className="text-muted d-block">
                                Patient: {item.patient_name || 'N/A'}
                              </small>
                              <small className="text-success">
                                <i className="bi bi-capsule me-1"></i>
                                Qty: {item.Qty || item.quantity}
                              </small>
                            </div>
                            <div className="text-end">
                              <small className="text-muted">
                                {formatTimeAgo(item.Dispense_Date || item.dispense_date)}
                              </small>
                              <div className="text-success small mt-1">
                                {item.Price ? `₹${item.Price}` : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Suggestions */}
      {reorderSuggestions.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-lightbulb me-2"></i>
                  Reorder Suggestions
                </h5>
                <span className="badge bg-primary">{reorderSuggestions.length}</span>
              </div>
              <div className="card-body">
                <div className="row">
                  {reorderSuggestions.slice(0, 4).map((suggestion, index) => (
                    <div key={index} className="col-md-3 mb-3">
                      <div className="card border-primary border-1 h-100">
                        <div className="card-body">
                          <h6 className="mb-1">{suggestion.medicine_name || 'Medicine'}</h6>
                          <small className="text-muted d-block">
                            Current: {suggestion.current_stock || 0} units
                          </small>
                          <small className="text-primary d-block">
                            <i className="bi bi-box-arrow-up me-1"></i>
                            Suggested: {suggestion.suggested_order_quantity || 50} units
                          </small>
                          <small className="text-muted d-block mt-1">
                            Supplier: {suggestion.supplier || 'N/A'}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-footer bg-transparent border-0">
                <Link to="/pharmacy/stock-orders" className="btn btn-outline-primary w-100">
                  <i className="bi bi-cart-plus me-1"></i>Create Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card bg-light border-0">
            <div className="card-body py-3">
              <div className="row text-center">
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">System Status</div>
                  <div className="fw-bold text-success">
                    <i className="bi bi-check-circle-fill me-1"></i>Operational
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Last Updated</div>
                  <div className="fw-bold">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="col-6 col-md-3 border-end">
                  <div className="text-muted small">Total Medicines</div>
                  <div className="fw-bold text-primary">
                    {stats.totalMedicines}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="text-muted small">Active Alerts</div>
                  <div className="fw-bold text-warning">
                    {stats.lowStockItems + stats.expiringSoon}
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

export default PharmacyDashboard;