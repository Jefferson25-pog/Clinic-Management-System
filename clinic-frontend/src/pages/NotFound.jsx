// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          <div className="card shadow-sm border-0">
            <div className="card-body py-5">
              <h1 className="display-1 text-muted">404</h1>
              <h2 className="mb-4">Page Not Found</h2>
              <p className="text-muted mb-4">
                The page you are looking for might have been removed, had its name changed, 
                or is temporarily unavailable.
              </p>
              <div className="d-flex justify-content-center gap-3">
                <Link to="/" className="btn btn-primary">
                  <i className="bi bi-house-door me-2"></i>
                  Go to Home
                </Link>
                <button 
                  onClick={() => window.history.back()} 
                  className="btn btn-outline-secondary"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;