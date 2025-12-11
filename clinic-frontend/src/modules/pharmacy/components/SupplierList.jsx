import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, InputGroup, Alert } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const SupplierList = ({ onEdit, onDelete, refreshTrigger }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [refreshTrigger]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.getAllSuppliers();
      setSuppliers(response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await pharmacyApi.deleteSupplier(id);
        setSuppliers(suppliers.filter(sup => sup.SUPPLIER_ID !== id));
        alert('Supplier deleted successfully');
      } catch (error) {
        alert('Failed to delete supplier. It might be referenced in orders.');
      }
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.Supplier_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.Phone_Number.includes(searchTerm)
  );

  if (loading) return <div className="text-center p-5">Loading suppliers...</div>;

  return (
    <div>
      {/* Search Bar */}
      <Form className="mb-4">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Search suppliers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button 
            variant="outline-secondary" 
            onClick={() => setSearchTerm('')}
          >
            Clear
          </Button>
        </InputGroup>
      </Form>

      {/* Suppliers Table */}
      <div className="table-responsive">
        <Table striped hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier Name</th>
              <th>Phone Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-muted py-4">
                  No suppliers found
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.SUPPLIER_ID}>
                  <td>SUP-{supplier.SUPPLIER_ID}</td>
                  <td>{supplier.Supplier_Name}</td>
                  <td>
                    <Badge bg="info">{supplier.Phone_Number}</Badge>
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => onEdit(supplier)}
                      className="me-2"
                    >
                      <i className="bi bi-pencil"></i> Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(supplier.SUPPLIER_ID)}
                    >
                      <i className="bi bi-trash"></i> Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default SupplierList;