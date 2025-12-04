// src/main.jsx - COMPLETE FIXED VERSION
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

// Add custom styles
const customStyles = `
  .min-vh-100 {
    min-height: 100vh;
  }
  
  .role-card {
    border-radius: 12px;
  }
  
  .role-card:hover {
    border-color: #0d6efd;
  }
  
  .content-area {
    min-height: 70vh;
  }
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = customStyles;
document.head.appendChild(styleSheet);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);