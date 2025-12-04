import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-top py-3 mt-auto">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-md-6">
            <span className="text-muted">
              © {new Date().getFullYear()} Hospital Management System v1.0
            </span>
          </div>
          <div className="col-md-6 text-end">
            <span className="text-muted">
              Developed with ❤️ for better healthcare
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;