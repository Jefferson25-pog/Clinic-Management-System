import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import SupplierList from '../components/SupplierList';
import SupplierForm from '../components/SupplierForm';
import pharmacyApi from '../services/pharmacyApi';

const Suppliers = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    pendingOrders: 0,
    totalOrders: 0
  });
  const [loading, setLoading] = useState({
    stats: true,
    list: false
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      const response = await pharmacyApi.getAllSuppliers(); // CHANGED
      const suppliers = response.data || [];
      
      const activeSuppliers = suppliers.filter(s => s.Status === 'Active').length;
      
      setStats({
        totalSuppliers: suppliers.length,
        activeSuppliers,
        pendingOrders: 0, // You can add order count logic here
        totalOrders: 0
      });
      
    } catch (error) {
      console.error('Error fetching supplier stats:', error);
      setStats({
        totalSuppliers: 0,
        activeSuppliers: 0,
        pendingOrders: 0,
        totalOrders: 0
      });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleAdd = () => {
    setSelectedSupplier(null);
    setShowForm(true);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyApi.deleteSupplier(id); // CHANGED
      showAlert('success', 'Supplier deleted successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      showAlert('danger', 'Failed to delete supplier');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedSupplier) {
        await pharmacyApi.updateSupplier(selectedSupplier.SUPPLIER_ID, formData); // CHANGED
        showAlert('success', 'Supplier updated successfully');
      } else {
        await pharmacyApi.createSupplier(formData); // CHANGED
        showAlert('success', 'Supplier added successfully');
      }
      setShowForm(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
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
          <h3 className="mb-1">Suppliers Management</h3>
          <p className="text-muted mb-0">
            Manage pharmaceutical suppliers and vendors.
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
          </div>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={handleManualRefresh}
            disabled={loading.stats}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          <Button variant="primary" onClick={handleAdd}>
            <i className="bi bi-plus-circle me-2"></i>
            Add New Supplier
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
        {/* Total Suppliers */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Suppliers</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.totalSuppliers.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-building me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `Registered suppliers`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-building fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Suppliers */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Active Suppliers</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      stats.activeSuppliers.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-check-circle me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-success bg-opacity-25"></span>
                      ) : (
                        `Currently active`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-check-circle fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Pending Orders</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-warning bg-opacity-25"></span>
                    ) : (
                      stats.pendingOrders.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-warning bg-opacity-25"></span>
                      ) : (
                        `Awaiting delivery`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-clock fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Orders</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-info bg-opacity-25"></span>
                    ) : (
                      stats.totalOrders.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-cart me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-info bg-opacity-25"></span>
                      ) : (
                        `All-time orders`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-cart fs-4 text-info"></i>
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
              {stats.activeSuppliers > 0 && !loading.stats && (
                <span className="ms-2 badge bg-success">Active</span>
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

      {/* Supplier List Card - EXACT Admin Pattern */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-building me-2"></i>
              Suppliers List
            </h5>
            <p className="text-muted mb-0 small">All pharmaceutical suppliers and vendors</p>
          </div>
          <Badge bg="primary">
            <i className="bi bi-filter me-1"></i>
            Filtered
          </Badge>
        </div>
        <div className="card-body p-0">
          <SupplierList 
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click on any supplier to edit details
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

      {/* Supplier Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="bi bi-building me-2"></i>
            {selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SupplierForm
            supplier={selectedSupplier}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Suppliers;