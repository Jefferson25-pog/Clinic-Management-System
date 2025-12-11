import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';

const MedicineForm = ({ medicine, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    Medicine_Name: '',
    Dosage: '',
    Price_per_Unit: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (medicine) {
      setFormData({
        Medicine_Name: medicine.Medicine_Name || '',
        Dosage: medicine.Dosage || '',
        Price_per_Unit: medicine.Price_per_Unit || '',
      });
    }
  }, [medicine]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Medicine Name validation
    if (!formData.Medicine_Name.trim()) {
      newErrors.Medicine_Name = 'Medicine name is required';
    } else if (formData.Medicine_Name.trim().length < 2) {
      newErrors.Medicine_Name = 'Medicine name must be at least 2 characters';
    }

    // Dosage validation
    if (!formData.Dosage.trim()) {
      newErrors.Dosage = 'Dosage is required';
    } else if (!/\d/.test(formData.Dosage)) {
      newErrors.Dosage = 'Dosage must contain numeric values (e.g., 500 mg)';
    }

    // Price validation
    if (!formData.Price_per_Unit) {
      newErrors.Price_per_Unit = 'Price is required';
    } else if (parseFloat(formData.Price_per_Unit) <= 0) {
      newErrors.Price_per_Unit = 'Price must be greater than 0';
    } else if (parseFloat(formData.Price_per_Unit) > 10000) {
      newErrors.Price_per_Unit = 'Price cannot exceed 10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSend = {
        ...formData,
        Price_per_Unit: parseFloat(formData.Price_per_Unit),
      };
      await onSave(dataToSend);
    } catch (error) {
      console.error('Save error:', error);
      // Handle backend validation errors
      if (error.response?.data) {
        const backendErrors = error.response.data;
        setErrors(prev => ({ ...prev, ...backendErrors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">{medicine ? 'Edit Medicine' : 'Add New Medicine'}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {/* Medicine Name */}
          <Form.Group className="mb-3">
            <Form.Label>Medicine Name *</Form.Label>
            <Form.Control
              type="text"
              name="Medicine_Name"
              value={formData.Medicine_Name}
              onChange={handleChange}
              isInvalid={!!errors.Medicine_Name}
              placeholder="e.g., Paracetamol, Amoxicillin"
            />
            <Form.Control.Feedback type="invalid">
              {errors.Medicine_Name}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Letters, numbers, spaces, hyphens and parentheses only
            </Form.Text>
          </Form.Group>

          {/* Dosage */}
          <Form.Group className="mb-3">
            <Form.Label>Dosage *</Form.Label>
            <Form.Control
              type="text"
              name="Dosage"
              value={formData.Dosage}
              onChange={handleChange}
              isInvalid={!!errors.Dosage}
              placeholder="e.g., 500 mg, 10 ml"
            />
            <Form.Control.Feedback type="invalid">
              {errors.Dosage}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Format: number followed by unit (e.g., "500 mg", "10 ml")
            </Form.Text>
          </Form.Group>

          {/* Price per Unit */}
          <Form.Group className="mb-3">
            <Form.Label>Price per Unit ($) *</Form.Label>
            <Form.Control
              type="number"
              name="Price_per_Unit"
              value={formData.Price_per_Unit}
              onChange={handleChange}
              isInvalid={!!errors.Price_per_Unit}
              placeholder="e.g., 2.50"
              step="0.01"
              min="0.01"
              max="10000"
            />
            <Form.Control.Feedback type="invalid">
              {errors.Price_per_Unit}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Price must be between 0.01 and 10,000
            </Form.Text>
          </Form.Group>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (medicine ? 'Update' : 'Save')}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default MedicineForm;