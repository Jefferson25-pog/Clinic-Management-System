import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Alert, Form, InputGroup } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const StockList = ({ onEdit, refreshTrigger }) => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'low', 'expiring'

  useEffect(() => {
    fetchStock();
  }, [refreshTrigger]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.getAllStock();
      setStock(response.data);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item) => {
    if (item.Total_Stock_Availability === 0) {
      return { variant: 'danger', text: 'Out of Stock' };
    }
    if (item.Total_Stock_Availability < item.Minimum_Stock_Level) {
      return { variant: 'warning', text: 'Low Stock' };
    }
    if (item.days_until_expiry !== null && item.days_until_expiry < 30) {
      return { variant: 'info', text: `Expiring in ${item.days_until_expiry} days` };
    }
    return { variant: 'success', text: 'In Stock' };
  };

  const filteredStock = stock.filter(item => {
    if (filter === 'low') {
      return item.Total_Stock_Availability < item.Minimum_Stock_Level;
    }
    if (filter === 'expiring') {
      return item.days_until_expiry !== null && item.days_until_expiry < 30;
    }
    return true;
  });

  if (loading) return <div className="text-center p-5">Loading stock...</div>;

  return (
    <div>
      {/* Filter Buttons */}
      <div className="mb-3">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline-primary'}
          onClick={() => setFilter('all')}
          className="me-2"
        >
          All Stock
        </Button>
        <Button
          variant={filter === 'low' ? 'warning' : 'outline-warning'}
          onClick={() => setFilter('low')}
          className="me-2"
        >
          Low Stock
        </Button>
        <Button
          variant={filter === 'expiring' ? 'info' : 'outline-info'}
          onClick={() => setFilter('expiring')}
        >
          Expiring Soon
        </Button>
      </div>

      {/* Stock Table */}
      <div className="table-responsive">
        <Table striped hover>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Total Stock</th>
              <th>Min Level</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No stock items found
                </td>
              </tr>
            ) : (
              filteredStock.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.STOCK_ID}>
                    <td>{item.medicine_name}</td>
                    <td>
                      <Badge bg="secondary">{item.MED_ID?.Dosage || 'N/A'}</Badge>
                    </td>
                    <td>
                      <strong>{item.Total_Stock_Availability}</strong>
                    </td>
                    <td>{item.Minimum_Stock_Level}</td>
                    <td>
                      {item.Earliest_Expiry ? (
                        <span className={item.days_until_expiry < 30 ? 'text-warning' : ''}>
                          {new Date(item.Earliest_Expiry).toLocaleDateString()}
                          {item.days_until_expiry !== null && (
                            <small className="d-block text-muted">
                              ({item.days_until_expiry} days)
                            </small>
                          )}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td>
                      <Badge bg={status.variant}>{status.text}</Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => onEdit(item)}
                      >
                        <i className="bi bi-pencil"></i> Edit Min Level
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default StockList;