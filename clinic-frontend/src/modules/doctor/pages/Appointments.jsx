import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Badge,
  Form,
  InputGroup,
  Table,
  Dropdown
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  AlertCircle,
  MoreVertical,
  ChevronRight
} from 'react-feather';

const Appointments = () => {
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      tokenNo: 'TK-101',
      patientId: 'PAT-001',
      patientName: 'John Smith',
      age: 45,
      gender: 'Male',
      priority: 'urgent',
      time: '10:30 AM',
      date: '2024-01-15',
      status: 'pending'
    },
    {
      id: 2,
      tokenNo: 'TK-102',
      patientId: 'PAT-002',
      patientName: 'Sarah Johnson',
      age: 32,
      gender: 'Female',
      priority: 'normal',
      time: '11:15 AM',
      date: '2024-01-15',
      status: 'pending'
    },
    {
      id: 3,
      tokenNo: 'TK-103',
      patientId: 'PAT-003',
      patientName: 'Michael Brown',
      age: 58,
      gender: 'Male',
      priority: 'critical',
      time: '12:00 PM',
      date: '2024-01-15',
      status: 'pending'
    }
  ]);
  const [filter, setFilter] = useState('all');

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <Badge bg="danger">Critical</Badge>;
      case 'urgent':
        return <Badge bg="warning">Urgent</Badge>;
      case 'normal':
        return <Badge bg="secondary">Normal</Badge>;
      default:
        return <Badge bg="secondary">Normal</Badge>;
    }
  };

  const filteredAppointments = filter === 'all' 
    ? appointments 
    : appointments.filter(apt => apt.priority === filter);

  return (
    <div className="appointments-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Appointments</h2>
          <p className="text-muted mb-0">
            Manage and view all patient appointments
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary">
            <Calendar size={18} className="me-2" />
            Calendar View
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <Search size={18} />
                </InputGroup.Text>
                <Form.Control placeholder="Search by patient name, token no, or ID" />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select>
                <option>All Departments</option>
                <option>Cardiology</option>
                <option>Neurology</option>
                <option>Orthopedics</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                  <Filter size={18} className="me-2" />
                  Filter by Priority
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setFilter('all')}>
                    All Priorities
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setFilter('critical')}>
                    <Badge bg="danger" className="me-2">Critical</Badge>
                    Critical
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setFilter('urgent')}>
                    <Badge bg="warning" className="me-2">Urgent</Badge>
                    Urgent
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setFilter('normal')}>
                    <Badge bg="secondary" className="me-2">Normal</Badge>
                    Normal
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Appointments Table */}
      <Card>
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Pending Appointments</h5>
            <small className="text-muted">
              {filteredAppointments.length} appointments found
            </small>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm">
              Export
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <Table hover responsive className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="border-0">Token No</th>
                <th className="border-0">Patient</th>
                <th className="border-0">Details</th>
                <th className="border-0">Priority</th>
                <th className="border-0">Time</th>
                <th className="border-0" style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>
                    <strong className="text-primary">#{appointment.tokenNo}</strong>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <div className="fw-bold">{appointment.patientName}</div>
                        <small className="text-muted">
                          ID: {appointment.patientId}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{appointment.age} years, {appointment.gender}</div>
                      <small className="text-muted">
                        <Calendar size={12} className="me-1" />
                        {appointment.date}
                      </small>
                    </div>
                  </td>
                  <td>
                    {getPriorityBadge(appointment.priority)}
                    {appointment.priority === 'critical' && (
                      <AlertCircle size={14} className="text-danger ms-1" />
                    )}
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Clock size={16} className="me-2 text-muted" />
                      {appointment.time}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        as={Link}
                        to={`/doctor/consultation/${appointment.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Consult
                      </Button>
                      <Dropdown>
                        <Dropdown.Toggle variant="light" size="sm" className="border-0">
                          <MoreVertical size={16} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item as={Link} to={`/patient/${appointment.patientId}`}>
                            View Patient
                          </Dropdown.Item>
                          <Dropdown.Item>Reschedule</Dropdown.Item>
                          <Dropdown.Item className="text-danger">Cancel</Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-5">
              <Calendar size={48} className="text-muted mb-3 opacity-50" />
              <h5>No appointments found</h5>
              <p className="text-muted">
                {filter !== 'all' 
                  ? `No ${filter} priority appointments`
                  : 'No appointments scheduled'
                }
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Stats Summary */}
      <Row className="mt-4 g-3">
        <Col md={3}>
          <Card className="border-start border-primary border-3">
            <Card.Body className="py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">{appointments.length}</h4>
                  <small className="text-muted">Total Appointments</small>
                </div>
                <Calendar className="text-primary" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-start border-warning border-3">
            <Card.Body className="py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">
                    {appointments.filter(a => a.priority === 'urgent').length}
                  </h4>
                  <small className="text-muted">Urgent</small>
                </div>
                <AlertCircle className="text-warning" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-start border-danger border-3">
            <Card.Body className="py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">
                    {appointments.filter(a => a.priority === 'critical').length}
                  </h4>
                  <small className="text-muted">Critical</small>
                </div>
                <AlertCircle className="text-danger" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-start border-success border-3">
            <Card.Body className="py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">0</h4>
                  <small className="text-muted">Completed Today</small>
                </div>
                <Clock className="text-success" size={24} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Appointments;