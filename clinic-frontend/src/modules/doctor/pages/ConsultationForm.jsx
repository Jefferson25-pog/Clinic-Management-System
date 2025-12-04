import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { ArrowLeft } from 'react-feather';
import { Link, useParams } from 'react-router-dom';

const ConsultationForm = () => {
  const { appointmentId } = useParams();
  
  return (
    <Container fluid>
      <div className="d-flex align-items-center mb-4">
        <Button as={Link} to="/doctor/appointments" variant="light" className="me-3">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="mb-1">Consultation Form</h2>
          <p className="text-muted mb-0">
            Appointment ID: {appointmentId}
          </p>
        </div>
      </div>
      
      <Card>
        <Card.Body className="text-center py-5">
          <h4 className="text-muted mb-3">Consultation Form</h4>
          <p className="text-muted">
            This is where the consultation form will be displayed.
            <br />
            Patient details, symptoms, diagnosis, prescription, and lab tests will be here.
          </p>
          <Button as={Link} to="/doctor/appointments" variant="primary">
            Back to Appointments
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ConsultationForm;