// src/layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const { role } = useAuth();

  const isAdmin = role === "Super Admin" || role === "Admin";

  return (
    <div className="bg-light border-end vh-100 position-sticky" style={{ minWidth: 240, top: 0 }}>
      <div className="p-3 border-bottom">
        <h6 className="text-uppercase text-muted mb-0">Navigation</h6>
      </div>
      <div className="list-group list-group-flush">
        {isAdmin && (
          <>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              Admin Dashboard
            </NavLink>
            <NavLink
              to="/admin/staff"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              Staff Management
            </NavLink>
            <NavLink
              to="/admin/departments"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              Department Management
            </NavLink>
            <NavLink
              to="/admin/roles"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              Roles Management
            </NavLink>
            <NavLink
              to="/admin/system-logs"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              System Logs
            </NavLink>
            <NavLink
              to="/admin/login-history"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              Login History
            </NavLink>
            <NavLink
              to="/admin/credentials"
              className={({ isActive }) =>
                "list-group-item list-group-item-action border-0" +
                (isActive ? " active" : "")
              }
            >
              Credentials & Passwords
            </NavLink>
          </>
        )}

        {/* Dummy module entry points as required */}
        <NavLink
          to="/doctor"
          className={({ isActive }) =>
            "list-group-item list-group-item-action border-0" +
            (isActive ? " active" : "")
          }
        >
          Doctor Module
        </NavLink>
        <NavLink
          to="/reception"
          className={({ isActive }) =>
            "list-group-item list-group-item-action border-0" +
            (isActive ? " active" : "")
          }
        >
          Reception Module
        </NavLink>
        <NavLink
          to="/pharmacy"
          className={({ isActive }) =>
            "list-group-item list-group-item-action border-0" +
            (isActive ? " active" : "")
          }
        >
          Pharmacy Module
        </NavLink>
        <NavLink
          to="/lab"
          className={({ isActive }) =>
            "list-group-item list-group-item-action border-0" +
            (isActive ? " active" : "")
          }
        >
          LabTech Module
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;