// src/modules/admin/pages/LoginHistory.jsx
import React, { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi.js";

const LoginHistory = () => {
  const [entries, setEntries] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {}; // add filters later (username, success, type)
      const res = await adminApi.getLoginHistory(params);
      let data = res.data.results || res.data || [];
      if (sortOrder === "asc") data = [...data].reverse();
      setEntries(data);
    } catch (err) {
      console.warn("Login history endpoint not implemented yet", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Login History</h4>
          <p className="text-muted mb-0">
            View all login attempts for auditing and security.
          </p>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-2">
          <label className="form-label">Sort by time</label>
          <select
            className="form-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Time</th>
                  <th>Username</th>
                  <th>Login Type</th>
                  <th>Role</th>
                  <th>IP</th>
                  <th>Success</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No login history available or endpoint not implemented.
                    </td>
                  </tr>
                ) : (
                  entries.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.timestamp).toLocaleString()}</td>
                      <td>{h.username}</td>
                      <td>{h.login_type}</td>
                      <td>{h.user_role || "-"}</td>
                      <td>{h.ip_address || "-"}</td>
                      <td>
                        <span
                          className={
                            "badge " +
                            (h.success ? "bg-success" : "bg-danger")
                          }
                        >
                          {h.success ? "Success" : "Failed"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginHistory;
