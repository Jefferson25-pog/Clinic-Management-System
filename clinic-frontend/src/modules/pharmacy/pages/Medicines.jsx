import React, { useState } from 'react';
import { Button, Modal, Alert, Badge } from 'react-bootstrap';
import MedicineList from '../components/MedicineList';
import MedicineForm from '../components/MedicineForm';
import pharmacyApi from '../services/pharmacyApi';

const Medicines = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const handleAdd = () => {
    setSelectedMedicine(null);
    setShowForm(true);
  };

  const handleEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyApi.deleteMedicine(id); // CHANGED
      setRefreshTrigger(prev => prev + 1);
      showAlert('success', 'Medicine deleted successfully');
    } catch (error) {
      showAlert('danger', 'Failed to delete medicine');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedMedicine) {
        await pharmacyApi.updateMedicine(selectedMedicine.MED_ID, formData); // CHANGED
        showAlert('success', 'Medicine updated successfully');
      } else {
        await pharmacyApi.createMedicine(formData); // ✅ CHANGED THIS LINE
        showAlert('success', 'Medicine added successfully');
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

  return (
    <div>
      {/* Header - EXACT Admin Pattern */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <div className="mb-2 mb-md-0">
          <h3 className="mb-1">Medicines Management</h3>
          <p className="text-muted mb-0">
            Register and manage all pharmaceutical medicines.
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
          <Button variant="primary" onClick={handleAdd}>
            <i className="bi bi-plus-circle me-2"></i>
            Add New Medicine
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

      {/* Medicine List Card - EXACT Admin Pattern */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-capsule-pill me-2"></i>
              Medicine Inventory
            </h5>
            <p className="text-muted mb-0 small">All registered pharmaceutical medicines</p>
          </div>
          <Badge bg="primary">
            <i className="bi bi-filter me-1"></i>
            Filtered
          </Badge>
        </div>
        <div className="card-body p-0">
          <MedicineList 
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className="card-footer bg-transparent border-0">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Click on any medicine to edit details
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

      {/* Medicine Form Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            <i className="bi bi-capsule-pill me-2"></i>
            {selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MedicineForm
            medicine={selectedMedicine}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Medicines;