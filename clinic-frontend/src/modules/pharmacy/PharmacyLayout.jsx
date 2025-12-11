import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';

const PharmacyLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Simple header with logout */}
      <div className="bg-white border-bottom shadow-sm py-3">
        <Container fluid className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="bi bi-capsule-pill me-2 text-primary"></i>
              <span className="fw-bold">Pharmacy Module</span>
            </h5>
            <small className="text-muted">Clinical Management System</small>
          </div>
          <Button 
            variant="outline-primary"
            onClick={handleLogout}
            size="sm"
          >
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
          </Button>
        </Container>
      </div>

      {/* Page Content */}
      <Container fluid className="py-4">
        <Outlet />
      </Container>
    </div>
  );
};

export default PharmacyLayout;