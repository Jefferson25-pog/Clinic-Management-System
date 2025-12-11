import React, { useState, useEffect } from 'react';
import { Table, Badge } from 'react-bootstrap';
import pharmacyApi from '../services/pharmacyApi';

const DispensingList = ({ refreshTrigger }) => {
  const [dispensing, setDispensing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDispensing();
  }, [refreshTrigger]);

  const fetchDispensing = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.getAllDispensing();
      setDispensing(response.data);
    } catch (error) {
      console.error('Error fetching dispensing:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-4">Loading dispensing records...</div>;

  return (
    <div className="table-responsive">
      <Table striped hover>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Medicine</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {dispensing.map((item) => (
            <tr key={item.DISPENSE_ID}>
              <td>{item.patient_name || 'N/A'}</td>
              <td>{item.medicine_name}</td>
              <td>
                <Badge bg="primary">{item.Qty}</Badge>
              </td>
              <td>${item.Price}</td>
              <td>{new Date(item.Dispense_Date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default DispensingList;