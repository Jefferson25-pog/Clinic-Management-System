import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const MedicineList = ({ onEdit, onDelete, refreshTrigger }) => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, [refreshTrigger]);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.getAllMedicines();
      setMedicines(response.data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="table-responsive">
      <Table hover className="mb-0">
        <thead className="bg-light">
          <tr>
            <th>ID</th>
            <th>Medicine Name</th>
            <th>Category</th>
            <th>Dosage</th>
            <th>Unit Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </td>
            </tr>
          ) : medicines.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-4 text-muted">
                <i className="bi bi-capsule display-6"></i>
                <p className="mt-2">No medicines found</p>
              </td>
            </tr>
          ) : (
            medicines.map((medicine) => (
              <tr key={medicine.MED_ID}>
                <td>
                  <div className="d-flex align-items-center">
                    <div className="avatar-sm bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3">
                      <span className="fw-semibold">MED-{medicine.MED_ID}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <h6 className="mb-0">{medicine.Medicine_Name}</h6>
                  <small className="text-muted">{medicine.Generic_Name}</small>
                </td>
                <td>{medicine.Category}</td>
                <td>
                  <Badge bg="info">{medicine.Dosage}</Badge>
                </td>
                <td>${medicine.Unit_Price}</td>
                <td>
                  <Badge bg={medicine.Status === 'Active' ? 'success' : 'danger'}>
                    {medicine.Status}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => onEdit(medicine)}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => onDelete(medicine.MED_ID)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default MedicineList;