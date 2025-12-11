import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
// REMOVE THESE IMPORTS - they don't exist
// import OrderList from "../components/OrderList";
// import OrderForm from "../components/OrderForm";
import pharmacyApi from '../services/pharmacyApi';

const StockOrders = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0
  });
  const [loading, setLoading] = useState({
    stats: true,
    list: false
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // ADD INLINE COMPONENTS INSTEAD OF IMPORTS
  const OrderList = ({ onEdit, onDelete, refreshTrigger }) => (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead className="bg-light">
          <tr>
            <th className="border-0">Order ID</th>
            <th className="border-0">Supplier</th>
            <th className="border-0">Medicine</th>
            <th className="border-0">Quantity</th>
            <th className="border-0">Total Cost</th>
            <th className="border-0">Status</th>
            <th className="border-0">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="7" className="text-center py-4 text-muted">
              <i className="bi bi-cart display-6 mb-3"></i>
              <p>Connect to your order API</p>
              <small>Replace with actual order data</small>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const OrderForm = ({ order, onSave, onCancel }) => (
    <div>
      <p>Order form will appear here</p>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSave({})}>
          {order ? 'Update Order' : 'Place Order'}
        </Button>
      </div>
    </div>
  );

  // YOUR EXISTING LOGIC HERE - KEEP THIS PART
  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      // YOUR EXISTING API CALL
      const response = await pharmacyApi.getAllOrders();
      const orders = response.data || [];
      
      const pendingOrders = orders.filter(o => o.Order_Status === 'Pending').length;
      const deliveredOrders = orders.filter(o => o.Order_Status === 'Delivered').length;
      const cancelledOrders = orders.filter(o => o.Order_Status === 'Cancelled').length;
      
      setStats({
        totalOrders: orders.length,
        pendingOrders,
        deliveredOrders,
        cancelledOrders
      });
      
    } catch (error) {
      console.error('Error fetching order stats:', error);
      setStats({
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0
      });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const handleAdd = () => {
    setSelectedOrder(null);
    setShowForm(true);
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyApi.deleteOrder(id);
      showAlert('success', 'Order deleted successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      showAlert('danger', 'Failed to delete order');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedOrder) {
        await pharmacyApi.updateOrder(selectedOrder.ORDER_ID, formData);
        showAlert('success', 'Order updated successfully');
      } else {
        await pharmacyApi.createOrder(formData);
        showAlert('success', 'Order placed successfully');
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
          <h3 className="mb-1">Stock Orders</h3>
          <p className="text-muted mb-0">
            Place and manage medicine stock orders.
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
          <Button variant="primary" onClick={handleAdd}>
            <i className="bi bi-cart-plus me-2"></i>
            Place New Order
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
        {/* Total Orders */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Orders</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.totalOrders.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-cart me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-primary bg-opacity-25"></span>
                      ) : (
                        `All orders`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-cart fs-4 text-primary"></i>
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
                  <h6 className="text-muted mb-1">Pending</h6>
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

        {/* Delivered Orders */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Delivered</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      stats.deliveredOrders.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-check-circle me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-success bg-opacity-25"></span>
                      ) : (
                        `Completed orders`
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

        {/* Cancelled Orders */}
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-danger bg-opacity-10 border-danger border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Cancelled</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-danger bg-opacity-25"></span>
                    ) : (
                      stats.cancelledOrders.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-x-circle me-1"></i>
                      {loading.stats ? (
                        <span className="placeholder col-4 bg-danger bg-opacity-25"></span>
                      ) : (
                        `Cancelled orders`
                      )}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-danger bg-opacity-25 rounded">
                    <i className="bi bi-x-circle fs-4 text-danger"></i>
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
              {stats.pendingOrders > 0 && !loading.stats && (
                <span className="ms-2 badge bg-warning">Pending Orders</span>
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

      {/* Order List Card - EXACT Admin Pattern */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-cart me-2"></i>
              Orders List
            </h5>
            <p className="text-muted mb-0 small">All stock orders and purchase requests</p>
          </div>
          <Badge bg="primary">
            <i className="bi bi-filter me-1"></i>
            Filtered
          </Badge>
        </div>
        <div className="card-body p-0">
          <OrderList 
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click on any order to view/edit details
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

      {/* Order Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="bi bi-cart me-2"></i>
            {selectedOrder ? 'Edit Order' : 'Place New Order'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <OrderForm
            order={selectedOrder}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default StockOrders;