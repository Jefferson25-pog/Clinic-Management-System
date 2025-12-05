// src/pages/Unauthorized.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <div className="card shadow-sm border-danger">
            <div className="card-body py-5">
              <i className="bi bi-shield-lock display-1 text-danger mb-3"></i>
              <h2 className="mb-3">Access Denied</h2>
              <p className="text-muted mb-4">
                You don't have permission to access this page. 
                Please contact your administrator if you believe this is an error.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/" className="btn btn-primary">
                  <i className="bi bi-house-door me-2"></i>
                  Go to Home
                </Link>
                <Link to="/login" className="btn btn-outline-danger">
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Login Again
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;