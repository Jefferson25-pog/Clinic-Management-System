import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const DispensingForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    MED_ID: '',
    Qty: '',
    Price: ''
  });
  const [medicines, setMedicines] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await pharmacyApi.getAllMedicines();
      setMedicines(response.data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validation and save logic here
    if (onSave) onSave(formData);
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">Dispense Medicine</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Medicine *</Form.Label>
            <Form.Select
              name="MED_ID"
              value={formData.MED_ID}
              onChange={handleChange}
              required
            >
              <option value="">Select Medicine</option>
              {medicines.map(med => (
                <option key={med.MED_ID} value={med.MED_ID}>
                  {med.Medicine_Name} ({med.Dosage})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Quantity *</Form.Label>
            <Form.Control
              type="number"
              name="Qty"
              value={formData.Qty}
              onChange={handleChange}
              min="1"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Price per Unit</Form.Label>
            <Form.Control
              type="number"
              name="Price"
              value={formData.Price}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-filled from medicine"
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Dispense
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default DispensingForm;