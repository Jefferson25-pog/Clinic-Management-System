import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  FileText,
  Activity,
  Clock,
  AlertCircle,
  TrendingUp
} from 'react-feather';
import AvailabilityToggle from '../components/common/AvailabilityToggle';

const DoctorDashboard = () => {
  return (
    <div className="doctor-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Doctor Dashboard</h2>
          <p className="text-muted mb-0">
            Welcome back, Dr. Smith • Cardiology Department
          </p>
        </div>
        <AvailabilityToggle currentStatus="Available" />
      </div>

      {/* Quick Stats */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <Card className="border-start border-primary border-3">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                  <Calendar className="text-primary" size={20} />
                </div>
                <div>
                  <h4 className="mb-0">12</h4>
                  <small className="text-muted">Today's Appointments</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="border-start border-warning border-3">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-2 rounded me-3">
                  <FileText className="text-warning" size={20} />
                </div>
                <div>
                  <h4 className="mb-0">8</h4>
                  <small className="text-muted">Pending Consultations</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="border-start border-success border-3">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                  <Activity className="text-success" size={20} />
                </div>
                <div>
                  <h4 className="mb-0">3</h4>
                  <small className="text-muted">Lab Results Pending</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6}>
          <Card className="border-start border-info border-3">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-2 rounded me-3">
                  <Users className="text-info" size={20} />
                </div>
                <div>
                  <h4 className="mb-0">24</h4>
                  <small className="text-muted">Weekly Patients</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card className="mb-4">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Quick Actions</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={3} sm={6}>
              <Button 
                as={Link} 
                to="/doctor/appointments"
                variant="outline-primary" 
                className="w-100 d-flex flex-column align-items-center py-3"
              >
                <Calendar size={24} className="mb-2" />
                View Appointments
              </Button>
            </Col>
            <Col md={3} sm={6}>
              <Button 
                as={Link} 
                to="/doctor/consultation-history"
                variant="outline-success" 
                className="w-100 d-flex flex-column align-items-center py-3"
              >
                <FileText size={24} className="mb-2" />
                Consultation History
              </Button>
            </Col>
            <Col md={3} sm={6}>
              <Button 
                as={Link} 
                to="/doctor/lab-requests"
                variant="outline-warning" 
                className="w-100 d-flex flex-column align-items-center py-3"
              >
                <Activity size={24} className="mb-2" />
                Lab Requests
              </Button>
            </Col>
            <Col md={3} sm={6}>
              <Button 
                as={Link} 
                to="/doctor/lab-results"
                variant="outline-info" 
                className="w-100 d-flex flex-column align-items-center py-3"
              >
                <Clipboard size={24} className="mb-2" />
                Lab Results
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Today's Schedule */}
      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <Clock size={20} className="me-2" />
                Today's Appointments
              </h5>
              <Link to="/doctor/appointments" className="text-primary">
                View All
              </Link>
            </Card.Header>
            <Card.Body>
              {/* Appointment list will go here */}
              <div className="text-center py-4 text-muted">
                <Calendar size={32} className="mb-2 opacity-50" />
                <p>No appointments for today</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card>
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <AlertCircle size={20} className="me-2" />
                Urgent Tasks
              </h5>
            </Card.Header>
            <Card.Body>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <div className="d-flex align-items-center">
                    <div className="bg-danger rounded-circle p-1 me-2">
                      <div className="bg-white rounded-circle" style={{ width: '6px', height: '6px' }}></div>
                    </div>
                    <span>Review lab results (2 pending)</span>
                  </div>
                </li>
                <li className="mb-2">
                  <div className="d-flex align-items-center">
                    <div className="bg-warning rounded-circle p-1 me-2">
                      <div className="bg-white rounded-circle" style={{ width: '6px', height: '6px' }}></div>
                    </div>
                    <span>Complete consultation notes</span>
                  </div>
                </li>
                <li>
                  <div className="d-flex align-items-center">
                    <div className="bg-primary rounded-circle p-1 me-2">
                      <div className="bg-white rounded-circle" style={{ width: '6px', height: '6px' }}></div>
                    </div>
                    <span>Update patient records</span>
                  </div>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DoctorDashboard;