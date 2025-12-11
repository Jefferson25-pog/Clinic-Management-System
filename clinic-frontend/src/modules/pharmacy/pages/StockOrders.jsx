import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const StockOrders = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
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

  const OrderList = ({ onEdit, onDelete, orders, loading }) => (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead className="bg-light">
          <tr>
            <th className="border-0">Supply ID</th>
            <th className="border-0">Supplier</th>
            <th className="border-0">Medicine</th>
            <th className="border-0">Quantity</th>
            <th className="border-0">Supply Cost</th>
            <th className="border-0">Supply Date</th>
            <th className="border-0">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading.list ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td><span className="placeholder col-8"></span></td>
                <td><span className="placeholder col-6"></span></td>
                <td><span className="placeholder col-7"></span></td>
                <td><span className="placeholder col-4"></span></td>
                <td><span className="placeholder col-5"></span></td>
                <td><span className="placeholder col-5"></span></td>
                <td><span className="placeholder col-8"></span></td>
              </tr>
            ))
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-4 text-muted">
                <i className="bi bi-cart display-6 mb-3"></i>
                <p>No supply orders found</p>
                <small>Create your first supply order</small>
              </td>
            </tr>
          ) : (
            orders.slice(0, 10).map(order => (
              <tr key={order.SUPPLY_ID}>
                <td>SUP-{order.SUPPLY_ID}</td>
                <td>
                  {order.supplier_name || 
                   (order.SUPPLIER_ID?.Supplier_Name || 'Supplier')}
                </td>
                <td>
                  {order.medicine_name || 
                   (order.MED_ID?.Medicine_Name || 'Medicine')}
                </td>
                <td>{order.Qty_Supplied}</td>
                <td>${order.Supply_Cost ? parseFloat(order.Supply_Cost).toFixed(2) : '0.00'}</td>
                <td>{order.Date_of_Supply || 'N/A'}</td>
                <td>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="me-2"
                    onClick={() => onEdit(order)}
                  >
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => onDelete(order.SUPPLY_ID)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const OrderForm = ({ order, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      SUPPLIER_ID: order?.SUPPLIER_ID || '',
      MED_ID: order?.MED_ID || '',
      Qty_Supplied: order?.Qty_Supplied || '',
      Date_of_Supply: order?.Date_of_Supply || new Date().toISOString().split('T')[0],
      Supply_Cost: order?.Supply_Cost || '',
      Expiry_Date: order?.Expiry_Date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Batch_Number: order?.Batch_Number || ''
    });

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    const handleSubmit = () => {
      // Validate required fields
      const requiredFields = ['SUPPLIER_ID', 'MED_ID', 'Qty_Supplied', 'Date_of_Supply', 'Supply_Cost', 'Expiry_Date'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        showAlert('warning', `Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Convert numeric fields
      const submitData = {
        ...formData,
        SUPPLIER_ID: parseInt(formData.SUPPLIER_ID),
        MED_ID: parseInt(formData.MED_ID),
        Qty_Supplied: parseInt(formData.Qty_Supplied),
        Supply_Cost: parseFloat(formData.Supply_Cost)
      };

      console.log('Submitting data:', submitData);
      onSave(submitData);
    };

    return (
      <div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">
              Supplier ID <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="SUPPLIER_ID"
              className="form-control"
              placeholder="Enter supplier ID"
              value={formData.SUPPLIER_ID}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">
              Medicine ID <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="MED_ID"
              className="form-control"
              placeholder="Enter medicine ID"
              value={formData.MED_ID}
              onChange={handleChange}
              required
              min="1"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">
              Quantity <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="Qty_Supplied"
              className="form-control"
              placeholder="Enter quantity"
              value={formData.Qty_Supplied}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">
              Total Cost ($) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              name="Supply_Cost"
              className="form-control"
              placeholder="Enter total cost"
              value={formData.Supply_Cost}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">
              Supply Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              name="Date_of_Supply"
              className="form-control"
              value={formData.Date_of_Supply}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">
              Expiry Date <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              name="Expiry_Date"
              className="form-control"
              value={formData.Expiry_Date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">
            Batch Number <span className="text-muted">(Optional)</span>
          </label>
          <input
            type="text"
            name="Batch_Number"
            className="form-control"
            placeholder="Enter batch number or leave empty"
            value={formData.Batch_Number}
            onChange={handleChange}
          />
          <small className="text-muted">Leave empty to auto-generate</small>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {order ? 'Update Supply Order' : 'Create Supply Order'}
          </Button>
        </div>
      </div>
    );
  };

  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      
      const response = await pharmacyApi.getAllOrders(); // CHANGED
      const orders = response.data || [];
      
      setStats({
        totalOrders: orders.length,
        pendingOrders: 0, // Your model doesn't have status field
        deliveredOrders: 0, // Your model doesn't have status field
        cancelledOrders: 0 // Your model doesn't have status field
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

  const fetchOrders = async () => {
    try {
      setLoading(prev => ({ ...prev, list: true }));
      const response = await pharmacyApi.getAllOrders(); // CHANGED
      setOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(prev => ({ ...prev, list: false }));
    }
  };

  useEffect(() => {
    fetchStats();
    fetchOrders();
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
    if (window.confirm('Are you sure you want to delete this supply order?')) {
      try {
        await pharmacyApi.deleteOrder(id); // CHANGED
        showAlert('success', 'Supply order deleted successfully');
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Delete error:', error);
        showAlert('danger', 'Failed to delete supply order');
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      console.log('🔄 Saving supply order with data:', formData);
      
      if (selectedOrder) {
        await pharmacyApi.updateOrder(selectedOrder.SUPPLY_ID, formData); // CHANGED
        showAlert('success', 'Supply order updated successfully');
      } else {
        await pharmacyApi.createOrder(formData); // CHANGED
        showAlert('success', 'Supply order created successfully');
      }
      
      setShowForm(false);
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Save error details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
      
      let errorMessage = 'Failed to save supply order';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          const errors = [];
          for (const [field, messages] of Object.entries(error.response.data)) {
            errors.push(`${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`);
          }
          errorMessage = errors.join('; ');
        } else {
          errorMessage = String(error.response.data);
        }
      }
      
      showAlert('danger', errorMessage);
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
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Stock Supply Orders</h3>
          <p className="text-muted mb-0">
            Manage medicine supply orders from suppliers.
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
            <i className="bi bi-cart-plus me-2"></i>
            New Supply Order
          </Button>
        </div>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show mb-4`} role="alert">
          <i className={`bi ${alert.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
          <strong>{alert.type === 'success' ? 'Success:' : 'Error:'}</strong> {alert.message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setAlert({ show: false, type: '', message: '' })}
          ></button>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-primary bg-opacity-10 border-primary border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Supplies</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-primary bg-opacity-25"></span>
                    ) : (
                      stats.totalOrders.toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-box-seam me-1"></i>
                      {loading.stats ? 'Loading...' : 'All supply orders'}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-primary bg-opacity-25 rounded">
                    <i className="bi bi-box-seam fs-4 text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-info bg-opacity-10 border-info border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Value</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-info bg-opacity-25"></span>
                    ) : (
                      orders.length > 0 ? 
                        `$${orders.reduce((sum, order) => sum + (parseFloat(order.Supply_Cost) || 0), 0).toFixed(2)}` : 
                        '$0.00'
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-currency-dollar me-1"></i>
                      {loading.stats ? 'Loading...' : 'Total supply cost'}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-info bg-opacity-25 rounded">
                    <i className="bi bi-currency-dollar fs-4 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-success bg-opacity-10 border-success border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Total Quantity</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-success bg-opacity-25"></span>
                    ) : (
                      orders.reduce((sum, order) => sum + (order.Qty_Supplied || 0), 0).toLocaleString()
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-calculator me-1"></i>
                      {loading.stats ? 'Loading...' : 'Total units supplied'}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-success bg-opacity-25 rounded">
                    <i className="bi bi-calculator fs-4 text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
          <div className="card bg-warning bg-opacity-10 border-warning border-opacity-25 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-muted mb-1">Average/Order</h6>
                  <h3 className="mb-0">
                    {loading.stats ? (
                      <span className="placeholder col-6 bg-warning bg-opacity-25"></span>
                    ) : (
                      orders.length > 0 ? 
                        `$${(orders.reduce((sum, order) => sum + (parseFloat(order.Supply_Cost) || 0), 0) / orders.length).toFixed(2)}` : 
                        '$0.00'
                    )}
                  </h3>
                  <div className="mt-2">
                    <small className="text-muted">
                      <i className="bi bi-graph-up me-1"></i>
                      {loading.stats ? 'Loading...' : 'Average cost per order'}
                    </small>
                  </div>
                </div>
                <div className="avatar-sm">
                  <div className="avatar-title bg-warning bg-opacity-25 rounded">
                    <i className="bi bi-graph-up fs-4 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 py-2">
              <button 
                className="btn btn-outline-warning btn-sm w-100"
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

      <div className="alert alert-light border mb-4">
        <div className="row align-items-center">
          <div className="col-md-6">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Data Status: 
              <span className={`ms-2 badge ${loading.stats ? 'bg-warning' : 'bg-success'}`}>
                {loading.stats ? 'Loading...' : 'Live'}
              </span>
            </small>
          </div>
          <div className="col-md-6 text-md-end">
            <small className="text-muted">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-box-seam me-2"></i>
              Supply Orders List
            </h5>
            <p className="text-muted mb-0 small">Medicine supply orders from suppliers</p>
          </div>
          <Badge bg="primary">
            <i className="bi bi-filter me-1"></i>
            Showing {orders.length} orders
          </Badge>
        </div>
        <div className="card-body p-0">
          <OrderList 
            onEdit={handleEdit}
            onDelete={handleDelete}
            orders={orders}
            loading={loading}
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
              disabled={loading.list}
            >
              {loading.list ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  Loading...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i> Refresh List
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="bi bi-box-seam me-2"></i>
            {selectedOrder ? 'Edit Supply Order' : 'New Supply Order'}
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