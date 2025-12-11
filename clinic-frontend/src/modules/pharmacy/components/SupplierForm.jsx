import React, { useState, useEffect } from 'react';
import { Form, Button, Card } from 'react-bootstrap';

const SupplierForm = ({ supplier, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    Supplier_Name: '',
    Phone_Number: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        Supplier_Name: supplier.Supplier_Name || '',
        Phone_Number: supplier.Phone_Number || '',
      });
    }
  }, [supplier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.Supplier_Name.trim()) {
      newErrors.Supplier_Name = 'Supplier name is required';
    } else if (formData.Supplier_Name.trim().length < 2) {
      newErrors.Supplier_Name = 'Supplier name must be at least 2 characters';
    }

    if (!formData.Phone_Number) {
      newErrors.Phone_Number = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.Phone_Number)) {
      newErrors.Phone_Number = 'Phone number must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          {/* Supplier Name */}
          <Form.Group className="mb-3">
            <Form.Label>Supplier Name *</Form.Label>
            <Form.Control
              type="text"
              name="Supplier_Name"
              value={formData.Supplier_Name}
              onChange={handleChange}
              isInvalid={!!errors.Supplier_Name}
              placeholder="e.g., Pharma Distributors Inc."
            />
            <Form.Control.Feedback type="invalid">
              {errors.Supplier_Name}
            </Form.Control.Feedback>
          </Form.Group>

          {/* Phone Number */}
          <Form.Group className="mb-3">
            <Form.Label>Phone Number *</Form.Label>
            <Form.Control
              type="tel"
              name="Phone_Number"
              value={formData.Phone_Number}
              onChange={handleChange}
              isInvalid={!!errors.Phone_Number}
              placeholder="10-digit number (e.g., 9876543210)"
              maxLength="10"
            />
            <Form.Control.Feedback type="invalid">
              {errors.Phone_Number}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              10 digits only, no spaces or symbols
            </Form.Text>
          </Form.Group>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {supplier ? 'Update' : 'Save'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default SupplierForm;