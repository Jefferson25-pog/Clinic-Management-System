// src/layout/Navbar.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, role, logout } = useAuth();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark border-bottom">
      <div className="container-fluid">
        <span className="navbar-brand fw-bold">Clinic Management System</span>
        <div className="d-flex align-items-center gap-3">
          {user && (
            <>
              <span className="text-light small text-end">
                <div>{user.username}</div>
                <div className="text-secondary">{role}</div>
              </span>
              <button className="btn btn-outline-light btn-sm" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;