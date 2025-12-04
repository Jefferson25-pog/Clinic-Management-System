import React, { useState, useEffect } from 'react';
import { ListGroup, Badge, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Clock, AlertCircle, User } from 'react-feather';
import doctorApi from '../../services/api';

const TodayAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const response = await doctorApi.getTodayAppointments();
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      normal: 'secondary',
      urgent: 'warning',
      critical: 'danger'
    };
    return variants[priority] || 'secondary';
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <Clock size={48} className="mb-3 opacity-50" />
        <p className="mb-0">No appointments for today</p>
      </div>
    );
  }

  return (
    <ListGroup variant="flush">
      {appointments.map((appointment) => (
        <ListGroup.Item key={appointment.TOKEN_NO} className="border-0 px-0 py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="bg-light rounded-circle p-2 me-3">
                <User size={20} className="text-primary" />
              </div>
              <div>
                <h6 className="mb-1">{appointment.patient_name}</h6>
                <div className="d-flex align-items-center">
                  <small className="text-muted me-3">
                    Token: <strong>#{appointment.TOKEN_NO}</strong>
                  </small>
                  <Badge bg={getPriorityBadge(appointment.Priority)} className="me-2">
                    {appointment.Priority}
                  </Badge>
                  {appointment.Priority === 'critical' && (
                    <AlertCircle size={14} className="text-danger me-1" />
                  )}
                </div>
              </div>
            </div>
            <div>
              <Button
                as={Link}
                to={`/doctor/consultation/${appointment.TOKEN_NO}`}
                variant="primary"
                size="sm"
              >
                Consult
              </Button>
            </div>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default TodayAppointments;